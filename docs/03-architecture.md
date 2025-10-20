# 03 — 架构设计

> 本文定义 Code3 系统的整体架构、模块划分和技术选型
> 参考：[TRUTH.md](../../TRUTH.md) ADR-012

---

## 1. 系统架构总览

### 1.1 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                      Code3 System                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Frontend (Dashboard)                    │  │
│  │  - Next.js 14+ (App Router)                          │  │
│  │  - Wallet Connection (Aptos/Ethereum)                │  │
│  │  - Bounty List / Details                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↕ HTTP/WebSocket                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Backend (Webhook)                       │  │
│  │  - Node.js + Express                                 │  │
│  │  - GitHub Webhook Handler                            │  │
│  │  - Event Indexer                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↕                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            task3/ (Core Infrastructure)              │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  orchestration/  (5 个 flow)                   │ │  │
│  │  │  - publishFlow, acceptFlow, submitFlow...      │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │           ↓ 调用                    ↓ 调用            │  │
│  │  ┌─────────────────┐      ┌──────────────────────┐ │  │
│  │  │ bounty-operator │      │   data-operator      │ │  │
│  │  │  - aptos/       │      │   (adapter 实现)      │ │  │
│  │  │  - ethereum/    │      │                      │ │  │
│  │  └─────────────────┘      └──────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↕                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Workflow Adapters (MCP Tools)              │  │
│  │  - spec-kit-mcp-adapter                              │  │
│  │  - observer-mcp-adapter                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↕                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Workflows (不需修改)                       │  │
│  │  - spec-kit-mcp (7 个工具)                           │  │
│  │  - observer-mcp (3 个工具)                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           ↕                              ↕
    ┌─────────────┐              ┌─────────────────┐
    │   Blockchain │              │   Data Layer    │
    │   - Aptos    │              │   - GitHub      │
    │   - Ethereum │              │   - IPFS        │
    └─────────────┘              └─────────────────┘
```

---

### 1.2 模块职责

| 模块 | 职责 | 技术栈 | 位置 |
|------|------|--------|------|
| **Frontend** | 用户界面、钱包连接 | Next.js 14, React | `task3/frontend/` |
| **Backend** | Webhook、事件索引 | Node.js, Express | `task3/backend/` |
| **task3/** | 核心业务逻辑 | TypeScript | `task3/` |
| **Workflows** | 任务执行工具 | TypeScript, MCP | `workflows/` |
| **Adapters** | 工作流适配 | TypeScript | `task3/adapters/` |
| **Blockchain** | 智能合约 | Move/Solidity | `task3/bounty-operator/*/contract/` |

---

## 2. 三层架构详解

### 2.1 Orchestration Layer（编排层）

**位置**: `task3/orchestration/`

**职责**:
- 完整流程编排（5 个 flow）
- 状态验证
- 业务逻辑协调

**特点**:
- 与 workflow 和数据层无关
- 通过依赖注入接收 dataOperator 和 bountyOperator
- 抽象类实现，无需子类化

**详细定义**: 见 [02-interfaces.md Section 4](./02-interfaces.md#4-task3operator-抽象类)

---

### 2.2 BountyOperator Layer（链上操作层）

**位置**: `task3/bounty-operator/`

**职责**:
- 链上操作（创建、接受、提交、确认、领取）
- 链上查询（按 ID、按 taskHash、按 sponsor/worker）
- 状态管理

**实现**:
- `aptos/` - Aptos Move 合约 + TypeScript SDK
- `ethereum/` - Solidity 合约 + ethers.js
- `sui/` - Sui Move 合约（未来）

**详细定义**: 见 [02-interfaces.md Section 2](./02-interfaces.md#2-bountyoperator-接口)

---

### 2.3 DataOperator Layer（数据操作层）

**位置**: adapter 中实现

**职责**:
- 上传/下载任务数据
- 上传提交内容
- 获取/更新任务元数据

**实现**:
- `spec-kit-mcp-adapter` - GitHub Issue/PR + 本地 specs/
- `observer-mcp-adapter` - IPFS + GitHub Issue

**详细定义**: 见 [02-interfaces.md Section 3](./02-interfaces.md#3-dataoperator-接口)

---

## 3. 技术选型

### 3.1 核心技术栈

| 组件 | 技术 | 版本 | 理由 |
|------|------|------|------|
| **语言** | TypeScript | 5.0+ | 类型安全、生态成熟 |
| **模块系统** | ESM | - | 现代标准、Tree-shaking |
| **包管理** | npm workspaces | - | Monorepo 支持 |
| **前端框架** | Next.js | 14+ | SSR、App Router、性能优异 |
| **后端框架** | Express | 4.x | 轻量、生态成熟 |
| **MCP** | @modelcontextprotocol/sdk | 1.0+ | 官方 SDK |

---

### 3.2 区块链技术

| 链 | 语言 | SDK | 合约位置 |
|------|------|-----|---------|
| **Aptos** | Move | @aptos-labs/ts-sdk | `bounty-operator/aptos/contract/` |
| **Ethereum** | Solidity | ethers.js v6 | `bounty-operator/ethereum/contract/` |

---

### 3.3 数据层技术

| 数据层 | 用途 | SDK |
|--------|------|-----|
| **GitHub** | Issue/PR 存储 | @octokit/rest |
| **IPFS** | 去中心化存储 | ipfs-http-client |
| **Arweave** | 永久存储（未来） | arweave |

---

## 4. 模块间通信

### 4.1 依赖注入模式

**核心原则**: 上层依赖接口，不依赖具体实现

```typescript
// adapter 创建实例
const dataOperator = new SpecKitDataOperator({ ... });
const bountyOperator = new AptosBountyOperator({ ... });

// 注入到 orchestration
const result = await publishFlow({
  dataOperator,
  bountyOperator,
  taskData,
  metadata,
  amount,
  asset
});
```

**优势**:
- 易于测试（Mock 接口）
- 易于扩展（新增实现不影响调用方）
- 类型安全（编译时检查）

---

### 4.2 事件驱动（Backend）

**事件源**:
- GitHub Webhook（PR merged）
- 区块链事件（BountyCreated, BountyClaimed）

**事件处理**:
```typescript
// GitHub Webhook
app.post('/webhook/github', async (req, res) => {
  const event = req.body;

  if (event.action === 'closed' && event.pull_request.merged) {
    // 触发 confirmFlow
    await handlePRMerged(event);
  }
});

// 区块链事件监听
contract.on('BountyCreated', (bountyId, taskId) => {
  // 更新数据库
  await db.bounties.insert({ bountyId, taskId });
});
```

---

## 5. 数据存储

### 5.1 链上数据

**存储内容**:
- Bounty 实体（见 [01-data-model.md Section 2.1](./01-data-model.md#21-bounty-实体)）
- 状态转换历史
- 资金托管

**存储位置**:
- Aptos: 资源账户（Resource Account）
- Ethereum: 合约 Storage

---

### 5.2 链下数据

**存储内容**:
- TaskMetadata（见 [01-data-model.md Section 3.1](./01-data-model.md#31-taskmetadata-结构)）
- 任务数据（spec.md, 代码等）
- 提交内容

**存储位置**:
- GitHub Issue body（YAML frontmatter）
- IPFS（CID）
- 本地文件系统（specs/, .agent-context/）

---

### 5.3 索引数据（Backend）

**存储内容**:
- Bounty 索引（快速查询）
- 事件日志
- 统计数据

**技术选型**:
- PostgreSQL（关系型数据）
- Redis（缓存）

---

## 6. 安全架构

### 6.1 密钥管理

**原则**: 永不泄露私钥

**实现**:
- 使用环境变量（`.env`）
- 生产环境使用系统钥匙串（Keychain/Vault）
- 前端使用钱包签名（不持有私钥）

---

### 6.2 访问控制

**合约层**:
- 只有 requester 能调用 `acceptBounty`, `confirmBounty`
- 只有 worker 能调用 `submitBounty`, `claimPayout`
- 只有 sponsor 能调用 `cancelBounty`（仅 Open 状态）

**Backend 层**:
- GitHub Token 权限最小化
- Webhook 签名验证
- Rate Limiting

---

### 6.3 冷静期机制

**目的**: 防止 requester 确认后立即撤回

**实现**: 见 [01-data-model.md Section 7](./01-data-model.md#7-冷静期机制)

---

## 7. 可扩展性设计

### 7.1 新增链

**步骤**:
1. 在 `task3/bounty-operator/` 下创建新目录（如 `sui/`）
2. 实现 `BountyOperator` 接口
3. 编写合约并部署
4. adapter 中切换 bountyOperator 实例

**无需修改**:
- orchestration 层
- dataOperator 层
- workflow 层

---

### 7.2 新增数据层

**步骤**:
1. 在 `task3/data-layers/` 下创建新目录（如 `ipfs/`）
2. 实现 `createTask`, `getTask` 等方法
3. adapter 中使用新的 data layer

**无需修改**:
- orchestration 层
- bountyOperator 层

---

### 7.3 新增 Workflow

**步骤**:
1. 在 `workflows/` 下创建新 workflow（如 `code-review-mcp/`）
2. 在 `task3/adapters/` 下创建新 adapter（如 `code-review-adapter/`）
3. adapter 实现 `DataOperator` 接口
4. 暴露 MCP 工具

**无需修改**:
- orchestration 层
- bountyOperator 层
- 其他 workflow/adapter

---

## 8. 部署架构

### 8.1 开发环境

```
Developer Machine
├── Claude Code (MCP Client)
├── spec-kit-mcp (workflow)
├── spec-kit-mcp-adapter (adapter)
└── Local GitHub (test repo)
```

---

### 8.2 测试环境

```
Testnet
├── Aptos Testnet
├── Ethereum Sepolia
├── GitHub (test organization)
└── IPFS Testnet
```

---

### 8.3 生产环境

```
Production
├── Frontend (Vercel/Netlify)
├── Backend (Railway/Fly.io)
├── Aptos Mainnet
├── Ethereum Mainnet
├── GitHub (production repos)
└── IPFS Mainnet (Pinata/Infura)
```

---

## 9. 性能考虑

### 9.1 查询优化

**问题**: 链上查询慢（按 sponsor/worker 查询需遍历）

**解决方案**:
- Backend 建立索引（PostgreSQL）
- 监听链上事件，实时更新索引
- Frontend 先查索引，再查链上详情

---

### 9.2 Gas 优化

**Aptos**:
- 使用 Resource Account 减少存储成本
- 批量操作（未来）

**Ethereum**:
- 使用 EIP-1559 动态调整 Gas
- 避免频繁存储写入
- 使用事件而非存储（查询历史时）

---

### 9.3 前端性能

- Next.js SSR（首屏快速渲染）
- React Server Components（减少 JS 体积）
- 增量静态生成（ISR）

---

## 10. 监控与日志

### 10.1 Backend 日志

**记录内容**:
- API 请求（请求/响应）
- Webhook 事件
- 链上交易（txHash, status）
- 错误堆栈

**工具**: Winston, Pino

---

### 10.2 链上监控

**监控指标**:
- Bounty 创建数量
- 成功领取率
- 平均冷静期
- Gas 消耗

**工具**: 自建 indexer + Grafana

---

### 10.3 前端监控

**监控指标**:
- 页面加载时间
- 钱包连接成功率
- 交易失败率

**工具**: Vercel Analytics, Sentry

---

## 11. 参考

- **数据模型**: [01-data-model.md](./01-data-model.md)
- **接口定义**: [02-interfaces.md](./02-interfaces.md)
- **包结构**: [05-packages-structure.md](./05-packages-structure.md)
- **ADR-012**: [TRUTH.md](../../TRUTH.md) ADR-012

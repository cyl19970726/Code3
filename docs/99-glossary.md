# 99 — 术语表

> 本文定义 Code3 系统中使用的所有术语和概念
> 参考：[TRUTH.md](../../TRUTH.md) ADR-012

---

## A

### Adapter（适配器）
**定义**：连接 workflow（MCP 工具）与 task3 基础设施的中间层。

**职责**：
- 实现 `DataOperator` 接口
- 封装特定 workflow 的数据操作逻辑
- 暴露 MCP 工具供 Claude Code 调用

**示例**：
- `spec-kit-adapter` - spec-kit-mcp 适配器
- `observer-adapter` - observer-mcp 适配器

**参考**：[02-interfaces.md Section 3](./02-interfaces.md#3-dataoperator-接口)

---

### ADR (Architecture Decision Record)
**定义**：架构决策记录，记录重大架构变更的决策、理由和影响。

**位置**：`TRUTH.md`

**格式**：
```markdown
## ADR-012: 多链多工作流 Bounty 系统

### 决策
...

### 理由
...

### 影响
...
```

**参考**：[TRUTH.md](../../TRUTH.md)

---

### Aptos
**定义**：基于 Move 语言的区块链，Code3 支持的第一条链。

**特点**：
- 高性能（100,000+ TPS）
- 低 Gas 费用
- 资源模型（Resource Account）

**合约位置**：`Code3/task3/bounty-operator/aptos/contract/`

**参考**：[03-architecture.md Section 3.2](./03-architecture.md#32-区块链技术)

---

## B

### Backend
**定义**：Code3 的后端服务，处理 GitHub Webhook 和区块链事件监听。

**职责**：
- 监听 GitHub PR merge 事件
- 监听链上 Bounty 事件
- 建立 Bounty 索引（PostgreSQL）
- 提供 REST API

**位置**：`Code3/task3/backend/`

**参考**：[05-packages-structure.md Section 3.7](./05-packages-structure.md#37-backend--webhook-服务)

---

### Bounty
**定义**：链上 Bounty 实体，记录任务、赏金、状态、参与者等信息。

**核心字段**：
- `bountyId` - Bounty 唯一标识
- `taskId` - 任务标识（如 GitHub Issue URL）
- `taskHash` - 任务内容哈希（用于幂等性）
- `user` - 发布者地址（requester）
- `worker` - 接单者地址
- `amount` - 赏金金额
- `asset` - 资产类型（APT, USDT, ETH）
- `status` - 当前状态

**参考**：[01-data-model.md Section 2.1](./01-data-model.md#21-bounty-实体)

---

### BountyOperator
**定义**：链上操作的统一接口，定义 11 个方法。

**6 个写入操作**：
- `createBounty` - 创建 Bounty
- `acceptBounty` - 接受 Bounty
- `submitBounty` - 提交工作成果
- `confirmBounty` - 确认工作成果
- `claimPayout` - 领取赏金
- `cancelBounty` - 取消 Bounty

**5 个查询操作**：
- `getBounty` - 按 ID 查询
- `getBountyByTaskHash` - 按 taskHash 查询（幂等性）
- `listBounties` - 列出所有 Bounty
- `getBountiesByUser` - 按发布者查询
- `getBountiesByWorker` - 按接单者查询

**实现**：
- `AptosBountyOperator` - Aptos 实现
- `EthereumBountyOperator` - Ethereum 实现

**参考**：[02-interfaces.md Section 2](./02-interfaces.md#2-bountyoperator-接口)

---

### BountyStatus
**定义**：Bounty 的 6 种状态枚举。

**状态流转**：
```
Open → Accepted → Submitted → Confirmed → Claimed
  ↓
Cancelled
```

**状态说明**：
- `Open` - 已发布，等待接单
- `Accepted` - 已接单，worker 工作中
- `Submitted` - worker 已提交工作成果
- `Confirmed` - requester 已确认，进入冷静期
- `Claimed` - worker 已领取赏金
- `Cancelled` - user 已取消

**参考**：[01-data-model.md Section 2.2](./01-data-model.md#22-bountystatus-状态枚举)

---

## C

### Claim（领取）
**定义**：Worker 在冷静期结束后领取赏金的操作。

**前置条件**：
- Bounty 状态为 `Confirmed`
- 冷静期已结束（`Date.now() >= coolingUntil`）
- 调用者是 Worker

**调用**：`claimFlow()` → `claimPayout()`

**参考**：[04-datastream.md Section 2.5](./04-datastream.md#25-phase-5-claim-领取赏金)

---

### Confirm（确认）
**定义**：Requester 确认 Worker 提交的工作成果，开始冷静期。

**前置条件**：
- Bounty 状态为 `Submitted`
- 调用者是 User（requester）

**结果**：
- 状态更新为 `Confirmed`
- 冷静期开始（7 天）
- 记录 `confirmedAt` 和 `coolingUntil`

**调用**：`confirmFlow()` → `confirmBounty()`

**参考**：[04-datastream.md Section 2.4](./04-datastream.md#24-phase-4-confirm-确认工作)

---

### Cooling Period（冷静期）
**定义**：Requester 确认后，Worker 必须等待的时间（7 天），防止 Requester 反悔。

**触发时机**：`confirmBounty()` 调用时

**计算方式**：`coolingUntil = confirmedAt + 7 天`

**作用**：
- 给 Requester 反悔的时间
- 防止 Worker 立即领取后项目出问题
- 增加系统安全性

**参考**：[01-data-model.md Section 7](./01-data-model.md#7-冷静期机制)

---

## D

### Dashboard
**定义**：Code3 的前端用户界面，基于 Next.js 14 构建。

**核心页面**：
- `/` - Bounty 列表页
- `/bounty/[id]` - Bounty 详情页
- `/publish` - 发布 Bounty 页
- `/dashboard` - 用户仪表板

**技术栈**：
- Next.js 14+ (App Router)
- React Server Components
- TailwindCSS
- 钱包连接（Petra, MetaMask）

**参考**：[07-ui-ux.md](./07-ui-ux.md)

---

### DataOperator
**定义**：任务数据操作的统一接口，定义 5 个方法。

**核心方法**：
- `uploadTaskData` - 上传任务数据
- `downloadTaskData` - 下载任务数据
- `uploadSubmission` - 上传提交内容
- `getTaskMetadata` - 获取任务元数据
- `updateTaskMetadata` - 更新任务元数据

**特点**：
- 接口与数据层无关（不包含 GitHub/IPFS 等概念）
- 由 adapter 实现
- 轻量级（只定义接口）

**实现**：
- `SpecKitDataOperator` - spec-kit-mcp 实现
- `ObserverDataOperator` - observer-mcp 实现

**参考**：[02-interfaces.md Section 3](./02-interfaces.md#3-dataoperator-接口)

---

### Data Layer（数据层）
**定义**：任务数据的具体存储实现。

**实现**：
- `GitHubDataLayer` - GitHub Issue/PR 存储
- `IPFSDataLayer` - IPFS 去中心化存储（未来）
- `ArweaveDataLayer` - Arweave 永久存储（未来）

**位置**：`Code3/task3/data-layers/`

**特点**：
- 被多个 adapter 复用
- 封装所有存储 API 操作
- 处理 code3/v2 metadata

**参考**：[05-packages-structure.md Section 3.5](./05-packages-structure.md#35-data-layers--数据层实现)

---

### Dependency Injection（依赖注入）
**定义**：Code3 的核心设计模式，上层依赖接口而非具体实现。

**示例**：
```typescript
// adapter 创建实例
const dataOperator = new SpecKitDataOperator({ ... });
const bountyOperator = new AptosBountyOperator({ ... });

// 注入到 orchestration
const result = await publishFlow({
  dataOperator,    // 依赖注入
  bountyOperator,  // 依赖注入
  taskData,
  metadata
});
```

**优势**：
- 易于测试（Mock 接口）
- 易于扩展（新增实现不影响调用方）
- 类型安全

**参考**：[03-architecture.md Section 4.1](./03-architecture.md#41-依赖注入模式)

---

## E

### Ethereum
**定义**：基于 Solidity 的区块链，Code3 支持的第二条链。

**特点**：
- EVM 兼容
- 生态成熟
- 支持多种资产（ETH, USDT, USDC）

**合约位置**：`Code3/task3/bounty-operator/ethereum/contract/`

**参考**：[03-architecture.md Section 3.2](./03-architecture.md#32-区块链技术)

---

### ESM (ES Modules)
**定义**：Code3 使用的模块系统，现代 JavaScript 标准。

**要求**：
- `package.json` 中设置 `"type": "module"`
- 导入必须使用 `.js` 扩展名
- 不支持 `require()`

**示例**：
```typescript
// ✅ 正确
import { publishFlow } from './publish-flow.js';

// ❌ 错误
import { publishFlow } from './publish-flow';
```

**参考**：[05-packages-structure.md Section 7.2](./05-packages-structure.md#72-导入规范)

---

## F

### Flow（流程）
**定义**：Orchestration 层的完整业务流程，包含 5 个 flow。

**5 个核心 flow**：
- `publishFlow` - 发布 Bounty
- `acceptFlow` - 接受 Bounty
- `submitFlow` - 提交工作成果
- `confirmFlow` - 确认工作成果
- `claimFlow` - 领取赏金

**特点**：
- 与链无关（通过 BountyOperator 抽象）
- 与数据层无关（通过 DataOperator 抽象）
- 包含业务逻辑（状态验证、幂等性检查）

**参考**：[04-datastream.md](./04-datastream.md)

---

### Frontend
**定义**：见 [Dashboard](#dashboard)

---

## G

### Gas
**定义**：区块链交易的手续费。

**不同链的 Gas**：
- Aptos：0.0001-0.001 APT/交易
- Ethereum：动态调整（EIP-1559）

**优化策略**：
- 批量操作
- 使用资源账户（Aptos）
- 低 Gas 时段操作（Ethereum）

**参考**：[03-architecture.md Section 9.2](./03-architecture.md#92-gas-优化)

---

### GitHubDataLayer
**定义**：GitHub 数据层共享组件，封装所有 GitHub API 操作。

**核心方法**：
- `createIssue` - 创建 Issue
- `getIssue` - 获取 Issue
- `updateIssue` - 更新 Issue
- `createPR` - 创建 PR

**位置**：`Code3/task3/data-layers/github/`

**参考**：[05-packages-structure.md Section 3.5](./05-packages-structure.md#35-data-layers--数据层实现)

---

## H

### Hardhat
**定义**：Ethereum 智能合约开发框架，用于编译、测试、部署 Solidity 合约。

**配置文件**：`hardhat.config.ts`

**常用命令**：
```bash
npx hardhat compile    # 编译合约
npx hardhat test       # 运行测试
npx hardhat run scripts/deploy.ts --network sepolia  # 部署
```

**参考**：[06-quickstart.md Section 3.2](./06-quickstart.md#32-部署-ethereum-合约)

---

## I

### Idempotency（幂等性）
**定义**：多次执行相同操作，结果与执行一次相同。

**实现**：
- 计算 `taskHash = SHA256(taskData)`
- 调用 `getBountyByTaskHash(taskHash)` 检查是否已存在
- 如果存在，返回现有 Bounty，不创建新 Bounty

**场景**：
- 用户不小心多次点击"Publish"按钮
- 网络问题导致重复请求

**参考**：[01-data-model.md Section 8](./01-data-model.md#8-幂等性机制)

---

### IPFS
**定义**：去中心化存储网络，observer-mcp 使用。

**特点**：
- 内容寻址（CID）
- 去中心化
- 不可篡改

**使用场景**：
- 观察者任务数据存储
- 大文件存储

**参考**：[03-architecture.md Section 5.3](./03-architecture.md#53-数据层技术)

---

### Issue
**定义**：GitHub Issue，spec-kit-mcp 使用它存储任务数据。

**内容**：
- Title：任务标题
- Body：code3/v2 metadata（JSON 格式）

**示例**：
```json
{
  "schema": "code3/v2",
  "task": {
    "id": "owner/repo#123",
    "title": "Implement user authentication"
  },
  "bounty": {
    "bountyId": "123",
    "chain": "aptos",
    "amount": "100",
    "asset": "APT"
  },
  "dataLayer": {
    "type": "github-issue",
    "url": "https://github.com/owner/repo/issues/123"
  }
}
```

**参考**：[01-data-model.md Section 3.1](./01-data-model.md#31-taskmetadata-结构)

---

## M

### MCP (Model Context Protocol)
**定义**：Claude Code 使用的工具协议，允许 LLM 调用外部工具。

**核心概念**：
- **Tool**：LLM 可以调用的函数
- **Prompt**：预定义的提示词模板
- **Server**：暴露 tools 和 prompts 的服务

**示例**：
```typescript
server.addTool({
  name: 'publish-bounty',
  description: 'Publish a new bounty to the blockchain',
  parameters: { ... },
  handler: async (params) => { ... }
});
```

**参考**：[02-interfaces.md Section 1](./02-interfaces.md#1-架构概览)

---

### Metadata
**定义**：见 [TaskMetadata](#taskmetadata)

---

### Monorepo
**定义**：Code3 使用的代码组织方式，所有包在一个仓库中。

**工具**：npm workspaces

**优势**：
- 统一版本管理
- 共享依赖
- 简化跨包重构

**配置**：
```json
{
  "workspaces": [
    "Code3/spec-mcp/*",
    "Code3/task3/bounty-operator",
    "Code3/task3/orchestration",
    ...
  ]
}
```

**参考**：[05-packages-structure.md Section 5.1](./05-packages-structure.md#51-monorepo-结构npm-workspaces)

---

### Move
**定义**：Aptos 区块链的智能合约语言。

**特点**：
- 资源模型（Resource）
- 强类型
- 形式化验证

**合约位置**：`Code3/task3/bounty-operator/aptos/contract/sources/bounty.move`

**参考**：[03-architecture.md Section 3.2](./03-architecture.md#32-区块链技术)

---

## O

### Observer-mcp
**定义**：观察者工作流，使用 IPFS 存储数据。

**工具**：
- `upload-to-ipfs` - 上传到 IPFS
- `download-from-ipfs` - 从 IPFS 下载
- `create-observation-task` - 创建观察任务

**适配器**：`observer-adapter`

**参考**：[05-packages-structure.md Section 2.3](./05-packages-structure.md#23-observer-mcp观察者工作流)

---

### Orchestration（编排层）
**定义**：Code3 的核心业务逻辑层，负责完整流程编排。

**职责**：
- 流程编排（5 个 flow）
- 状态验证
- 业务逻辑协调
- 幂等性检查
- 冷静期验证

**特点**：
- 与链无关
- 与数据层无关
- 通过依赖注入接收 BountyOperator 和 DataOperator

**位置**：`Code3/task3/orchestration/`

**参考**：[02-interfaces.md Section 4](./02-interfaces.md#4-task3operator-抽象类)

---

## P

### Publish（发布）
**定义**：User（requester）发布新 Bounty 的操作。

**步骤**：
1. 计算 `taskHash = SHA256(taskData)`
2. 检查幂等性（`getBountyByTaskHash`）
3. 上传任务数据（`uploadTaskData`）
4. 创建链上 Bounty（`createBounty`）
5. 更新任务元数据（`updateTaskMetadata`）

**调用**：`publishFlow()`

**参考**：[04-datastream.md Section 2.1](./04-datastream.md#21-phase-1-publish-发布-bounty)

---

## R

### Requester
**定义**：发布 Bounty 的用户。

**权限**：
- 发布 Bounty（`createBounty`）
- 确认工作成果（`confirmBounty`）
- 取消 Bounty（`cancelBounty`，仅 Open 状态）

**参考**：[01-data-model.md Section 2.1](./01-data-model.md#21-bounty-实体)

---

## S

### Solidity
**定义**：Ethereum 智能合约语言。

**特点**：
- EVM 兼容
- 类 JavaScript 语法
- 生态成熟

**合约位置**：`Code3/task3/bounty-operator/ethereum/contract/contracts/BountyManager.sol`

**参考**：[03-architecture.md Section 3.2](./03-architecture.md#32-区块链技术)

---

### Spec-kit-mcp
**定义**：规范驱动工作流，Code3 的核心 workflow。

**工具（7 个）**：
- `specify` - 创建功能规范
- `analyze` - 分析规范
- `clarify` - 澄清规范细节
- `plan` - 生成实施计划
- `implement` - 实施功能
- `constitution` - 管理规范章程
- `tasks` - 任务管理

**适配器**：`spec-kit-adapter`

**参考**：[05-packages-structure.md Section 2.1](./05-packages-structure.md#21-spec-kit-mcp规范驱动工作流)

---

### User (Bounty Creator)
**定义**：见 [Requester](#requester)

**注意**：在合约代码中，参数名仍保持 `sponsor` 以保持接口兼容性，但在文档和 UI 中统一使用 "User" 或 "Requester"。

---

### Submit（提交）
**定义**：Worker 提交工作成果的操作。

**前置条件**：
- Bounty 状态为 `Accepted`
- 调用者是 Worker

**步骤**：
1. 上传提交内容（`uploadSubmission`）
2. 更新链上状态为 `Submitted`（`submitBounty`）

**调用**：`submitFlow()`

**参考**：[04-datastream.md Section 2.3](./04-datastream.md#23-phase-3-submit-提交工作)

---

## T

### Task3
**定义**：Code3 的核心基础设施目录。

**组成**：
- `bounty-operator/` - 链上操作层
- `data-operator/` - 数据操作层接口
- `orchestration/` - 流程编排层
- `adapters/` - 工作流适配器
- `data-layers/` - 数据层实现
- `frontend/` - Dashboard
- `backend/` - Webhook 服务

**位置**：`Code3/task3/`

**参考**：[05-packages-structure.md Section 3](./05-packages-structure.md#3-task3--核心基础设施)

---

### TaskHash
**定义**：任务内容的 SHA256 哈希值，用于幂等性检查。

**计算方式**：
```typescript
const taskHash = crypto
  .createHash('sha256')
  .update(JSON.stringify(taskData))
  .digest('hex');
```

**作用**：
- 防止重复创建相同的 Bounty
- 快速查找已存在的 Bounty（`getBountyByTaskHash`）

**参考**：[01-data-model.md Section 8](./01-data-model.md#8-幂等性机制)

---

### TaskMetadata
**定义**：任务元数据，存储在 Issue/PR body 中。

**Schema**：`code3/v2`

**核心字段**：
- `task` - 任务信息（id, title, description）
- `bounty` - Bounty 信息（bountyId, chain, amount）
- `workflow` - 工作流信息（type, version）
- `dataLayer` - 数据层信息（type, url）

**参考**：[01-data-model.md Section 3.1](./01-data-model.md#31-taskmetadata-结构)

---

### Three-layer Architecture（三层架构）
**定义**：Code3 的核心架构模式。

**三层**：
1. **Orchestration Layer** - 流程编排层
2. **BountyOperator Layer** - 链上操作层
3. **DataOperator Layer** - 数据操作层

**特点**：
- 依赖注入
- 接口与实现分离
- 易于扩展（新增链、新增 workflow）

**参考**：[03-architecture.md Section 2](./03-architecture.md#2-三层架构详解)

---

## W

### Webhook
**定义**：Backend 监听的 GitHub 事件。

**监听事件**：
- PR merged：触发 `confirmFlow`
- Issue closed：更新 Bounty 状态

**配置**：
```bash
POST /webhook/github
Content-Type: application/json
X-Hub-Signature: ...
```

**参考**：[05-packages-structure.md Section 3.7](./05-packages-structure.md#37-backend--webhook-服务)

---

### Worker
**定义**：接受 Bounty 并完成任务的用户。

**权限**：
- 接受 Bounty（`acceptBounty`）
- 提交工作成果（`submitBounty`）
- 领取赏金（`claimPayout`）

**参考**：[01-data-model.md Section 2.1](./01-data-model.md#21-bounty-实体)

---

### Workflow
**定义**：独立的 MCP 工具集，实现特定工作流程。

**现有 workflow**：
- `spec-kit-mcp` - 规范驱动工作流
- `aptos-mcp` - Aptos 链交互工具
- `observer-mcp` - 观察者工作流

**特点**：
- 独立运行
- 不依赖 task3/
- 通过 adapter 与 task3 连接

**参考**：[05-packages-structure.md Section 2](./05-packages-structure.md#2-spec-mcp--工作流层)

---

## 符号

### @code3-team/
**定义**：Code3 的 npm 组织前缀。

**示例**：
- `@code3-team/bounty-operator`
- `@code3-team/orchestration`
- `@code3-team/spec-kit-adapter`

**参考**：[05-packages-structure.md Section 5.2](./05-packages-structure.md#52-包命名规范)

---

## 参考

- **数据模型**：[01-data-model.md](./01-data-model.md)
- **接口定义**：[02-interfaces.md](./02-interfaces.md)
- **架构设计**：[03-architecture.md](./03-architecture.md)
- **数据流**：[04-datastream.md](./04-datastream.md)
- **包结构**：[05-packages-structure.md](./05-packages-structure.md)
- **快速开始**：[06-quickstart.md](./06-quickstart.md)
- **UI/UX 设计**：[07-ui-ux.md](./07-ui-ux.md)

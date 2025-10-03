# Code3 文档中心

> **Code3** — 将闲置的高阶 Coding Agents 变为可接单的算力与智能，服务没有订阅或短期不在线的开发者。

---

## 快速导航

### 新手入门
1. **项目愿景** → [01-数据流](./01-datastream.md) 第 1 节
2. **用户快速上手** ⭐ → [02-架构设计](./02-architecture.md) 第 10 节（Requester/Worker/Reviewer）
3. **开发者快速启动** → [04-快速开始](./04-quickstart.md)
4. **核心概念** → [99-术语表](./99-glossary.md)

### 开发者
- **系统架构** → [02-架构设计](./02-architecture.md)
- **数据模型** ⭐ → [05-数据模型](./05-data-model.md)（所有数据结构的单一事实来源）
- **MCP 工具接口** → [06-接口与契约](./06-interfaces.md)
- **完整工作流** → [08-工作流指南](./08-workflow.md)

### 运维与安全
- **包结构与配置** → [03-包结构](./03-packages-structure.md)
- **安全策略** → [09-安全策略](./09-security.md)

### 设计与 UI
- **Dashboard UI/UX** → [07-UI/UX 设计](./07-ui-ux.md)

---

## 文档列表（按编号阅读）

| 编号 | 文档名称 | 用途 |
|------|---------|------|
| **01** | [数据流](./01-datastream.md) | 从需求发布到赏金结算的完整数据流 |
| **02** | [系统架构](./02-architecture.md) | 技术栈选择、系统分层、模块职责 + **用户快速上手指南**（第 10 节）⭐ |
| **03** | [包结构与配置](./03-packages-structure.md) | Monorepo 结构、构建顺序、环境变量 |
| **04** | [快速开始与部署](./04-quickstart.md) | 5 分钟本地启动、合约部署、端到端测试 |
| **05** | [数据模型](./05-data-model.md) ⭐ | 核心数据结构、类型映射、状态机（单一事实来源） |
| **06** | [接口与契约](./06-interfaces.md) | 23 个 MCP 工具（7 spec-kit + 11 aptos-chain + 5 github）、合约 Entry Functions + View Functions、API 端点 |
| **07** | [UI/UX 设计](./07-ui-ux.md) | Dashboard 界面、交互流程、视觉规范 |
| **08** | [工作流指南](./08-workflow.md) | Requester/Worker/Reviewer 完整操作步骤 |
| **09** | [安全策略](./09-security.md) | 密钥管理、权限边界、审计机制 |
| **99** | [术语表](./99-glossary.md) | 所有专业术语与缩写的定义 |

---

## 核心概念

### 三大角色
- **Requester**（发布者）：提出需求、设立赏金、审核 PR
- **Worker**（接单者）：接单、实现功能、提交 PR、领取赏金
- **Reviewer**（审核者）：评审 PR、决定是否合并

### 三件套（Three-Piece Suite）
- `spec.md`：需求规格说明（技术无关）
- `plan.md`：技术方案与数据模型
- `tasks.md`：可执行任务列表（带依赖关系）

### 三大 MCP 服务（13 个工具）
| MCP 服务 | 工具数 | 核心工具 |
|---------|--------|---------|
| **spec-kit-mcp** | 7 | specify, plan, tasks, **clarify** ✨, **analyze** ✨, **implement** ✨, constitution |
| **aptos-chain-mcp** | 6 | create_bounty, accept_bounty, submit_pr, mark_merged, claim_payout, cancel_bounty |
| **github-mcp-server** | 外部 | create_issue, fork, create_pr, merge_pr, comment, label |

✨ **新增工具**（对标 spec-kit）:
- `clarify`: 11 类需求澄清检查（防止返工）
- `analyze`: 6 类质量检测 + Constitution Authority
- `implement`: 5 阶段 TDD 执行（Setup → Tests(红) → Core(绿) → Integration → Polish）

💡 **角色差异化**：不同角色（Requester/Worker/Reviewer）通过 **AGENTS.md/CLAUDE.md 配置指南**来指导使用哪些工具，而非安装不同的包。详见 [02-架构设计](./02-architecture.md) 第 9 节。

---

## 技术栈

### 前端
- Next.js 14 (App Router)
- TypeScript
- @aptos-labs/wallet-adapter-react（M4 钱包连接）

### 后端
- Node.js + Express + TypeScript
- GitHub Webhook 处理
- 链上事件索引

### 区块链
- **Aptos Testnet/Mainnet**
- Move 智能合约
- Fungible Asset (USDT)

### MCP 工具（三大服务）
- **spec-kit-mcp** — 本项目实现，7 个 spec-kit 工作流工具
- **aptos-chain-mcp** — 本项目实现，6 个 Aptos 链上交互工具
- **github-mcp-server** — 官方外部依赖，GitHub 操作
- TypeScript（Node 20+）+ pnpm Monorepo

---

## 里程碑

### M1 ✅ - 文档就绪
- [x] 统一数据模型（05-data-model.md）
- [x] MCP 工具接口定义（06-interfaces.md）
- [x] 完整工作流指南（08-workflow.md）

### M2 🔄 - MCP 最小闭环（Testnet）
- [ ] spec-kit-mcp 实现（7 个工具：specify, plan, tasks, clarify, analyze, implement, constitution）
- [ ] aptos-chain-mcp 实现（6 个工具：create_bounty, accept_bounty, submit_pr, mark_merged, claim_payout, cancel_bounty）
- [ ] github-mcp-server 集成（Issue/PR/Fork/Comment 操作）
- [ ] AGENTS.md/CLAUDE.md 角色配置模板生成
- [ ] Webhook 后端（mark_merged 自动触发）
- [ ] e2e 测试通过（单 Issue → 单 PR → 冷静期 → 领取）

### M3 - Dashboard + 合约部署（Testnet）
- [ ] Dashboard 前端（任务列表、赏金详情）
- [ ] 合约部署到 Testnet
- [ ] 链上事件索引

### M4 - 观测 + 钱包连接（Mainnet）
- [ ] Dashboard 钱包连接（Wallet Adapter）
- [ ] 前端触发链上操作
- [ ] 统计页面（任务总数、总支付、Top Workers）
- [ ] 合约部署到 Mainnet

---

## 快速开始

### 1. 安装依赖
```bash
git clone https://github.com/cyl19970726/Code3.git
cd Code3
pnpm install
```

### 2. 配置环境变量
```bash
cp .env.example .env.local
# 编辑 .env.local 填入 GITHUB_TOKEN, APTOS_API_KEY
```

### 3. 启动服务
```bash
# MCP 服务（安装到 Codex/Claude Code）
# spec-kit-mcp: 工作流工具
pnpm --filter @code3/spec-kit-mcp dev

# aptos-chain-mcp: 链上交互工具
pnpm --filter @code3/aptos-mcp dev

# Dashboard（前端）
pnpm --filter @code3/frontend dev
# 访问 http://localhost:3000

# Webhook 后端
pnpm --filter @code3/backend dev
```

### 4. 验证环境
```bash
bash scripts/check_env.sh
pnpm test
```

详见 → [04-快速开始与部署](./04-quickstart.md)

---

## 贡献指南

### 修改数据结构
⭐ **强制要求**：任何涉及数据结构的修改，必须先更新 [05-data-model.md](./05-data-model.md)，再更新代码。

### 新增 MCP 工具
1. 在 [06-interfaces.md](./06-interfaces.md) 定义接口
2. 在对应 MCP 包中实现（`spec-mcp/*`）
3. 更新 [02-architecture.md](./02-architecture.md) 的工具清单
4. 更新 [08-workflow.md](./08-workflow.md) 的使用示例

### 文档规范
- 使用中文（术语保留英文）
- 所有文件路径使用相对路径（如 `[Code3/spec-mcp/spec-kit-mcp/src/tools/specify.ts](../../spec-mcp/spec-kit-mcp/src/tools/specify.ts)`）
- 引用 TRUTH.md ADR（如 `参考：[TRUTH.md](../../TRUTH.md) ADR-005`）

---

## 参考资源

### 内部文档
- **TRUTH.md** — 架构决策记录（ADR-001 ~ ADR-009）
  - ⭐ **ADR-009**：三大 MCP 统一架构（替代原 ADR-005 角色分层）
- **AGENTS.md** — 工作代理总览与执行计划（Codex 用户配置指南）
- **CLAUDE.md** — 开发规范与执行约束（Claude Code 用户配置指南）

### 外部资源
- [spec-kit](https://github.com/spec-kit/spec-kit) — 工作流参考实现
- [Aptos Documentation](https://aptos.dev) — Aptos 区块链官方文档
- [Aptos Wallet Adapter](https://github.com/aptos-labs/aptos-wallet-adapter) — 前端钱包集成
- [MCP Protocol](https://modelcontextprotocol.io) — Model Context Protocol 规范

---

## 联系方式

- **GitHub Issues**: [cyl19970726/Code3/issues](https://github.com/cyl19970726/Code3/issues)
- **项目主页**: [github.com/cyl19970726/Code3](https://github.com/cyl19970726/Code3)

---

## 许可证

MIT License - 详见 [LICENSE](../../LICENSE)

# 99 — 术语表（Glossary）

> 本文定义 Code3 项目中使用的所有专业术语、缩写与概念。
> 按字母顺序排列，支持快速查找。

---

## A

### Agent（代理）
高阶 AI 编程助手（如 Codex、Claude Code Max），具备自主编码能力，可接单并完成任务。

### Aptos
第 1 层区块链（Layer 1），使用 Move 语言编写智能合约，提供高性能与安全性。本项目使用 Aptos Testnet/Mainnet 托管赏金合约。

### API Key（Aptos）
访问 Aptos 全节点 API 的密钥，用于读取链上数据与提交交易。通过 [Aptos Build](https://aptos.dev) 获取。

---

## B

### Bounty（赏金）
Requester 为完成某个功能需求而设立的奖励（以 USDT 计价），存储在 Aptos 合约中。

### Bounty ID
链上赏金的唯一标识符（`u64` 类型），用于查询与操作赏金状态。

### BountyStatus（赏金状态）
赏金的生命周期状态，包含 7 种：
- `Open`（0）- 待接单
- `Started`（1）- 已接单
- `PRSubmitted`（2）- PR 已提交
- `Merged`（3）- PR 已合并
- `CoolingDown`（4）- 冷静期（7 天）
- `Paid`（5）- 已支付
- `Cancelled`（6）- 已取消

---

## C

### Client-Local
本地开发 MCP 工具包（3 个工具：specify, plan, tasks），在本机生成 Spec/Plan/Tasks 三件套。

### Client-Remote
远程发布 MCP 工具包（2 个工具：specify, publish_issue_with_metadata），将 Spec 发布为 GitHub Issue 并创建链上赏金。

### Clarify（澄清）✨
新增工具，对 Spec 进行 11 类检查（功能边界/数据模型/用户体验/...），生成澄清问题列表。对标 spec-kit `/clarify`。

### Codex
OpenAI 的高阶 AI 编程助手，支持 MCP 协议，可自动接单、编码、测试、提交 PR。

### Constitution
Code3 项目的开发约束与最佳实践集合，包含 TDD、库优先、CLI 接口、集成测试优先等原则。存储于 `.specify/memory/constitution.md`。

### Constitution Authority
`analyze` 工具的 CRITICAL 级别检查，强制要求代码符合 Constitution 约束，否则阻断 `implement` 执行。

### Cooling Period（冷静期）
PR 合并后的 7 天等待期，允许 Sponsor 在此期间取消赏金（若发现严重问题）。结束后 Worker 可领取赏金。

---

## D

### Dashboard
Code3 的前端可视化界面，展示任务列表、赏金详情、状态时间线。MVP 只读展示，M4 增加钱包连接功能。

### delivery_id
GitHub Webhook 请求头 `X-GitHub-Delivery` 的值，用作幂等键防止重放攻击。

---

## E

### Entry Function（Aptos）
Aptos 合约中的公开入口函数（`public entry fun`），可被外部账户直接调用。

### ErrorCode
MCP 工具与合约的统一错误码，如 `GITHUB_API_ERROR`, `BOUNTY_NOT_FOUND`, `PERMISSION_DENIED` 等。

---

## F

### Fungible Asset (FA)
Aptos 的同质化资产标准（类似 ERC-20），本项目使用 USDT (Testnet/Mainnet) 作为赏金资产。

### Fork
Worker 将 Requester 的仓库复制到自己的 GitHub 账户，用于独立开发与提交 PR。

---

## G

### Gas Station
Aptos 的交易费赞助服务，允许 dApp 为用户支付 Gas 费，提升用户体验。本项目可选配置 `APTOS_GAS_STATION_API_KEY`。

### GitHub Token
访问 GitHub API 的个人访问令牌（Personal Access Token），需要 `repo` 和 `workflow` scope。

---

## H

### HMAC
基于哈希的消息认证码（Hash-based Message Authentication Code），用于校验 GitHub Webhook 签名。

---

## I

### Idempotency Key（幂等键）
用于防止重复操作的唯一标识符，如 `issue_hash`, `delivery_id`, `bounty_id + pr_url` 等。

### Implement（实现）✨
新增工具，按 5 阶段（Setup → Tests(红) → Core(绿) → Integration → Polish）执行 TDD 流程。对标 spec-kit `/implement`。

### Issue Hash
GitHub Issue 的唯一哈希（SHA256），用作链上赏金的幂等键，防止重复创建。

---

## M

### MCP (Model Context Protocol)
AI Agent 的工具协议，允许 Codex/Claude 调用外部工具（如创建 Issue、部署合约）。

### M2/M3/M4
项目里程碑：
- M2: MCP 最小闭环（Testnet）
- M3: Dashboard + 合约部署（Testnet）
- M4: 观测 + 钱包连接（Mainnet）

### Move
Aptos 区块链的智能合约编程语言，基于资源模型（Resource-Oriented），防止重入攻击。

---

## P

### Plan（计划）
基于 Spec 生成的技术方案文档，包含 `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`。

### PR (Pull Request)
GitHub 的代码合并请求，Worker 提交 PR 后由 Reviewer 审核与合并。

---

## R

### Requester（发布者）
提出需求并设立赏金的角色，负责审核 PR 与验收结果。

### Resolver（仲裁方）
有权标记 PR 合并的角色，通常是 Sponsor 或项目管理员。

### Reviewer（审核者）
评审 PR 代码质量与完整性的角色，决定是否合并。

---

## S

### Server-Remote
Worker 端 MCP 工具包（7 个工具：accept_task, fork_and_prepare, clarify, analyze, implement, open_pr, submit_pr），完成接单到提交的完整流程。

### Spec（规格说明）
需求文档（`spec.md`），描述功能需求、用户故事、验收标准，技术无关。

### Spec-Kit
开源工作流工具，提供 `/specify`, `/plan`, `/tasks`, `/clarify`, `/analyze`, `/implement` 等命令，本项目将其 MCP 化。

### Sponsor
创建赏金的地址（链上概念），通常与 Requester 是同一人。

### Sybil Attack
女巫攻击，攻击者使用多个身份（地址）操纵系统。本项目通过合约约束（一个 bounty 一个 winner）防护。

---

## T

### Tasks（任务列表）
基于 Plan 拆分的可执行任务（`tasks.md`），包含任务 ID、依赖关系、并行标记。

### TDD (Test-Driven Development)
测试驱动开发，先写测试（红），再实现（绿），最后重构（重构）。本项目强制执行 TDD 流程（`implement` 工具）。

### Three-Piece Suite（三件套）
Spec, Plan, Tasks 三个文档的合称，是 Code3 工作流的核心产物。

---

## U

### USDT
Tether 发行的稳定币（1 USDT = 1 USD），本项目使用 USDT (Fungible Asset) 作为赏金资产。
- Testnet: `0x...`（待补充）
- Mainnet: `0x...`（待补充）

---

## W

### Webhook
GitHub 的事件通知机制，当 PR 合并时发送 POST 请求到后端，触发 `mark_merged`。

### Winner
链上赏金的接单者（Worker 地址），首个调用 `accept_bounty` 的地址成为 winner。

### Worker（接单者）
浏览任务、接单、实现功能、提交 PR 并领取赏金的角色。

---

## 符号与缩写

| 符号/缩写 | 全称 | 说明 |
|----------|------|------|
| ✨ | New Tool | 标记新增工具（clarify/analyze/implement） |
| ADR | Architecture Decision Record | 架构决策记录（见 TRUTH.md） |
| API | Application Programming Interface | 应用程序编程接口 |
| CI/CD | Continuous Integration / Continuous Deployment | 持续集成/持续部署 |
| CLI | Command-Line Interface | 命令行接口 |
| FA | Fungible Asset | 同质化资产（Aptos） |
| MVP | Minimum Viable Product | 最小可行产品 |
| PR | Pull Request | 代码合并请求 |
| TDD | Test-Driven Development | 测试驱动开发 |
| TS | TypeScript | JavaScript 的超集 |
| UX | User Experience | 用户体验 |

---

## 文件路径缩写

| 缩写 | 完整路径 |
|------|---------|
| `spec-mcp/spec-kit-mcp/` | `Code3/spec-mcp/spec-kit-mcp/` |
| `spec-mcp/aptos-mcp/` | `Code3/spec-mcp/aptos-mcp/` |
| `task3/aptos/` | `Code3/task3/aptos/` |
| `task3/frontend/` | `Code3/task3/frontend/` |
| `task3/backend/` | `Code3/task3/backend/` |

**注**：使用外部官方 [github-mcp-server](https://github.com/github/github-mcp-server)，无本地路径。

---

## 参考

- 数据模型详细定义：[05-data-model.md](./05-data-model.md)
- 完整工作流说明：[08-workflow.md](./08-workflow.md)
- 系统架构：[02-architecture.md](./02-architecture.md)
- TRUTH.md（ADR 列表）：[../../TRUTH.md](../../TRUTH.md)

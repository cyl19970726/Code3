# PRD v1 — Spec-MCP：规范化任务拆分与远程委托

## 1. 产品目标

为开发者提供一套基于 Spec 驱动、MCP 可编排的任务生产与接单机制：
- 以 spec-kit 流程为核心（/specify → /plan → /tasks → 执行），将需求从“业务描述”到“工程任务”标准化。
- 支持“本地生成”和“远程生成/执行”，满足无订阅/离线用户将计划和任务拆分委托给他人的场景。
- 与 GitHub Issue 打通任务发布、协作与追踪（优先通过 github-mcp-server 执行 Issue/PR/Fork/评论）。
- 与 Aptos 合约打通赏金托管与状态流转，链上为“核心状态源”。
- 连接闲置的 Codex / Claude Code Max 订阅用户（或其他 Coding Agent），作为“接单者”承接任务、提交 PR 并领取赏金。

核心价值：
- 对发布者：只需写需求 Spec；计划和拆分由 Agent 承担；流程透明可审计。
- 对接单者：接入远程 MCP，自动拉取任务、Fork、执行标准流程、生成 PR；链上领取赏金。

## 2. MVP 范围

- 命令/工具面（对齐 spec-kit 流程与产物形态）
  - `/specify`：生成 `specs/<feature>/spec.md`（技术无关需求说明）。
  - `/plan`：生成研究、模型、契约、快速验证等文件（如 `research.md`、`data-model.md`、`contracts/`、`quickstart.md`）。
  - `/tasks`：生成 `tasks.md`，带依赖与并行策略标注。
- MCP 化
  - spec-kit-client-local MCP：在本地仓库执行上述命令并写入产物。
  - spec-kit-client-remote MCP：调用远程服务生成/发布，支持 GitHub Issue 创建与元数据写入（经 github-mcp-server）。
  - spec-kit-server-remote MCP：供接单者运行，拉取任务→Fork→生成/执行→PR→回写 Issue（经 github-mcp-server）。
- 任务发布（远程）
  - 将 `spec.md` 与最小元数据（JSON）发布到 GitHub Issue（标签 `code3`，状态标签 `open`）。
  - 将 Issue 与 Aptos 赏金合约建立映射（记录 `issue_hash`、`repo_url`、`asset(USDT)`、`amount`）。
- 任务执行（远程）
  - 接单者拉取任务，Fork 目标仓库，本地运行 `/specify` `/plan` `/tasks`（若未就绪），按 `tasks.md` 执行与提交 PR。
  - 回写进度到 Issue（评论，镜像用途），同步状态到合约（接受/提交/合并/冷静期/领取/取消）。

不包含（MVP）：
- 链上自动验证 PR 内容、多签金库、跨链支付、个性化任务分发算法。

## 3. 用户故事（MVP）

1. 作为发布者，我只提交一个“技术无关”的需求说明，系统自动产出计划与任务清单，并将任务作为 Issue 发布，同时在链上锁定 1 USDT 作为赏金。
2. 作为接单者，我启动 spec-kit-server-remote MCP，看到可接任务列表，选择其中一个，系统帮我 Fork、拉代码、生成计划/任务并在本地落盘，按任务实现后自动发起 PR。
3. 作为发布者，我在 PR 合并后，系统将链上状态置为 `Merged` 并进入 7 天冷静期，到期后接单者可领取赏金。

## 4. 关键流程

### 4.1 本地生成
- 开发者在本地仓库运行：
  - `/specify` → 写入 `specs/<feature>/spec.md`
  - `/plan` → 写入研究/模型/契约/快速验证
  - `/tasks` → 写入 `tasks.md`（并行/依赖）

### 4.2 远程发布
1. 调用 spec-kit-client-remote：
   - 上传 `spec.md` 与最小上下文
   - 远端生成 `plan`/`tasks`（可选）
   - 在 GitHub 创建 Issue：
     - 正文含人类可读摘要
     - 代码块内含机器可读 JSON（repo、issue_hash、feature_id、asset、amount、labels、spec_refs）
   - 调用 Aptos 合约创建赏金（返回 `bounty_id`），回填到 Issue 元数据。

### 4.3 接单（server-remote MCP）
1. 拉取未开始的 Issue（label=code3, state=open）。
2. 接受任务 → 链上标记 `Started`，Issue 标记 `in-progress`。
3. Fork + 本地落盘 → 若无产物则运行 `/specify` `/plan` `/tasks`。
4. 按 `tasks.md` 执行，提交 PR。
5. PR 合并 → 远端服务监听 Webhook，链上标记 `Merged` 并记录 `merged_at` → 进入 `CoolingDown(7d)` → 冷静期后接单者 `claim_payout` 获得 `Paid`。

### 4.5 自动接单（Server-Remote）
- `accept_best_task(criteria)`：按“价值/预估工作量”策略选择最佳任务接单（缺省按 `amount` 最大）。
- `task_id` 规范：`{owner}/{repo}#<issue_number>`，由服务端映射 `bounty_id` 与仓库 URL。

### 4.4 取消与失败
- 发布者取消：`Open`/`Started` 状态可取消，合约退回资金。
- 失败/关闭未合并：链上标记 `Cancelled`，Issue 关闭。

## 5. 产品流程

1) 需求输入（本地/远程）
2) 文档产出（spec/plan/tasks）
3) 发布任务（GitHub Issue + 合约赏金）
4) 接单执行（Fork→实现→PR）
5) 结算（PR 合并→冷静期→领取）

## 6. 验收标准（MVP）
- 本地模式：三个命令能稳定产出文档，结构与 `observer/specs/002-web-ai-agent/` 体例一致。
- 远程模式：
  - 成功创建带标准元数据的 Issue。
  - 可在链上创建对应赏金记录（测试网）。
  - 接单者能拉取→Fork→提交 PR，Issue 留痕完整。
- 最小 Dashboard：列表展示任务与链上状态（可在 task3 中实现），仅承担可视化与触发入口，不持有业务状态。

## 7. 风险与依赖
- GitHub API 限流与权限配置、Webhook 可靠性。
- 合约资产选择与 Gas 费用；资金托管的 UX（误操作、取消策略）。
- 私钥/Token 管理与最小权限原则（ENV/钥匙串；优先前端钱包签名；接单者可在本机以 `APTOS_PRIVATE_KEY` 自动化，Resolver 私钥仅在启用后端自动 `mark_merged` 时使用）。

## 8. 里程碑
- M1 文档与协议（当前）
- M2 MCP（local/remote/server）最小功能闭环
- M3 Aptos 合约 + Dashboard（测试网）
- M4 路由策略、健康检查、遥测与风控

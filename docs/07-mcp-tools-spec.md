MCP Tools Spec — Spec-MCP 工具契约与编排

本文件定义 Code3 的 Spec-MCP 工具族的输入/输出、错误码、幂等策略与编排关系。所有 GitHub 相关操作统一经 `github-mcp-server` 执行；链上交互统一经 `aptos-chain-mcp` 执行。本文档仅定义契约，不包含实现细节。

## 命名约定与版本
- 工具前缀：`spec_mcp.*`（client-local / client-remote）、`server_mcp.*`（server-remote）
- Schema 版本：`code3/v1`（与 Issue 元数据一致）
- 任务标识：`task_id = "{owner}/{repo}#<issue_number>"`
- 幂等键：明确标注的字段，如 `issue_hash`、`bounty_id`、`pr_url` 等

## 错误码规范
- `E_NOT_FOUND`：依赖文件/特性/Issue/PR 不存在
- `E_EXISTS`：目标已存在（如重复生成/重复发布）
- `E_PRECONDITION`：前置条件不满足（如缺少 research.md）
- `E_GH_RATE_LIMIT`：GitHub 速率限制
- `E_CHAIN_TX_FAILED`：链上交易失败
- `E_IDEMPOTENT_REJECTED`：幂等键冲突或重复提交
- `E_INTERNAL`：未知内部错误

---

## A. Client-Local 工具（本地生成三件套）

### 1) spec_mcp.specify (local)
- 作用：根据 feature 描述创建 `specs/<NNN-slug>/spec.md`
- 输入
```
{
  "feature_description": "string",                // 必填
  "feature_id": "string | null",                  // 可选；若为空则自动生成 NNN-slug
  "allow_overwrite": false                         // 可选；默认 false
}
```
- 输出
```
{
  "success": true,
  "feature_id": "NNN-slug",
  "paths": {
    "spec": "specs/NNN-slug/spec.md",
    "dir": "specs/NNN-slug"
  }
}
```
- 前置/幂等
  - 若已存在同名目录且 `allow_overwrite=false` → `E_EXISTS`
  - 生成编号与目录写入需具备事务性；失败需回滚
- 约束：模板内禁止技术实现细节；留存 `NEEDS CLARIFICATION` 时允许，但后续 `/plan` 必须处理

示例调用
```
{
  "feature_description": "Web AI agent project management",
  "allow_overwrite": false
}
```
示例返回
```
{
  "success": true,
  "feature_id": "003-web-ai-agent",
  "paths": { "dir": "specs/003-web-ai-agent", "spec": "specs/003-web-ai-agent/spec.md" }
}
```
失败与建议
- `E_EXISTS`：目录已存在且不允许覆盖 → 改 ID 或允许覆盖。
- `E_INTERNAL`：模板读取失败 → 配置 `SPEC_KIT_TEMPLATES_DIR` 或检查权限。

### 2) spec_mcp.plan (local)
- 作用：在 feature 目录生成 `plan.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md`
- 输入
```
{ "feature_id": "NNN-slug", "tech_constraints": "string | null", "allow_overwrite": false }
```
- 输出
```
{ "success": true, "paths": { "plan": ".../plan.md", "research": ".../research.md", "data_model": ".../data-model.md", "contracts": ".../contracts/", "quickstart": ".../quickstart.md" } }
```
- 前置/幂等：若 `spec.md` 缺失 → `E_PRECONDITION`；若目标文件存在且不可覆盖 → `E_EXISTS`
- 约束：严格遵循模板 Phase 边界（/plan 停在任务前，详见 plan 模板）

示例调用
```
{ "feature_id": "003-web-ai-agent", "allow_overwrite": false }
```
示例返回
```
{
  "success": true,
  "paths": {
    "plan": "specs/003-web-ai-agent/plan.md",
    "research": "specs/003-web-ai-agent/research.md",
    "data_model": "specs/003-web-ai-agent/data-model.md",
    "contracts": "specs/003-web-ai-agent/contracts",
    "quickstart": "specs/003-web-ai-agent/quickstart.md"
  }
}
```
失败与建议
- `E_PRECONDITION`：缺少 spec.md → 先执行 `spec_mcp.specify`。
- `E_EXISTS`：目标文件存在 → 启用覆盖或清理旧文件。

### 3) spec_mcp.tasks (local)
- 作用：生成 `tasks.md`（带 TDD 顺序、并行/依赖标注）
- 输入
```
{ "feature_id": "NNN-slug", "allow_overwrite": false }
```
- 输出
```
{ "success": true, "path": "specs/NNN-slug/tasks.md" }
```
- 前置/幂等：需存在 research/data-model/contracts/quickstart（通过等价校验）→ 否则 `E_PRECONDITION`
- 约束：生成后可运行“校验/修复器”保证结构一致性（与 observer 标杆 Schema 对齐）

示例调用
```
{ "feature_id": "003-web-ai-agent", "allow_overwrite": false }
```
示例返回
```
{ "success": true, "path": "specs/003-web-ai-agent/tasks.md" }
```
失败与建议
- `E_PRECONDITION`：缺少 research/data-model/quickstart → 先补全 /plan 产物。
- `E_EXISTS`：tasks.md 已存在 → 启用覆盖或合并内容。

---

## B. Client-Remote 工具

说明：为避免“必须同时安装 client-local 与 client-remote”的困境，client-remote 内也提供 `spec_mcp.specify`，允许本地创建 spec 后再远程发布。

### 1) spec_mcp.specify (remote variant)
- 作用：在当前仓库本地创建 `spec.md`（行为等价于 local 版）
- 输入/输出/约束：同 A.1

示例调用
```
{ "feature_description": "Web AI agent project management" }
```

### 2) spec_mcp.publish_issue_with_metadata
- 作用：将 feature 的 spec 与元数据发布为 GitHub Issue（经 `github-mcp-server`）并创建链上赏金（经 `aptos-chain-mcp`）
- 输入
```
{
  "repo": "owner/repo",
  "feature_id": "NNN-slug",
  "spec_path": "specs/NNN-slug/spec.md",
  "amount": "string",                   // 如 "1"
  "asset": "USDT",                       // 统一 USDT
  "network": "testnet",                 // Aptos 网络
  "labels": ["code3", "open"],
  "assignees": [ ]
}
```
- 输出
```
{
  "success": true,
  "issue": { "url": "...", "number": 123, "issue_hash": "sha256(...)" },
  "bounty": { "bounty_id": "..." }
}
```
- 幂等：`issue_hash` 作为幂等键；重复调用应返回现有 Issue/赏金信息或 `E_IDEMPOTENT_REJECTED`

示例调用
```
{
  "repo": "owner/repo",
  "feature_id": "003-web-ai-agent",
  "spec_path": "specs/003-web-ai-agent/spec.md",
  "amount": "1",
  "asset": "USDT",
  "network": "testnet",
  "labels": ["code3", "open"]
}
```
示例返回
```
{
  "success": true,
  "issue": { "url": "https://github.com/owner/repo/issues/123", "number": 123, "issue_hash": "0xabc..." },
  "bounty": { "bounty_id": "0x..." }
}
```
失败与建议
- `E_GH_RATE_LIMIT`：退避重试；
- `E_IDEMPOTENT_REJECTED`：复用返回的 Issue/bounty；
- `E_INTERNAL`：校验 Token 权限/仓库路径。

### 3) spec_mcp.remote_plan
- 作用：远程生成 `plan` 相关产物（作为建议内容），可附着到 Issue 评论或返回调用方落盘
- 输入
```
{ "issue_url": "...", "feature_id": "NNN-slug" }
```
- 输出
示例调用
```
{ "issue_url": "https://github.com/owner/repo/issues/123", "feature_id": "003-web-ai-agent" }
```
示例返回
```
{ "success": true, "artifacts": { "plan.md": "...", "research.md": "..." }, "posted": true }
```
失败与建议
- `E_PRECONDITION`：缺少 spec → 先本地生成或从附件恢复；
- `E_GH_RATE_LIMIT`：退避重试或仅返回 artifacts 由调用方落盘。
```
{ "success": true, "artifacts": { "plan.md": "...", "research.md": "...", ... }, "posted": true }
```

### 4) spec_mcp.remote_tasks
- 作用：远程生成 `tasks.md` 建议稿，附着到 Issue 或返回调用方审核
- 输入/输出：同 B.3 的风格；若前置不达标 → `E_PRECONDITION`
示例调用
```
{ "issue_url": "https://github.com/owner/repo/issues/123", "feature_id": "003-web-ai-agent" }
```
示例返回
```
{ "success": true, "artifacts": { "tasks.md": "..." }, "posted": true }
```
失败与建议
- `E_PRECONDITION`：先补全 /plan 产物；
- `E_GH_RATE_LIMIT`：退避重试或仅返回 artifacts。

---

## C. Server-Remote 工具

### 1) server_mcp.accept_task
- 作用：接单指定任务；链上登记 `accept_bounty`；Issue 标记 `in-progress`
- 输入
```
{ "task_id": "owner/repo#123" }
```
- 输出
示例调用
```
{ "task_id": "owner/repo#123" }
```
示例返回
```
{ "success": true, "bounty_id": "0x...", "labels": ["in-progress"] }
```
失败与建议
- 已被他人接单 → 返回冲突，提示改选；
- `E_CHAIN_TX_FAILED`：重试/检查 Gas/余额/网络。
```
{ "success": true, "bounty_id": "...", "labels": ["in-progress"] }
```

### 2) server_mcp.accept_best_task
- 作用：自动挑选最优任务接单（默认按 `amount` 最大）
- 输入
```
{ "min_amount": "0", "strategy": "max_amount | max_amount_per_effort" }
```
- 输出：与 C.1 一致，并附 `selected_task_id`
示例调用
```
{ "min_amount": "1", "strategy": "max_amount" }
```
失败与建议
- 无可接任务 → 返回空；建议扩大筛选条件或稍后重试。

### 3) server_mcp.fork_and_prepare
- 作用：Fork→Clone→若缺产物则运行 local 三件套→推分支
- 输入
```
{ "repo": "owner/repo", "issue_json": { /* 见 issue-metadata.md */ } }
```
- 输出
示例调用
```
{ "repo": "owner/repo", "issue_json": { "schema": "code3/v1", "issue_number": 123, "feature_id": "003-web-ai-agent" } }
```
失败与建议
- Fork 权限不足 → 使用有权限的 Token 或切换组织；
- Clone 失败 → 重试/更换协议（SSH/HTTPS）/配置凭据；
- 生成三件套失败 → 检查模板/磁盘权限。
```
{ "success": true, "fork_repo_url": "...", "branch": "...", "prepared": true }
```

### 4) server_mcp.open_pr
- 作用：创建 PR（经 `github-mcp-server`）
- 输入：{ repo, branch, title, body }
- 输出：{ success, pr_url }
示例调用
```
{ "repo": "owner/repo", "branch": "feat/003-web-ai-agent", "title": "feat: implement tasks", "body": "details..." }
```

### 5) server_mcp.comment_issue
- 作用：在 Issue 回写状态镜像
- 输入：{ issue_url, body }
- 输出：{ success, comment_id }
示例调用
```
{ "issue_url": "https://github.com/owner/repo/issues/123", "body": "PR: https://github.com/owner/repo/pull/456" }
```

### 6) server_mcp.submit_pr
- 作用：链上记录 `submit_pr(bounty_id, pr_url, commit_sha?)`（经 `aptos-chain-mcp`）
- 输入：{ bounty_id, pr_url, commit_sha? }
- 输出：{ success }
示例调用
```
{ "bounty_id": "0x...", "pr_url": "https://github.com/owner/repo/pull/456", "commit_sha": "abcdef..." }
```
失败与建议
- `E_CHAIN_TX_FAILED`：重试/检查网络/Gas；
- `E_INVALID_STATE`：先执行 `accept_bounty`。

### 7) server_mcp.claim_payout
- 作用：在冷静期结束后领取赏金
- 输入：{ bounty_id }
- 输出：{ success, tx_hash }
示例调用
```
{ "bounty_id": "0x..." }
```
失败与建议
- `E_COOLING`：等待至 `cooling_until`；
- `E_UNAUTHORIZED`：须由 winner 执行。

（注：`mark_merged` 由 Webhook 服务触发，非前台 MCP 工具。）

---

## 编排与顺序图（简）
1) 发布：`spec_mcp.specify(local)` → `spec_mcp.publish_issue_with_metadata` → `spec_mcp.remote_plan/tasks(可选)`
2) 接单：`server_mcp.accept_task|accept_best_task` → `server_mcp.fork_and_prepare` → `server_mcp.open_pr` → `server_mcp.submit_pr`
3) 结算：Webhook `mark_merged` → 冷静期 → `server_mcp.claim_payout`

## 记录与审计
- GitHub：Issue/PR 评论为人类可读镜像；标签为状态提示
- 链上：事件为单一事实来源
- 日志：MCP 层仅保留必要操作日志，不记录机密

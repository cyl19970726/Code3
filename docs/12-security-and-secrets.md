Security & Secrets — 凭据与最小权限策略

本文件约束 Spec-MCP 与 Server-Remote 的凭据管理，确保“合约为核心状态源，Dashboard 仅可视化”，且不在代码仓库持久化任何机密。

## 原则
- 不落盘秘钥；仅通过环境变量/系统钥匙串/容器 Secret 注入
- GitHub 操作一律经 `github-mcp-server`，避免手写 PAT 调用
- 链上签名优先使用前端钱包（Aptos Wallet Adapter）；自动化仅在接单者本机允许使用私钥

## 环境变量
- `GITHUB_TOKEN`：最小权限（Issue/PR 必需范围），仅供 `github-mcp-server`
- `APTOS_API_KEY`：Aptos 全节点 API Key（参考 aptos-chain-mcp 文档）
- `APTOS_GAS_STATION_API_KEY`（可选）：Gas 赞助，提高 UX
- `APTOS_PRIVATE_KEY`（可选）：接单者本机用于 `accept_bounty/submit_pr/claim_payout`
- `RESOLVER_PRIVATE_KEY`（可选）：仅在启用 Webhook 后端自动 `mark_merged` 时配置
- `GITHUB_WEBHOOK_SECRET`：验证 GitHub Webhook 签名

## 权限与风险
- Resolver 私钥风险高，默认不启用；如启用，仅用于 `mark_merged`
- 任何日志中禁止输出凭据；必要时使用脱敏打印
- 轮换：优先组织级 Secret；定期轮换并在 runbook 中记录

## 审计与边界
- 单一真相：链上事件；GitHub 仅作协作镜像
- Dashboard：仅展示状态与触发 MCP 调用，不保存机密

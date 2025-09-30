# Code3 文档索引（统一版）

按阅读顺序编号（01 起）：

- 01 数据流与概览 — 01-data-stream.md
- 02 PRD — Spec-MCP（spec-kit 的 MCP 化） — 02-prd-spec-mcp.md
- 03 PRD — 赏金合约 + Dashboard（Aptos） — 03-prd-bounty-dashboard.md
- 04 架构 — Spec-MCP — 04-architect-spec-mcp.md
- 05 架构 — 赏金合约 + Dashboard — 05-architect-bounty-dashboard.md
- 06 协议 — GitHub Issue 元数据规范 — 06-issue-metadata.md
- 07 协议 — MCP 工具与命令规范 — 07-mcp-tools-spec.md
- 08 合约 — code3_bounty 规范 — 08-contract-spec.md
- 09 接入 — Aptos API & Config 指南 — 09-api-and-config.md
- 10 联动 — 链上/链下桥接（Webhook） — 10-chain-offchain-bridge.md
- 11 交互 — Dashboard UX — 11-dashboard-ux.md
- 12 安全 — 凭据与秘钥管理 — 12-security-and-secrets.md
- 13 附录 — 初始化与记忆（Agents） — 13-init-memory-guides.md
- **14 核心 — 统一数据模型（必读）** — 14-data-model.md ⭐

使用建议：
- 新同学：从 01→03 了解愿景与范围；**务必阅读 14（统一数据模型）**；随后 06/07 阅读协议；最后按 08/09/10/11 实施。
- 实施者：**任何涉及数据结构的实现必须先查 14-data-model.md**；优先查 06/07 的接口与元数据，遇到链路问题看 10；安全配置查 12。
- 修改数据结构：**必须先更新 14-data-model.md，再更新代码**。

⭐ **14-data-model.md 是所有数据结构的单一事实来源（Single Source of Truth），违反将导致类型不一致和集成错误。**

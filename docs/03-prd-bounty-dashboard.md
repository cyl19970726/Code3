# PRD v1 — Code3 赏金合约 + Dashboard（Aptos）

## 1. 产品目标

为 Code3 提供最小可用的链上赏金托管与状态机，并配套 Dashboard：
- 将 GitHub Issue 的任务发布与链上赏金（APT/USDT/USDC）建立双向映射。
- 定义简洁的赏金状态机：Open → Started → PRSubmitted → Merged → CoolingDown(7d) → Paid / Cancelled。
- 与远程服务配合，通过 GitHub Webhook 在“PR 合并”时触发释放赏金。
- Dashboard 提供：创建赏金、接受任务、查看列表与详情、领取奖励。

## 2. MVP 范围

- Move 合约（testnet）：
  - `create_bounty(repo_url, issue_hash, asset, amount)`：发布者创建并注资（统一资产 USDT）。
  - `accept_bounty(bounty_id)`：接单者接受（允许多接单登记）。
  - `submit_pr(bounty_id, pr_url)`：接单者标记“已提交 PR”。
  - `mark_merged(bounty_id, pr_url)`：Resolver/后端在 PR 合并后调用（记录首个合并者并进入冷静期）。
  - `claim_payout(bounty_id)`：冷静期结束后，由首个合并的接单者领取赏金。
  - `cancel_bounty(bounty_id)`：发布者取消（在 Open/Started 条件下，退回资金）。
  - 事件：BountyCreated/Accepted/PRSubmitted/Merged/CoolingDown/Paid/Cancelled。
- Dashboard（Next.js + Aptos 钱包）：
  - 钱包连接（`@aptos-labs/wallet-adapter-react`）。
  - 赏金列表与详情；创建/接受/提交/领取流程按钮。
  - 使用全节点 API key；可选 Gas Station 以赞助交易费。
- 后端（最小服务）：
  - GitHub Webhook（PR 合并/关闭）→ 调用合约 `mark_merged` 或取消。
  - 只存最小“外链映射”（bounty_id ↔ repo/issue/pr_url），无敏感密钥落盘。

不包含（MVP）：
- 复杂仲裁与申诉、多签/托管金库、链上自动验证 PR 内容。

## 3. 用户故事

1) 作为发布者，我选择仓库与 Issue，设置 1 USDT 赏金，创建赏金后系统在链上锁定资金。
2) 作为接单者，我在 Dashboard 里接受任务，提交 PR 后点击“已提交 PR”，等待仓库合并；合并后进入 7 天冷静期，期满我执行“领取奖励”收到付款。
3) 并发接单允许，但只有首个被合并 PR 的接单者可以在冷静期后领取赏金。
4) 作为发布者，我在任务长时间未开始时可以取消并取回资金。

## 4. 关键流程

- 创建：钱包签名 → `create_bounty`（金额、资产、Issue 标识）→ 事件 `BountyCreated`。
- 接单：接单者签名 → `accept_bounty` → 状态 `Started`。
- 提交 PR：接单者签名 → `submit_pr` → 状态 `PRSubmitted`（记录 pr_url）。
- 合并：Webhook 调用 → `mark_merged`（识别首合并 PR）→ 状态 `Merged` → 进入 `CoolingDown(7d)`。
- 领取：冷静期结束 → 接单者签名 → `claim_payout` → `Paid`（transfer）。
- 取消：发布者签名 → `cancel_bounty`（`Open`/`Started`），资金退回。

## 5. 产品流程

1) 钱包连接与网络配置（testnet）
2) 列表页展示赏金（读事件/索引器）
3) 详情页：创建/接受/提交 PR/领取（合约内部在 `mark_merged` 时直接支付）
4) Webhook 后端 → 合约状态迁移

## 6. 验收标准（MVP）
- Testnet 上可完成“创建→接受→提交→合并→支付”的完整链路。
- Dashboard 能读取与展示赏金详情，按钮行为与错误提示清晰。
- 配置全节点 API key；可选配置 Gas Station（演示免 Gas 体验）。

## 7. 技术要点（aptos-chain-mcp 约束）
- 钱包连接：`@aptos-labs/wallet-adapter-react`（参见 aptos MCP 文档“如何接入钱包连接”）。
- 交易签名：使用 `useWallet().signAndSubmitTransaction`（参见“如何签名与提交交易”）。
- Gas Station：`@aptos-labs/gas-station-client` + `AptosConfig.pluginSettings.TRANSACTION_SUBMITTER`（参见“如何配置 Gas Station”）。
- 资产：统一使用 USDT（测试网），地址参见 aptos MCP 文档（“集成同质化资产标准”）。
- API Key：全节点 API Key 注入 `AptosWalletAdapterProvider` 与 SDK `AptosConfig`（参见“如何配置全节点 API Key”）。

## 8. 风险与依赖
- Webhook 可靠性（重试/签名校验）；PR 链接校验与冒领风险（最小化通过“以合并为准”策略）。
- 资产选择与汇率波动；小额时建议稳定币（USDT/USDC）。
- Gas 赞助额度与速率限制。

## 9. 里程碑
- M1 合约接口与事件定义完成
- M2 Dashboard 钱包接入与最小 UI 完成
- M3 Webhook 后端与链上状态打通
- M4 Demo 跑通并补充文档与脚本

Chain ↔ Offchain Bridge — Webhook & Idempotency

本文件定义 GitHub 合并 Webhook 与链上状态同步的桥接策略、顺序图与重试/幂等。

## 顺序图（合并→冷静期→领取）
1) PR 合并（GitHub）
2) Webhook 服务接收 `merged` 事件，验证 `GITHUB_WEBHOOK_SECRET`
3) 根据 Issue 元数据定位 `bounty_id` 与 `pr_url`
4) 调用合约 `mark_merged(bounty_id, pr_url)`（aptos-chain-mcp）
5) 合约进入 `Merged` 并设置 `merged_at/cooling_until` → 冷静期
6) 冷静期结束后，接单者前端发起 `claim_payout(bounty_id)` → `Paid`

## 幂等键与重试
- Webhook side idempotency key：`event_delivery_id`（GitHub 提供）+ `bounty_id`
- 合约侧：`mark_merged` 一次性；重复调用需返回无副作用
- 网络故障：指数退避 + 最多 N 次重试；超过阈值写入死信队列人工介入

## 失败补偿
- 合并事件未送达：人工触发 `mark_merged`（经 Resolver 前端/后端）
- 误合并：冷静期 7 天提供争议窗口（取消/仲裁策略后续细化）

## 安全
- Webhook 端严格校验签名；拒绝无签名或失配请求
- 不在服务端持久化私钥；如启用后端 Resolver 私钥，仅用于 `mark_merged`

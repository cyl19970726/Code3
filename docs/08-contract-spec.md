Contract Spec — code3_bounty（Move on Aptos）

本文件定义赏金合约的资源、事件、函数与约束（逻辑规范）。实现细节与 Move 语法留待实现阶段补充；此处为产品/合约契约层。

## 状态机与约束
```
Open → Started → PRSubmitted → Merged → CoolingDown(7d) → Paid
         └───────────────┐                     └→ Cancelled（Open/Started 可取消）
```
- 单 PR 结算：并发接单允许，但仅首个被合并 PR 的接单者可在冷静期后领取
- 资产：统一 USDT（测试网），金额/资产通过输入参数与 FA 标准处理

## 数据结构
- `Bounty { id, sponsor, winner?, repo_url, issue_hash, pr_url?, asset, amount, status, merged_at?, cooling_until? }`
- `Accepted { worker, at }`（按需维护接单者集合）

## 事件
- `BountyCreated { id, sponsor, repo_url, issue_hash, asset, amount }`
- `BountyAccepted { id, worker }`
- `PRSubmitted { id, worker, pr_url }`
- `Merged { id, pr_url, winner, merged_at, cooling_until }`
- `Paid { id, winner, amount }`
- `Cancelled { id }`

## 接口（函数）
- `create_bounty(repo_url, issue_hash, asset, amount) -> bounty_id`
  - 要求：仅 sponsor；锁定金额
- `accept_bounty(bounty_id)`
  - 要求：状态为 Open；记录 `worker`
- `submit_pr(bounty_id, pr_url, commit_sha?)`
  - 要求：调用者 = worker；状态：Started→PRSubmitted
  - 绑定：计算并存储 `pr_digest = hash(bounty_id || pr_url || commit_sha?)`，用于后续合并验证（commit_sha 可选，若提供可强化约束）
- `mark_merged(bounty_id, pr_url, commit_sha?)`
  - 要求：Resolver/Sponsor；状态：PRSubmitted；若首个合并，则确立 `winner` 与 `merged_at/cooling_until`，进入 `Merged`
  - 校验：若 `commit_sha` 提供，则要求 `hash(bounty_id || pr_url || commit_sha) == pr_digest`（对齐 `submit_pr` 记录）；否则匹配 `pr_url`
- `claim_payout(bounty_id)`
  - 要求：调用者 = winner；需到达 `cooling_until`；转账→`Paid`
- `cancel_bounty(bounty_id)`
  - 要求：Sponsor；仅在 `Open/Started`；退款→`Cancelled`

## 访问控制与不变量
- `mark_merged` 限定 Resolver/Sponsor；`claim_payout` 限定 winner；其余按语义限制
- winner 只能确立一次；`claim_payout` 仅能发生一次
- `cooling_until = merged_at + 7d`（时间来源以合约内置时间读取为准）
 - `pr_digest` 一经写入不可修改；`mark_merged` 必须指向先前 `submit_pr` 的 PR

## 错误码（建议）
- `E_INVALID_STATE`、`E_UNAUTHORIZED`、`E_DUPLICATE`、`E_COOLING`、`E_NOT_FOUND`

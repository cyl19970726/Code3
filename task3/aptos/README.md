# Code3 Bounty Smart Contract

> Aptos Move 智能合约，用于管理 GitHub Issue 赏金的完整生命周期。

## 功能概述

### 核心功能
- **创建赏金**：Sponsor 发布 Issue 并锁定赏金资金
- **接受赏金**：Worker 接单并成为 Winner
- **提交 PR**：Winner 提交 Pull Request
- **标记合并**：Resolver 确认 PR 已合并，启动 7 天冷静期
- **领取赏金**：冷静期结束后，Winner 领取资金
- **取消赏金**：Sponsor 可在 Open/Started/PRSubmitted 状态取消并退款

### 状态机

```
         create_bounty (Sponsor)
              ↓
           [Open] ───────────────────┐
              ↓                      │ cancel_bounty
        accept_bounty (Worker)       │ (Sponsor only)
              ↓                      ↓
         [Started] ──────────────> [Cancelled]
              ↓
        submit_pr (Worker)
              ↓
      [PRSubmitted]
              ↓
        mark_merged (Resolver/Sponsor)
              ↓
         [Merged]
              ↓
        (7 days wait)
              ↓
      [CoolingDown]
              ↓
       claim_payout (Winner only)
              ↓
          [Paid]
```

## 快速开始

### 1. 环境要求

```bash
# 安装 Aptos CLI
brew install aptos  # macOS
# 或参考 https://aptos.dev/cli-tools/aptos-cli-tool/install-aptos-cli

# 验证安装
aptos --version  # 需要 >= 2.0.0
```

### 2. 编译合约

```bash
cd Code3/task3/aptos

# 编译
aptos move compile --named-addresses code3=<你的地址>

# 运行测试（如有）
aptos move test
```

### 3. 部署到 Testnet

```bash
# 使用部署脚本（推荐）
bash scripts/deploy_testnet.sh

# 或手动部署
aptos move publish \
  --named-addresses code3=<你的地址> \
  --assume-yes
```

## Entry Functions

### create_bounty

创建新的赏金任务

```move
public entry fun create_bounty(
    sponsor: &signer,
    repo_url: String,
    issue_hash: vector<u8>,
    asset: Object<Metadata>,
    amount: u64
)
```

**参数**:
- `sponsor`: 赏金发起人（签名者）
- `repo_url`: GitHub 仓库 URL（如 `"https://github.com/owner/repo"`）
- `issue_hash`: Issue 哈希（SHA256 of `repo_url + issue_number`）
- `asset`: Fungible Asset 元数据对象（如 USDT）
- `amount`: 赏金金额（以 asset 的 decimals 为单位）

**前置条件**:
- `MIN_BOUNTY_AMOUNT <= amount <= MAX_BOUNTY_AMOUNT`
- Sponsor 账户余额 >= amount

**事件**: `BountyCreatedEvent`

---

### accept_bounty

接受赏金（Worker 成为 Winner）

```move
public entry fun accept_bounty(
    worker: &signer,
    bounty_id: u64
)
```

**参数**:
- `worker`: 接单者（签名者）
- `bounty_id`: 赏金 ID

**前置条件**:
- Bounty 状态 = `Open`
- Bounty 未被接受（`winner` 为空）

**事件**: `BountyAcceptedEvent`

---

### submit_pr

提交 PR 记录

```move
public entry fun submit_pr(
    worker: &signer,
    bounty_id: u64,
    pr_url: String,
    pr_digest: vector<u8>
)
```

**参数**:
- `worker`: 接单者（签名者，必须是 Winner）
- `bounty_id`: 赏金 ID
- `pr_url`: GitHub PR URL
- `pr_digest`: PR 内容的 SHA256 摘要

**前置条件**:
- Bounty 状态 = `Started`
- 签名者 = Winner
- PR URL 唯一（未重复提交）

**事件**: `PRSubmittedEvent`

---

### mark_merged

标记 PR 已合并（启动冷静期）

```move
public entry fun mark_merged(
    resolver: &signer,
    bounty_id: u64,
    pr_url: String
)
```

**参数**:
- `resolver`: Resolver/Sponsor（签名者）
- `bounty_id`: 赏金 ID
- `pr_url`: GitHub PR URL（必须与提交的 PR URL 一致）

**前置条件**:
- Bounty 状态 = `PRSubmitted`
- 签名者 = Sponsor（TODO: 支持 Resolver 白名单）
- PR URL 匹配

**效果**:
- 设置 `merged_at = 当前时间戳`
- 设置 `cooling_until = merged_at + 7 天`
- 状态 → `CoolingDown`

**事件**: `BountyMergedEvent`

---

### claim_payout

领取赏金

```move
public entry fun claim_payout(
    winner: &signer,
    bounty_id: u64
)
```

**参数**:
- `winner`: Winner（签名者）
- `bounty_id`: 赏金 ID

**前置条件**:
- Bounty 状态 = `CoolingDown`
- 签名者 = Winner
- 当前时间戳 >= `cooling_until`

**效果**:
- 从 Vault 账户转账 `amount` 到 Winner
- 状态 → `Paid`

**事件**: `BountyPaidEvent`

---

### cancel_bounty

取消赏金并退款

```move
public entry fun cancel_bounty(
    sponsor: &signer,
    bounty_id: u64
)
```

**参数**:
- `sponsor`: Sponsor（签名者）
- `bounty_id`: 赏金 ID

**前置条件**:
- Bounty 状态 ∈ {`Open`, `Started`, `PRSubmitted`}
- 签名者 = Sponsor

**效果**:
- 从 Vault 账户退款 `amount` 到 Sponsor
- 状态 → `Cancelled`

**事件**: `BountyCancelledEvent`

## View Functions

### get_bounty

查询赏金信息

```move
#[view]
public fun get_bounty(bounty_id: u64): (...)
```

**返回值** (按顺序):
1. `id: u64` - 赏金 ID
2. `sponsor: address` - Sponsor 地址
3. `winner: Option<address>` - Winner 地址（可选）
4. `repo_url: String` - GitHub 仓库 URL
5. `issue_hash: vector<u8>` - Issue 哈希
6. `pr_url: Option<String>` - PR URL（可选）
7. `asset: Object<Metadata>` - 资产元数据对象
8. `amount: u64` - 赏金金额
9. `status: u8` - 状态（0-6）
10. `merged_at: Option<u64>` - 合并时间戳（可选）
11. `cooling_until: Option<u64>` - 冷静期结束时间戳（可选）
12. `created_at: u64` - 创建时间戳

---

### get_next_bounty_id

查询下一个赏金 ID

```move
#[view]
public fun get_next_bounty_id(): u64
```

## 常量定义

### 状态常量

| 状态 | 值 | 说明 |
|------|---|------|
| `STATUS_OPEN` | 0 | 赏金已创建，等待接单 |
| `STATUS_STARTED` | 1 | 已被 Worker 接受 |
| `STATUS_PR_SUBMITTED` | 2 | PR 已提交 |
| `STATUS_MERGED` | 3 | PR 已合并（已废弃，直接进入 CoolingDown） |
| `STATUS_COOLING_DOWN` | 4 | 7 天冷静期中 |
| `STATUS_PAID` | 5 | 赏金已支付 |
| `STATUS_CANCELLED` | 6 | 已取消 |

### 业务常量

| 常量 | 值 | 说明 |
|------|---|------|
| `COOLING_PERIOD_SECONDS` | 604800 | 7 天冷静期（秒） |
| `MAX_BOUNTY_AMOUNT` | 1000000000000 | 最大赏金金额（1M USDT，6 decimals） |
| `MIN_BOUNTY_AMOUNT` | 1 | 最小赏金金额 |

### 错误码

| 错误码 | 值 | 说明 |
|-------|---|------|
| `E_BOUNTY_NOT_FOUND` | 1 | 赏金不存在 |
| `E_INVALID_STATUS` | 2 | 无效的状态迁移 |
| `E_NOT_SPONSOR` | 3 | 调用者不是 Sponsor |
| `E_NOT_WINNER` | 4 | 调用者不是 Winner |
| `E_COOLING_PERIOD_NOT_ENDED` | 5 | 冷静期未结束 |
| `E_INSUFFICIENT_BALANCE` | 6 | 余额不足 |
| `E_ALREADY_ACCEPTED` | 7 | 赏金已被接受 |
| `E_INVALID_ASSET` | 8 | 无效的资产或金额 |
| `E_DUPLICATE_PR` | 9 | 重复的 PR URL |

## 事件定义

### BountyCreatedEvent

赏金创建事件

```move
struct BountyCreatedEvent has drop, store {
    bounty_id: u64,
    sponsor: address,
    repo_url: String,
    issue_hash: vector<u8>,
    amount: u64,
    asset: Object<Metadata>,
}
```

### BountyAcceptedEvent

赏金接受事件

```move
struct BountyAcceptedEvent has drop, store {
    bounty_id: u64,
    winner: address,
}
```

### PRSubmittedEvent

PR 提交事件

```move
struct PRSubmittedEvent has drop, store {
    bounty_id: u64,
    pr_url: String,
}
```

### BountyMergedEvent

赏金合并事件（启动冷静期）

```move
struct BountyMergedEvent has drop, store {
    bounty_id: u64,
    merged_at: u64,
    cooling_until: u64,
}
```

### BountyPaidEvent

赏金支付事件

```move
struct BountyPaidEvent has drop, store {
    bounty_id: u64,
    winner: address,
    amount: u64,
}
```

### BountyCancelledEvent

赏金取消事件

```move
struct BountyCancelledEvent has drop, store {
    bounty_id: u64,
    sponsor: address,
}
```

## 资金管理

### Vault Account

合约使用 **Resource Account** 机制管理资金：

1. **初始化时**（`init_module`）：
   - 创建 Resource Account（种子: `"bounty_vault"`）
   - 存储 `SignerCapability` 到 `BountyStore`

2. **创建赏金时**：
   - 从 Sponsor 转账到 Vault Account
   - 使用 `primary_fungible_store::transfer`

3. **支付/退款时**：
   - 使用 `SignerCapability` 创建 Vault Signer
   - 从 Vault Account 转账到 Winner/Sponsor

### 幂等性保证

| 操作 | 幂等键 | 检查方式 |
|------|--------|---------|
| 创建赏金 | `issue_hash` | TypeScript MCP 工具层检查 |
| 接受赏金 | `bounty_id + winner` | 合约检查 `E_ALREADY_ACCEPTED` |
| 提交 PR | `bounty_id + pr_url` | 合约检查 `E_DUPLICATE_PR` |

## 安全策略

### 权限控制

- **create_bounty**: 任何账户
- **accept_bounty**: 任何账户（但不能重复接受）
- **submit_pr**: 只有 Winner
- **mark_merged**: 只有 Sponsor（TODO: 支持 Resolver 白名单）
- **claim_payout**: 只有 Winner + 冷静期结束
- **cancel_bounty**: 只有 Sponsor + 状态 ∈ {Open, Started, PRSubmitted}

### 冷静期机制

7 天冷静期的设计目的：
1. 给 Reviewer/Sponsor 足够时间验证 PR 质量
2. 防止恶意 PR 立即提取资金
3. 允许争议处理窗口

## 部署后操作

### 1. 记录合约地址

部署成功后，合约地址会自动保存到 `../../.env.testnet`:

```env
APTOS_CONTRACT_ADDRESS_TESTNET=0x...
```

### 2. 生成 TypeScript ABI

```bash
# 回到项目根目录
cd ../../../

# 生成 ABI（供 TypeScript MCP 工具使用）
pnpm --filter @code3/aptos-mcp generate:abi
```

### 3. 更新常量文件

编辑 `Code3/spec-mcp/aptos-mcp/src/contract/constants.ts`:

```typescript
export const CONTRACT_ADDRESS_TESTNET = "0x...";  // 替换为实际地址
```

### 4. 验证部署

访问 Aptos Explorer:

```
https://explorer.aptoslabs.com/account/<合约地址>?network=testnet
```

## 开发备注

### MVP 阶段限制

1. **只支持 Testnet**（M2/M3）
2. **Resolver 权限**: 暂时只有 Sponsor 可标记合并
3. **单 PR 结算**: 每个 Bounty 只能提交一个 PR

### M4 扩展计划

1. **Resolver 白名单**: 支持授权的第三方标记合并
2. **Mainnet 支持**: 部署到生产环境
3. **多资产支持**: 扩展到其他 Fungible Assets

## 许可证

MIT License

## 参考资源

- [Aptos Move 文档](https://aptos.dev/move/move-on-aptos)
- [Fungible Asset 标准](https://aptos.dev/standards/fungible-asset)
- [Code3 数据模型](../../docs/05-data-model.md)
- [Code3 工作流](../../docs/08-workflow.md)

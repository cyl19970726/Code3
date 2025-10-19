# Ethereum E2E Test Guide

## 测试文件位置

- **E2E 测试文件**: `src/e2e-ethereum.test.ts`
- **环境变量配置**: `.env.test`
- **测试合约**: Sepolia Testnet (已部署)

## 准备工作

### 1. 准备两个 Sepolia 测试账户

您需要两个不同的账户来测试完整流程：

1. **Requester (发布者)**: 创建赏金、接受 worker、确认工作
2. **Worker (工作者)**: 接受赏金、提交工作、领取奖励

### 2. 获取 Sepolia 测试币

每个账户需要至少 **0.05 Sepolia ETH**（用于 gas 费用）

推荐水龙头：
- **Alchemy**: https://sepoliafaucet.com/ (0.5 ETH/天)
- **Infura**: https://www.infura.io/faucet/sepolia (0.5 ETH/天)
- **QuickNode**: https://faucet.quicknode.com/ethereum/sepolia (0.1 ETH/天)

### 3. 配置 `.env.test` 文件

编辑 `.env.test` 文件：

```bash
# Sepolia RPC URL（使用公共 RPC 或您的 Alchemy/Infura API）
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Requester 私钥（从 Metamask 导出）
PRIVATE_KEY=0x_your_requester_private_key_here

# Worker 私钥（不同的账户）
WORKER_PRIVATE_KEY=0x_your_worker_private_key_here

# BountyManager 合约地址（Sepolia 已部署）
CONTRACT_ADDRESS=0x28FE83352f2451c54d9050761DF1d7F8945a8fc4
```

**如何从 Metamask 导出私钥**：
1. 打开 Metamask
2. 点击账户详情
3. 点击"导出私钥"
4. 输入密码
5. 复制私钥（以 0x 开头的 66 字符）

⚠️ **安全提醒**：
- 不要使用主网账户的私钥
- 不要提交 `.env.test` 到 git
- 仅在测试网使用这些私钥

## 运行测试

### 完整测试套件（推荐）

```bash
cd /Users/hhh0x/workflows/doing/Code3/task3/bounty-operator/ethereum

# 运行所有 E2E 测试
pnpm test:e2e
```

### 运行特定测试

编辑 `src/e2e-ethereum.test.ts`，将 `.skip` 改为 `.only`：

```typescript
// 运行完整流程测试
describe.only('E2E: Ethereum Bounty Complete Flow', () => {
  // ...
});

// 或只运行取消流程测试
describe.only('E2E: Ethereum Bounty Cancellation Flow', () => {
  // ...
});
```

然后运行：
```bash
pnpm test:e2e
```

## 测试流程说明

### 测试套件 1: 完整赏金流程（9 步骤）

**预计时间**: 5-8 分钟
**Gas 费用**: ~0.02 ETH

| 步骤 | 操作 | 预期结果 | 超时 |
|------|------|----------|------|
| Step 1 | 创建赏金 (0.01 ETH) | 生成 bountyId，状态=Open | 60s |
| Step 2 | 验证幂等性 | 通过 taskHash 找到 bountyId | 30s |
| Step 3 | Worker 接受赏金 | 状态=Accepted，worker 已设置 | 60s |
| Step 4 | Worker 提交工作 | 状态=Submitted，submissionUrl 已保存 | 60s |
| Step 5 | Requester 确认工作 | 状态=Confirmed，coolingUntil=确认时间+7天 | 60s |
| Step 6 | 尝试提前领取（应失败） | 交易被拒绝 | 60s |
| Step 7 | 查询 requester 的赏金列表 | 包含当前 bountyId | 30s |
| Step 8 | 查询 worker 的赏金列表 | 包含当前 bountyId | 30s |
| Step 9 | 获取冷却期 | 604800 秒（7 天） | 30s |
| Step 10 | Worker 领取奖励（跳过） | ⚠️ 需等待 7 天，手动测试 | - |

**Step 10 手动测试**：

如果您想测试完整的领取流程（包括 Step 10），需要：

1. 完成 Step 1-5
2. 等待 7 天
3. 运行以下命令：

```typescript
// 创建一个临时测试脚本 test-claim.ts
import { EthereumBountyOperator } from './src/ethereum-bounty-operator.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const workerOperator = new EthereumBountyOperator({
  rpcUrl: process.env.SEPOLIA_RPC_URL!,
  privateKey: process.env.WORKER_PRIVATE_KEY!,
  contractAddress: process.env.CONTRACT_ADDRESS!
});

const bountyId = 'YOUR_BOUNTY_ID_FROM_STEP_1';

const result = await workerOperator.claimPayout({ bountyId });
console.log('✅ Claimed! Tx:', result.txHash);
```

运行：
```bash
node test-claim.ts
```

### 测试套件 2: 取消赏金流程（2 步骤）

**预计时间**: 2-3 分钟
**Gas 费用**: ~0.01 ETH

| 步骤 | 操作 | 预期结果 | 超时 |
|------|------|----------|------|
| Step 1 | 创建赏金 (0.01 ETH) | 生成 bountyId，状态=Open | 60s |
| Step 2 | 取消赏金 | 状态=Cancelled，ETH 退回 | 60s |

## 测试输出示例

### 成功输出

```
✅ E2E test environment ready
- Contract: 0x28FE83352f2451c54d9050761DF1d7F8945a8fc4
- Requester: 0xFe1bA596129392420f21b2Db260522ea4a46168B
- Worker: 0x9876543210987654321098765432109876543210
- Task ID: test-task-1697000000000
- Amount: 0.01 ETH

📝 Step 1: Creating bounty...
✅ Bounty created!
   Bounty ID: 1
   Tx Hash: 0xabc123...
   Sepolia: https://sepolia.etherscan.io/tx/0xabc123...

🔍 Step 2: Checking idempotency...
✅ Idempotency verified!
   Task hash: 0x123abc...
   Found bounty ID: 1

✋ Step 3: Worker accepting bounty...
✅ Bounty accepted!
   Tx Hash: 0xdef456...
   Sepolia: https://sepolia.etherscan.io/tx/0xdef456...

📤 Step 4: Worker submitting work...
✅ Work submitted!
   Submission URL: https://github.com/test-repo/pull/1697000000000
   Tx Hash: 0xghi789...
   Sepolia: https://sepolia.etherscan.io/tx/0xghi789...

✅ Step 5: Requester confirming work...
✅ Work confirmed!
   Confirmed at: 2025-10-15T12:00:00.000Z
   Cooling until: 2025-10-22T12:00:00.000Z
   Tx Hash: 0xjkl012...
   Sepolia: https://sepolia.etherscan.io/tx/0xjkl012...
   ⏳ Cooling period: 7.00 days remaining

⏰ Step 6: Attempting early claim (should fail)...
✅ Early claim blocked as expected!
   ⏳ Must wait 7 days after confirmation

📋 Step 7: Querying bounties by requester...
✅ Found 3 bounties for requester
   Bounty IDs: 1, 2, 3

📋 Step 8: Querying bounties by worker...
✅ Found 1 bounties for worker
   Bounty IDs: 1

⏱️  Step 9: Getting cooling period...
✅ Cooling period: 604800 seconds (7 days)

✓ E2E: Ethereum Bounty Complete Flow (9 tests) 350000ms
```

## 常见问题

### Q1: 测试失败 "insufficient funds"

**原因**: 账户余额不足

**解决方案**:
```bash
# 检查账户余额
npx hardhat run scripts/check-balance.js --network sepolia
```

从水龙头获取更多测试币。

### Q2: 测试失败 "nonce too low"

**原因**: 本地 nonce 与链上不同步

**解决方案**:
```bash
# 等待几秒后重试
sleep 5
pnpm test:e2e
```

### Q3: RPC 连接超时

**原因**: 公共 RPC 限流

**解决方案**: 使用 Alchemy 或 Infura 的 RPC URL

```bash
# 在 .env.test 中使用：
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

### Q4: 交易被拒绝 "execution reverted"

**原因**: 合约逻辑验证失败（如状态不对、权限不足）

**解决方案**: 检查测试日志，查看具体错误信息。常见原因：
- 使用了错误的账户（requester vs worker）
- 状态机转换不合法（如在 Accepted 状态尝试 confirm）
- 冷却期未结束就尝试 claim

### Q5: 如何查看交易详情？

每个测试步骤都会输出 Etherscan 链接，点击查看：

```
Sepolia: https://sepolia.etherscan.io/tx/0xabc123...
```

## 测试验收标准

✅ **T020 完成条件**:

1. **测试文件创建**: ✅ `src/e2e-ethereum.test.ts`
2. **配置模板**: ✅ `.env.test`
3. **完整流程覆盖**:
   - ✅ Step 1-6: 创建→接受→提交→确认→阻止提前领取
   - ✅ Step 7-9: 查询功能
   - ✅ 取消流程（单独测试套件）
4. **文档完整**: ✅ 本指南（E2E-TEST-GUIDE.md）

## 下一步

完成 E2E 测试后，继续 **T021: 集成 Ethereum 到 spec-kit-adapter**，让 MCP 工具支持 Ethereum 链。

---

**提示**: E2E 测试需要真实的区块链交易，请预留 5-10 分钟时间，并确保有足够的 Sepolia ETH。

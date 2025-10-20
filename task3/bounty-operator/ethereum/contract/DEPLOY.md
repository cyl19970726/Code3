# BountyManager 合约部署指南

## 前置准备

### 1. 获取 Sepolia 测试币

您需要在 Sepolia 测试网获取测试 ETH 来支付部署 gas 费用。

**推荐水龙头（Faucets）**：

1. **Alchemy Sepolia Faucet** ⭐ 推荐
   - 网址：https://sepoliafaucet.com/
   - 要求：Alchemy 账号
   - 每日额度：0.5 Sepolia ETH

2. **Infura Sepolia Faucet**
   - 网址：https://www.infura.io/faucet/sepolia
   - 要求：Infura 账号
   - 每日额度：0.5 Sepolia ETH

3. **QuickNode Sepolia Faucet**
   - 网址：https://faucet.quicknode.com/ethereum/sepolia
   - 要求：Twitter 账号
   - 每日额度：0.1 Sepolia ETH

4. **Chainlink Sepolia Faucet**
   - 网址：https://faucets.chain.link/sepolia
   - 要求：GitHub 或 Google 账号
   - 每日额度：0.1 Sepolia ETH

### 2. 配置环境变量

编辑 `.env` 文件，填入以下信息：

```bash
# Sepolia RPC URL（使用公共 RPC 或您自己的 Infura/Alchemy API）
SEPOLIA_RPC_URL=https://rpc.sepolia.org
# 或使用 Alchemy: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
# 或使用 Infura: https://sepolia.infura.io/v3/YOUR_API_KEY

# 部署账户私钥（Metamask: 账户详情 → 导出私钥）
PRIVATE_KEY=0x_your_private_key_here

# Etherscan API Key（用于合约验证）
# 申请地址：https://etherscan.io/myapikey
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

⚠️ **安全提醒**：
- 不要提交 `.env` 文件到 git
- 不要在生产环境使用测试私钥
- 建议使用专门的部署账户

### 3. 获取 Etherscan API Key（可选）

用于在 Etherscan 上验证合约代码。

1. 访问：https://etherscan.io/myapikey
2. 注册账号并创建 API Key
3. 将 API Key 填入 `.env` 文件

## 部署步骤

### 步骤 1: 检查账户余额

```bash
# 检查您的地址是否有足够的 Sepolia ETH
npx hardhat run scripts/check-balance.js --network sepolia
```

预计 gas 费用：约 0.01-0.02 Sepolia ETH

### 步骤 2: 部署到 Sepolia

```bash
pnpm run deploy:sepolia
```

**预期输出**：

```
Deploying BountyManager to Ethereum...
Deploying with account: 0x_your_address_here
Account balance: 0.5 ETH
Deploying BountyManager...
✅ BountyManager deployed to: 0x_contract_address_here
📄 Deployment info saved to: deployments/sepolia.json

⏳ Waiting for block confirmations...
🔍 Verifying contract on Etherscan...
✅ Contract verified successfully

🎉 Deployment complete!
Contract address: 0x_contract_address_here
Network: sepolia
Deployer: 0x_your_address_here
```

### 步骤 3: 验证部署结果

部署信息会保存在 `deployments/sepolia.json`：

```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "contractAddress": "0x...",
  "deployer": "0x...",
  "deployedAt": "2025-10-15T08:00:00.000Z",
  "blockNumber": 12345678
}
```

### 步骤 4: 在 Etherscan 上查看

访问：https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS

您应该能看到：
- ✅ 合约代码已验证
- ✅ 合约 ABI
- ✅ 构造函数参数
- ✅ 部署交易

## 常见问题

### Q1: 报错 "insufficient funds"

**原因**：账户余额不足

**解决方案**：
1. 检查账户余额：`npx hardhat run scripts/check-balance.js --network sepolia`
2. 从水龙头获取更多测试币
3. 等待几分钟后重试

### Q2: 报错 "nonce too low"

**原因**：本地 nonce 与链上不同步

**解决方案**：
```bash
# 清除本地缓存
rm -rf cache/
rm -rf artifacts/
pnpm run compile
```

### Q3: 报错 "network does not support ENS"

**原因**：Sepolia 网络配置问题

**解决方案**：检查 `hardhat.config.cjs` 中的 `sepolia.url` 是否正确

### Q4: Etherscan 验证失败

**原因**：
- API Key 无效
- 网络拥堵
- 合约已验证

**解决方案**：
```bash
# 手动验证
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
```

### Q5: 部署交易一直 pending

**原因**：Gas 价格设置过低

**解决方案**：
在 `hardhat.config.cjs` 中添加 gas 配置：
```javascript
sepolia: {
  url: process.env.SEPOLIA_RPC_URL,
  accounts: [process.env.PRIVATE_KEY],
  gasPrice: 20000000000, // 20 gwei
}
```

## 部署后操作

### 1. 更新 TypeScript 配置

将合约地址保存到 TypeScript 配置：

```typescript
// src/config/contracts.ts
export const CONTRACTS = {
  ethereum: {
    sepolia: {
      bountyManager: '0x_your_contract_address',
    },
    mainnet: {
      bountyManager: '', // 未部署
    },
  },
};
```

### 2. 生成 TypeChain 类型

```bash
pnpm run compile
```

TypeChain 会自动生成 `typechain-types/BountyManager.ts`

### 3. 测试合约交互

创建测试脚本 `scripts/test-contract.js`：

```javascript
const { ethers } = require('hardhat');

async function main() {
  const contractAddress = '0x_your_contract_address';
  const bountyManager = await ethers.getContractAt('BountyManager', contractAddress);

  // 测试读取
  const coolingPeriod = await bountyManager.COOLING_PERIOD();
  console.log('Cooling period:', coolingPeriod.toString(), 'seconds');

  // 测试创建 bounty
  const taskId = 'test-task-001';
  const taskHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));
  const amount = ethers.parseEther('0.01');

  const tx = await bountyManager.createBounty(taskId, taskHash, { value: amount });
  await tx.wait();
  console.log('✅ Bounty created!');
}

main().catch(console.error);
```

运行测试：
```bash
npx hardhat run scripts/test-contract.js --network sepolia
```

## 部署清单

- [ ] 获取 Sepolia 测试币（至少 0.1 ETH）
- [ ] 配置 `.env` 文件（PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY）
- [ ] 运行 `pnpm run deploy:sepolia`
- [ ] 检查 `deployments/sepolia.json` 文件
- [ ] 在 Etherscan 上验证合约
- [ ] 更新 TypeScript 配置文件
- [ ] 测试合约交互

## 参考资源

- **Sepolia 浏览器**：https://sepolia.etherscan.io/
- **Hardhat 文档**：https://hardhat.org/hardhat-runner/docs/guides/deploying
- **Ethers.js 文档**：https://docs.ethers.org/v6/
- **OpenZeppelin 合约**：https://docs.openzeppelin.com/contracts/

---

**下一步**：部署完成后，继续 T019 - 实现 EthereumBountyOperator TypeScript 类

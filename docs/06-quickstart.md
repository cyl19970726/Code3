# 06 — 快速开始

> 本文提供 Code3 系统的快速入门指南
> 参考：[TRUTH.md](../../TRUTH.md) ADR-012

---

## 1. 前置条件

### 1.1 开发环境

**必需工具**：
- Node.js 18+
- npm 9+
- Git 2.40+
- Claude Code CLI（MCP 客户端）

**推荐工具**：
- VS Code（代码编辑器）
- Aptos CLI（Aptos 链开发）
- Hardhat（Ethereum 链开发）

### 1.2 账户准备

**区块链账户**：
- Aptos 账户（Testnet/Mainnet）
- Ethereum 账户（Sepolia/Mainnet）

**服务账户**：
- GitHub 账户（需要 repo 权限）
- GitHub Personal Access Token

**获取测试币**：
```bash
# Aptos Testnet 水龙头
aptos account fund-with-faucet --account <YOUR_ADDRESS>

# Ethereum Sepolia 水龙头
# 访问 https://sepoliafaucet.com/
```

---

## 2. 环境配置

### 2.1 克隆仓库

```bash
git clone https://github.com/code3-team/code3.git
cd code3
```

### 2.2 安装依赖

```bash
# 安装所有依赖（npm workspaces）
npm install

# 构建所有包
npm run build
```

### 2.3 配置环境变量

Code3 项目包含多个子模块，每个模块都有自己的 `.env` 文件。下面是完整的配置指南。

#### 2.3.1 配置文件清单

| 文件路径 | 用途 | 必需 |
|---------|------|------|
| `task3/frontend/dashboard/.env` | Dashboard 前端配置 | ✅ 是 |
| `task3/adapters/spec-kit-mcp-adapter/.env` | MCP Adapter 配置（运行时） | ✅ 是 |
| `task3/adapters/spec-kit-mcp-adapter/.env.test` | MCP Adapter 测试配置 | ⚠️ 测试时 |
| `task3/bounty-operator/ethereum/.env.test` | Ethereum Operator 测试 | ⚠️ 测试时 |
| `task3/bounty-operator/ethereum/contract/.env` | Ethereum 合约部署 | ⚠️ 部署时 |
| `task3/bounty-operator/aptos/contract/.env.testnet` | Aptos 合约部署 | ⚠️ 部署时 |

#### 2.3.2 Dashboard 配置（`task3/frontend/dashboard/.env`）

**用途**：前端 Dashboard 连接区块链和 GitHub

```bash
# Aptos 配置
NEXT_PUBLIC_APTOS_CONTRACT_ADDRESS=0xafd0c08dbf36230f9b96eb1d23ff7ee223ad40be47917a0aba310ed90ac422a1
NEXT_PUBLIC_APTOS_NETWORK=testnet

# Ethereum 配置
NEXT_PUBLIC_ETHEREUM_CONTRACT_ADDRESS=0x28FE83352f2451c54d9050761DF1d7F8945a8fc4
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# GitHub 配置（后端 API 使用，不要加 NEXT_PUBLIC_ 前缀）
GITHUB_TOKEN=ghp_your_github_personal_access_token_here
```

**⚠️ 重要说明**：
- `NEXT_PUBLIC_*` 前缀的变量会暴露到浏览器端，不要放敏感信息
- `GITHUB_TOKEN` 只在服务端 API 路由中使用，不会暴露到浏览器

**启动 Dashboard**：
```bash
cd task3/frontend/dashboard
npm install
npm run dev
# 访问 http://localhost:3000
```

#### 2.3.3 MCP Adapter 配置（`task3/adapters/spec-kit-mcp-adapter/.env`）

**用途**：MCP 服务器运行时配置（用于 Claude Desktop）

```bash
# GitHub 配置
GITHUB_TOKEN=ghp_your_github_personal_access_token_here
GITHUB_REPO=owner/repo-name

# Aptos 配置（User/Requester 钱包）
APTOS_PRIVATE_KEY=0x_your_aptos_private_key_here
APTOS_MODULE_ADDRESS=0xafd0c08dbf36230f9b96eb1d23ff7ee223ad40be47917a0aba310ed90ac422a1

# Ethereum 配置（User/Requester 钱包）
ETHEREUM_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ETHEREUM_PRIVATE_KEY=0x_your_ethereum_private_key_here
ETHEREUM_CONTRACT_ADDRESS=0x28FE83352f2451c54d9050761DF1d7F8945a8fc4

# 本地规格文件存储路径
LOCAL_SPECS_DIR=./specs
```

**配置 Claude Desktop MCP 服务器**：

编辑 `~/.claude/claude_desktop_config.json`（macOS）或 `%APPDATA%\Claude\claude_desktop_config.json`（Windows）：

```json
{
  "mcpServers": {
    "spec-kit-mcp-adapter": {
      "command": "node",
      "args": ["/Users/your-username/code3/task3/adapters/spec-kit-mcp-adapter/dist/server.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "GITHUB_REPO": "owner/repo",
        "APTOS_PRIVATE_KEY": "0x_your_key",
        "APTOS_MODULE_ADDRESS": "0xafd0c08dbf36230f9b96eb1d23ff7ee223ad40be47917a0aba310ed90ac422a1",
        "ETHEREUM_RPC_URL": "https://ethereum-sepolia-rpc.publicnode.com",
        "ETHEREUM_PRIVATE_KEY": "0x_your_key",
        "ETHEREUM_CONTRACT_ADDRESS": "0x28FE83352f2451c54d9050761DF1d7F8945a8fc4",
        "LOCAL_SPECS_DIR": "./specs"
      }
    }
  }
}
```

重启 Claude Desktop 后，在对话中可以使用：
- `publish-bounty` - 发布 Bounty
- `accept-bounty` - 接受 Bounty
- `submit-bounty` - 提交工作
- `confirm-bounty` - 确认工作
- `claim-bounty` - 领取赏金

#### 2.3.4 MCP Adapter 测试配置（`task3/adapters/spec-kit-mcp-adapter/.env.test`）

**用途**：E2E 测试环境变量（User + Worker 两个钱包）

```bash
# GitHub 配置
GITHUB_TOKEN=ghp_your_github_personal_access_token_here
TEST_REPO=owner/test-repo

# Aptos 配置（User 钱包）
APTOS_PRIVATE_KEY=0x_user_aptos_private_key
APTOS_MODULE_ADDRESS=0x39c3a18dce95618c8366072d8068ec31c68af0c5a0ffd50699bccea8dde16182

# Ethereum 配置（User 钱包）
ETHEREUM_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ETHEREUM_PRIVATE_KEY=0x_user_ethereum_private_key
ETHEREUM_WORKER_PRIVATE_KEY=0x_worker_ethereum_private_key
ETHEREUM_CONTRACT_ADDRESS=0x28FE83352f2451c54d9050761DF1d7F8945a8fc4

# 本地配置
LOCAL_SPECS_DIR=./tests/fixtures/specs
```

**运行 E2E 测试**：
```bash
cd task3/adapters/spec-kit-mcp-adapter
pnpm test:e2e
```

#### 2.3.5 Ethereum 合约部署配置（`task3/bounty-operator/ethereum/contract/.env`）

**用途**：部署 Ethereum 合约到 Sepolia 测试网

```bash
# Sepolia 测试网 RPC URL
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Ethereum 主网 RPC URL（生产环境）
MAINNET_RPC_URL=https://eth.llamarpc.com

# 部署账户私钥
PRIVATE_KEY=0x_your_deployer_private_key_here

# Etherscan API Key（用于合约验证）
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**部署 Ethereum 合约**：
```bash
cd task3/bounty-operator/ethereum/contract

# 编译合约
npx hardhat compile

# 部署到 Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# 验证合约（自动完成，如需手动）
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

**当前已部署的合约**：
- **地址**：`0x28FE83352f2451c54d9050761DF1d7F8945a8fc4`
- **网络**：Sepolia Testnet
- **冷静期**：0 seconds（测试环境）
- **Etherscan**：https://sepolia.etherscan.io/address/0x28FE83352f2451c54d9050761DF1d7F8945a8fc4#code

#### 2.3.6 Aptos 合约部署配置（`task3/bounty-operator/aptos/contract/.env.testnet`）

**用途**：部署 Aptos 合约到 Testnet

```bash
# Aptos 网络配置
NETWORK=testnet
RPC_URL=https://fullnode.testnet.aptoslabs.com/v1

# 部署账户私钥
PRIVATE_KEY=0x_your_deployer_private_key_here

# 合约地址（部署后填写）
MODULE_ADDRESS=0xafd0c08dbf36230f9b96eb1d23ff7ee223ad40be47917a0aba310ed90ac422a1
```

**部署 Aptos 合约**：
```bash
cd task3/bounty-operator/aptos/contract

# 编译合约
aptos move compile

# 部署到 Testnet
aptos move publish \
  --named-addresses bounty_addr=<YOUR_ADDRESS> \
  --network testnet \
  --private-key-file <PATH_TO_KEY>

# 记录部署的 MODULE_ADDRESS 到 .env.testnet
```

**当前已部署的合约**：
- **地址**：`0xafd0c08dbf36230f9b96eb1d23ff7ee223ad40be47917a0aba310ed90ac422a1`
- **网络**：Aptos Testnet
- **冷静期**：0 seconds（测试环境）

#### 2.3.7 获取测试币

**Aptos Testnet 水龙头**：
```bash
# 方式 1：使用 Aptos CLI
aptos account fund-with-faucet --account <YOUR_ADDRESS>

# 方式 2：访问网页水龙头
# https://aptoslabs.com/testnet-faucet
```

**Ethereum Sepolia 水龙头**：
- Alchemy：https://sepoliafaucet.com/
- Infura：https://www.infura.io/faucet/sepolia
- QuickNode：https://faucet.quicknode.com/ethereum/sepolia

#### 2.3.8 安全最佳实践

**⚠️ 永远不要**：
- ❌ 将 `.env` 文件提交到 Git（已在 `.gitignore` 中）
- ❌ 在公开仓库中暴露私钥
- ❌ 使用生产环境私钥进行测试
- ❌ 共享 GitHub Token（使用最小权限 Token）

**✅ 推荐做法**：
- ✅ 使用 `.env.example` 作为模板
- ✅ 为测试和生产使用不同的钱包
- ✅ 定期轮换 GitHub Token
- ✅ 生产环境使用 AWS Secrets Manager / HashiCorp Vault
- ✅ 仅授予 GitHub Token `repo` 权限（不要 `admin`）

---

## 3. 部署合约（仅首次）

### 3.1 部署 Aptos 合约

```bash
cd Code3/task3/bounty-operator/aptos/contract

# 编译合约
aptos move compile

# 部署到 Testnet
aptos move publish \
  --named-addresses bounty_addr=<YOUR_ADDRESS> \
  --private-key-file ~/.aptos/config.yaml

# 记录合约地址到 .env
echo "APTOS_CONTRACT_ADDRESS=<DEPLOYED_ADDRESS>" >> ../../../../.env
```

### 3.2 部署 Ethereum 合约

```bash
cd Code3/task3/bounty-operator/ethereum/contract

# 安装依赖
npm install

# 编译合约
npx hardhat compile

# 部署到 Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# 记录合约地址到 .env
echo "ETHEREUM_CONTRACT_ADDRESS=<DEPLOYED_ADDRESS>" >> ../../../../.env
```

---

## 4. 第一个 Bounty（spec-kit 工作流）

### 4.1 启动 MCP 服务器

**方式 1：使用 Claude Code**
```bash
# 在 Claude Code 中配置 MCP 服务器
# 编辑 ~/.claude/claude_desktop_config.json

{
  "mcpServers": {
    "spec-kit-adapter": {
      "command": "node",
      "args": ["/path/to/Code3/task3/adapters/spec-kit-adapter/dist/server.js"],
      "env": {
        "GITHUB_TOKEN": "your_token",
        "APTOS_PRIVATE_KEY": "your_key"
      }
    }
  }
}
```

**方式 2：直接运行**
```bash
cd Code3/task3/adapters/spec-kit-adapter
npm start
```

### 4.2 Requester：发布 Bounty

**Step 1：创建功能规范**

在 Claude Code 中：
```
使用 spec-kit-mcp 的 specify 工具创建功能规范：
- feature: "user-authentication"
- description: "Implement email + password authentication with JWT tokens"
```

这会生成 `specs/001/spec.md`

**Step 2：发布到链上**

```
使用 spec-kit-adapter 的 publish-bounty 工具：
- taskData: specs/001/spec.md 的内容
- repo: "owner/repo"
- chain: "aptos"
- amount: "100"
- asset: "APT"
```

**预期结果**：
```
✅ GitHub Issue 创建成功：https://github.com/owner/repo/issues/1
✅ Aptos Bounty 创建成功：bountyId = 123
✅ txHash = 0xabcd...
```

### 4.3 Worker：接单

**在 Claude Code 中**：
```
使用 spec-kit-adapter 的 accept-bounty 工具：
- taskUrl: "https://github.com/owner/repo/issues/1"
- chain: "aptos"
```

**预期结果**：
```
✅ 任务数据下载到本地：specs/001/spec.md
✅ Aptos Bounty 状态更新：Open → Accepted
✅ txHash = 0xdef0...
```

### 4.4 Worker：实施功能

**使用 spec-kit-mcp 工作流**：
```
1. 分析规范：
   使用 analyze 工具分析 specs/001/spec.md

2. 生成计划：
   使用 plan 工具生成实施计划

3. 实施功能：
   使用 implement 工具开始实施
   - 创建分支 feature/user-authentication
   - 编写代码
   - 提交到分支
```

### 4.5 Worker：提交工作成果

**在 Claude Code 中**：
```
使用 spec-kit-adapter 的 submit-bounty 工具：
- taskUrl: "https://github.com/owner/repo/issues/1"
- submissionData: { prUrl: "https://github.com/owner/repo/pull/10" }
- chain: "aptos"
```

**预期结果**：
```
✅ GitHub PR 创建成功：https://github.com/owner/repo/pull/10
✅ Aptos Bounty 状态更新：Accepted → Submitted
✅ txHash = 0x1234...
```

### 4.6 Requester：确认工作

**审查 PR 后，在 Claude Code 中**：
```
使用 spec-kit-adapter 的 confirm-bounty 工具：
- taskUrl: "https://github.com/owner/repo/issues/1"
- chain: "aptos"
```

**预期结果**：
```
✅ Aptos Bounty 状态更新：Submitted → Confirmed
✅ 冷静期开始：7 天后可领取
✅ coolingUntil = 1730000000
✅ txHash = 0x5678...
```

### 4.7 Worker：领取赏金

**7 天后，在 Claude Code 中**：
```
使用 spec-kit-adapter 的 claim-bounty 工具：
- taskUrl: "https://github.com/owner/repo/issues/1"
- chain: "aptos"
```

**预期结果**：
```
✅ 冷静期已结束，可以领取
✅ 赏金已转账：100 APT
✅ Aptos Bounty 状态更新：Confirmed → Claimed
✅ txHash = 0x9abc...
```

---

## 5. 使用 Ethereum 链

### 5.1 发布 Bounty（Ethereum）

```
使用 spec-kit-adapter 的 publish-bounty 工具：
- taskData: specs/002/spec.md 的内容
- repo: "owner/repo"
- chain: "ethereum"  # ⭐ 切换到 Ethereum
- amount: "50"
- asset: "USDT"
```

**adapter 会自动**：
- 使用 `EthereumBountyOperator` 而非 `AptosBountyOperator`
- 调用 Ethereum 合约的 `createBounty`
- 其他流程完全相同

### 5.2 后续流程

接单、提交、确认、领取流程与 Aptos 完全相同，只需在调用工具时指定 `chain: "ethereum"`。

---

## 6. 使用 observer-mcp 工作流

### 6.1 observer-mcp 特点

**与 spec-kit-mcp 的区别**：
- 数据存储：IPFS（去中心化）而非 GitHub Issue
- 任务类型：观察者任务（数据采集、监控）
- 提交方式：IPFS CID 而非 GitHub PR

### 6.2 发布观察任务

**在 Claude Code 中**：
```
使用 observer-adapter 的 publish-bounty 工具：
- taskData: { observationTarget: "https://example.com", frequency: "hourly" }
- chain: "aptos"
- amount: "50"
- asset: "APT"
```

**预期结果**：
```
✅ 任务数据上传到 IPFS：QmXxx...
✅ GitHub Issue 创建（包含 IPFS CID）
✅ Aptos Bounty 创建成功
```

### 6.3 提交观察结果

```
使用 observer-adapter 的 submit-bounty 工具：
- taskUrl: "https://github.com/owner/repo/issues/2"
- submissionData: { ipfsCid: "QmYyy...", observations: [...] }
- chain: "aptos"
```

**预期结果**：
```
✅ 观察结果上传到 IPFS：QmYyy...
✅ Bounty 状态更新：Accepted → Submitted
```

---

## 7. 使用 Dashboard（前端）

### 7.1 启动 Dashboard

```bash
cd Code3/task3/frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问：`http://localhost:3000`

### 7.2 连接钱包

**Aptos 钱包**：
1. 安装 Petra Wallet 浏览器扩展
2. 点击 Dashboard 的"Connect Wallet"
3. 选择"Aptos (Petra)"
4. 授权连接

**Ethereum 钱包**：
1. 安装 MetaMask 浏览器扩展
2. 点击 Dashboard 的"Connect Wallet"
3. 选择"Ethereum (MetaMask)"
4. 授权连接

### 7.3 浏览 Bounty

**Bounty 列表页**（`/`）：
- 显示所有 Open/Accepted/Submitted 状态的 Bounty
- 过滤：按状态、按链、按金额
- 排序：按时间、按金额

**Bounty 详情页**（`/bounty/[id]`）：
- 显示 Bounty 详细信息
- 显示任务数据（spec.md）
- 显示提交内容（PR/IPFS）
- 操作按钮：Accept、Submit、Confirm、Claim

### 7.4 发布 Bounty

**发布页**（`/publish`）：
1. 填写表单：
   - 任务标题
   - 任务描述
   - 赏金金额
   - 选择链（Aptos/Ethereum）
   - 选择资产（APT/USDT/ETH）
2. 点击"Publish Bounty"
3. 钱包弹窗确认交易
4. 等待交易确认

---

## 8. 常见问题

### 8.1 幂等性检查

**问题**：我不小心多次调用了 `publish-bounty`，会创建重复的 Bounty 吗？

**回答**：不会。`publishFlow` 会计算 `taskHash = SHA256(taskData)`，并调用 `getBountyByTaskHash(taskHash)` 检查是否已存在。如果存在，直接返回现有 Bounty，不会创建重复。

**示例**：
```
第 1 次调用：
- 计算 taskHash = 0xabcd...
- 检查 bounty 不存在
- 创建新 bounty，bountyId = 123

第 2 次调用：
- 计算 taskHash = 0xabcd...（相同）
- 检查 bounty 已存在（bountyId = 123）
- 返回 { isNew: false, bountyId: "123", txHash: null }
```

### 8.2 状态验证

**问题**：Worker 已经接单，我能再次接单吗？

**回答**：不能。`acceptFlow` 会调用 `getBounty(bountyId)` 检查状态。如果状态不是 `Open`，会抛出错误 `"Bounty is not Open (current: Accepted)"`。

### 8.3 冷静期验证

**问题**：Requester 确认后，Worker 能立即领取赏金吗？

**回答**：不能。`claimFlow` 会检查 `coolingUntil` 时间戳。如果冷静期未结束，会抛出错误 `"Cooling period not ended (Xs remaining)"`。

**冷静期时长**：7 天（604800 秒）

### 8.4 Gas 费用

**Aptos**：
- 每笔交易约 0.0001-0.001 APT
- 使用资源账户可以降低存储成本

**Ethereum**：
- Sepolia Testnet 免费（测试网）
- Mainnet Gas 费用动态调整（EIP-1559）
- 建议在 Gas 价格较低时操作

### 8.5 MCP 工具不可用

**问题**：Claude Code 提示"MCP server not available"

**解决方案**：
1. 检查 `~/.claude/claude_desktop_config.json` 配置是否正确
2. 检查 MCP 服务器进程是否运行：`ps aux | grep node`
3. 检查环境变量是否正确：`echo $GITHUB_TOKEN`
4. 重启 Claude Code

---

## 9. 测试

### 9.1 单元测试

**运行所有测试**：
```bash
npm test
```

**运行特定包的测试**：
```bash
# orchestration 测试
cd Code3/task3/orchestration
npm test

# bounty-operator/aptos 测试
cd Code3/task3/bounty-operator/aptos
npm test
```

### 9.2 E2E 测试

```bash
cd Code3/task3/adapters/spec-kit-adapter
npm run test:e2e
```

**E2E 测试流程**：
1. 发布 Bounty（Testnet）
2. 接单
3. 提交
4. 确认（等待冷静期）
5. 领取
6. 验证链上状态

---

## 10. 下一步

### 10.1 深入学习

- **数据模型**：[01-data-model.md](./01-data-model.md) — 了解 Bounty 实体和状态机
- **接口定义**：[02-interfaces.md](./02-interfaces.md) — 了解三层架构的接口
- **架构设计**：[03-architecture.md](./03-architecture.md) — 了解系统架构
- **数据流**：[04-datastream.md](./04-datastream.md) — 了解完整数据流
- **包结构**：[05-packages-structure.md](./05-packages-structure.md) — 了解模块组织

### 10.2 贡献指南

**提交 Issue**：
- Bug 报告：https://github.com/code3-team/code3/issues/new?template=bug_report.md
- 功能请求：https://github.com/code3-team/code3/issues/new?template=feature_request.md

**提交 PR**：
1. Fork 仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 编写代码 + 测试
4. 提交 PR：参考 [CONTRIBUTING.md](../../CONTRIBUTING.md)

### 10.3 社区

- **Discord**：https://discord.gg/code3
- **Twitter**：https://twitter.com/code3team
- **文档**：https://docs.code3.dev

---

## 11. 参考

- **ADR-012**：[TRUTH.md](../../TRUTH.md) ADR-012
- **数据模型**：[01-data-model.md](./01-data-model.md)
- **接口定义**：[02-interfaces.md](./02-interfaces.md)
- **包结构**：[05-packages-structure.md](./05-packages-structure.md)

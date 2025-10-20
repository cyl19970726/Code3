# 06 — 快速开始

> 本文提供 Code3 系统的快速入门指南
> 参考：[TRUTH.md](../../TRUTH.md) ADR-012

---

## 1. 快速开始（3 分钟）

### 1.1 配置 MCP 工具

**spec-kit-mcp**（工作流工具）- 添加到 `.mcp.json`：
```json
{
  "mcpServers": {
    "spec-kit": {
      "command": "npx",
      "args": ["-y", "@code3-team/spec-kit-mcp"]
    }
  }
}
```

**spec-kit-mcp-adapter**（Bounty 工具）- 添加到 `.mcp.json`：
```json
{
  "mcpServers": {
    "spec-kit-adapter": {
      "command": "node",
      "args": ["/Users/your-path/Code3/task3/adapters/spec-kit-mcp-adapter/dist/src/server.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "GITHUB_REPO": "owner/repo",
        "ETHEREUM_PRIVATE_KEY": "0x_your_ethereum_key",
        "APTOS_PRIVATE_KEY": "0x_your_aptos_key"
      }
    }
  }
}
```

**注意**：
- RPC URLs 和合约地址在 `src/chain-config.ts` 中预配置，无需填写
- Ethereum 合约：`0x8A0f158B6568BCf1F488fd4e4D7835686FE5a292`（Sepolia）
- 获取测试币：[Sepolia Faucet](https://sepoliafaucet.com/)

### 1.2 启动前端

```bash
cd /Users/hhh0x/workflows/doing/Code3/task3/frontend/dashboard
npm install
npm run dev
```

访问：`http://localhost:3000`

---

## 2. 前置条件

### 2.1 开发环境

**必需工具**：
- Node.js 18+
- npm 9+
- Git 2.40+
- Claude Code CLI（MCP 客户端）

**推荐工具**：
- VS Code（代码编辑器）
- Aptos CLI（Aptos 链开发）
- Hardhat（Ethereum 链开发）

### 2.2 账户准备

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

## 3. 环境配置

### 3.1 克隆仓库

```bash
git clone https://github.com/code3-team/code3.git
cd code3
```

### 3.2 安装依赖

```bash
# 安装所有依赖（npm workspaces）
npm install

# 构建所有包
npm run build
```

### 3.3 配置环境变量

Code3 项目包含多个子模块，每个模块都有自己的 `.env` 文件。下面是完整的配置指南。

#### 3.3.1 配置文件清单

| 文件路径 | 用途 | 必需 |
|---------|------|------|
| `task3/frontend/dashboard/.env` | Dashboard 前端配置 | ✅ 是 |
| `task3/adapters/spec-kit-mcp-adapter/.env` | MCP Adapter 配置（运行时） | ✅ 是 |
| `task3/adapters/spec-kit-mcp-adapter/.env.test` | MCP Adapter 测试配置 | ⚠️ 测试时 |
| `task3/bounty-operator/ethereum/.env.test` | Ethereum Operator 测试 | ⚠️ 测试时 |
| `task3/bounty-operator/ethereum/contract/.env` | Ethereum 合约部署 | ⚠️ 部署时 |
| `task3/bounty-operator/aptos/contract/.env.testnet` | Aptos 合约部署 | ⚠️ 部署时 |

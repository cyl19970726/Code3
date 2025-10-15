# 04 — 快速开始与部署

> 本文提供 Code3 项目的 5 分钟本地开发启动指南、合约部署流程与生产部署方案。
> 参考：[TRUTH.md](../../TRUTH.md) ADR-006/007/008/009（三大 MCP 架构）

---

## 1. 前置要求

| 工具 | 版本要求 | 安装命令 | 验证命令 |
|------|----------|----------|----------|
| Node.js | >= 20.0.0 | https://nodejs.org | `node --version` |
| pnpm | >= 8.0.0 | `npm install -g pnpm` | `pnpm --version` |
| Aptos CLI | >= 2.0.0 | `brew install aptos` (macOS) | `aptos --version` |
| Git | >= 2.40.0 | https://git-scm.com | `git --version` |
| Docker | >= 24.0.0 (生产部署) | https://docker.com | `docker --version` |

---

## 2. 本地开发（5 分钟启动）

### 2.1 克隆与初始化

```bash
# 克隆仓库
git clone https://github.com/cyl19970726/Code3.git
cd Code3

# 安装依赖
pnpm install

# 初始化开发环境
bash scripts/setup.sh
```

### 2.2 配置环境变量

创建 `.env.local`（参考 [.env.example](../../.env.example)）:

```env
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx            # Personal Access Token (repo scope)

# Aptos
APTOS_NETWORK=testnet                             # MVP: testnet only
APTOS_API_KEY=your_aptos_api_key                  # 从 https://aptos.dev 获取

# Worker 私钥（可选，用于自动化测试）
APTOS_PRIVATE_KEY=0x...

# Gas Station（可选）
APTOS_GAS_STATION_API_KEY=your_gas_station_key
```

**获取 APTOS_API_KEY**（参考 [09-security.md](./09-security.md)）:
1. 访问 https://aptos.dev
2. 创建 Organization + Project + Application
3. 复制 API Key

### 2.3 启动开发服务

```bash
# 终端 1: spec-kit-mcp（工作流工具）
pnpm --filter @code3/spec-kit-mcp dev

# 终端 2: aptos-chain-mcp（链上交互）
pnpm --filter @code3/aptos-mcp dev

# 终端 3: Dashboard（前端）
pnpm --filter @code3/frontend dev
# 访问 http://localhost:3000

# 终端 4: Webhook 后端
pnpm --filter @code3/backend dev
# 监听 http://localhost:3001/webhook
```

**注意**：github-mcp-server 使用官方外部 MCP，无需启动本地服务。

### 2.4 验证本地环境

```bash
# 检查环境变量
bash scripts/check_env.sh

# 运行单元测试
pnpm test

# Lint 检查
pnpm lint
```

---

## 3. 合约部署（Testnet）

### 3.1 准备钱包

```bash
# 创建新钱包（或使用现有钱包）
aptos init --network testnet

# 查看钱包地址
aptos account list

# 获取测试币（Testnet Faucet）
aptos account fund-with-faucet --account <YOUR_ADDRESS>
```

### 3.2 编译合约

**文件路径**: [Code3/task3/aptos/sources/bounty.move](../../task3/aptos/sources/bounty.move)

```bash
cd task3/aptos

# 编译合约
aptos move compile

# 运行 Move 单元测试
aptos move test
```

### 3.3 部署到 Testnet

```bash
# 使用部署脚本
bash scripts/deploy_testnet.sh

# 或手动部署
aptos move publish \
  --named-addresses code3=<YOUR_ADDRESS> \
  --assume-yes
```

**记录合约地址**（添加到环境变量）:
```env
APTOS_CONTRACT_ADDRESS=0x...
```

### 3.4 生成 ABI（供 TypeScript 使用）

```bash
# 生成并同步 ABI
bash scripts/generate_abi.sh

# 验证 ABI 文件
ls spec-mcp/aptos-mcp/src/contract/abi.ts
```

---

## 4. 端到端测试（本地 + Testnet）

### 4.1 发布任务（Requester）

**使用三大 MCP：spec-kit-mcp + github-mcp-server + aptos-chain-mcp**:

```bash
# 1. 创建 Spec（spec-kit-mcp）
# 在 Codex/Claude 中调用:
spec-kit-mcp.specify({
  feature: "web-ai-agent",
  context: "Web AI agent project management system"
})
# 输出: specs/003-web-ai-agent/spec.md

# 2. 发布到 GitHub（github-mcp-server）
github-mcp-server.create_issue({
  repo: "owner/repo",
  title: "Feature: Web AI Agent",
  body: "<spec 内容> + code3/v1 JSON 元数据"
})
# 输出: issue_url, issue_number, issue_hash

# 3. 创建链上赏金（aptos-chain-mcp）
aptos-chain-mcp.create_bounty({
  repo_url: "github.com/owner/repo",
  issue_hash: "sha256(...)",
  asset: "USDT",
  amount: "100"
})
# 输出: bounty_id

# 4. 回写 bounty_id 到 Issue（github-mcp-server）
github-mcp-server.update_issue({
  repo: "owner/repo",
  issue_number: 123,
  body: "<更新后的 spec + code3/v1 JSON（含 bounty_id）>"
})
```

### 4.2 接单（Worker）

**使用三大 MCP：aptos-chain-mcp + github-mcp-server + spec-kit-mcp**:

```bash
# 1. 接受赏金（aptos-chain-mcp）
aptos-chain-mcp.accept_bounty({
  bounty_id: "0x..."
})
# 输出: 链上交易确认

# 2. Fork 仓库（github-mcp-server）
github-mcp-server.fork({
  repo: "owner/repo"
})
# 输出: forked_repo_url

# 3. 生成计划与任务（spec-kit-mcp）
spec-kit-mcp.plan({
  spec_path: "specs/003-web-ai-agent/spec.md"
})
# 输出: specs/003-web-ai-agent/plan.md

spec-kit-mcp.tasks({
  plan_path: "specs/003-web-ai-agent/plan.md"
})
# 输出: specs/003-web-ai-agent/tasks.md

# 4. 澄清规格（可选但推荐）✨ spec-kit-mcp
spec-kit-mcp.clarify({
  spec_path: "specs/003-web-ai-agent/spec.md"
})
# 输出: 澄清问题列表（11 类检查）

# 5. 质量检查 ✨ spec-kit-mcp
spec-kit-mcp.analyze({
  spec_path: "specs/003-web-ai-agent/spec.md",
  plan_path: "specs/003-web-ai-agent/plan.md",
  tasks_path: "specs/003-web-ai-agent/tasks.md"
})
# 输出: 问题列表（6 类检测 + Constitution 合规性）

# 6. 执行任务 ✨ spec-kit-mcp（TDD 5 阶段）
spec-kit-mcp.implement({
  tasks_path: "specs/003-web-ai-agent/tasks.md",
  task_id: "task-001"
})
# 输出: 代码变更 + 测试通过报告

# 7. 创建 PR（github-mcp-server）
github-mcp-server.create_pr({
  repo: "owner/repo",
  head: "your-fork:feat/003-web-ai-agent",
  base: "main",
  title: "Implement: Web AI Agent",
  body: "Resolves #123\n\n完整实现 plan/tasks/code/tests"
})
# 输出: pr_url, pr_number

# 8. 链上记录 PR（aptos-chain-mcp）
aptos-chain-mcp.submit_pr({
  bounty_id: "0x...",
  pr_url: "https://github.com/owner/repo/pull/456"
})
# 输出: 链上交易确认
```

### 4.3 验收与结算（Reviewer + Worker）

```bash
# 1. Reviewer 在 GitHub 上合并 PR（github-mcp-server）
github-mcp-server.merge_pr({
  repo: "owner/repo",
  pr_number: 456
})
# → Webhook 自动触发 aptos-chain-mcp.mark_merged

# 2. 等待 7 天冷静期（CoolingDown）

# 3. Worker 领取赏金（aptos-chain-mcp）
aptos-chain-mcp.claim_payout({
  bounty_id: "0x..."
})
# 输出: 链上交易确认，赏金转账成功
```

### 4.4 Dashboard 验证

访问 http://localhost:3000:
- 查看任务列表（读取链上事件 + GitHub 元数据）
- 查看赏金详情（状态、冷静期倒计时）
- 查看 Issue/PR 链接

---

## 5. 生产部署

### 5.1 合约部署（Mainnet - M4）

```bash
# 切换到 Mainnet
aptos init --network mainnet

# 确保钱包有足够 APT（Gas 费用）
aptos account list

# 部署
bash scripts/deploy_mainnet.sh

# 记录 Mainnet 合约地址
APTOS_CONTRACT_ADDRESS_MAINNET=0x...
```

### 5.2 Dashboard 部署（Vercel）

**文件路径**: [Code3/task3/frontend/](../../task3/frontend/)

```bash
# 1. 连接 GitHub 仓库到 Vercel
# 访问 https://vercel.com/new

# 2. 配置环境变量（Vercel Dashboard）
NEXT_PUBLIC_APTOS_NETWORK=mainnet
NEXT_PUBLIC_APTOS_API_KEY=<YOUR_API_KEY>
NEXT_PUBLIC_APTOS_CONTRACT_ADDRESS=<MAINNET_ADDRESS>

# 3. 自动部署
git push origin main
# Vercel 自动触发构建与部署
```

### 5.3 Webhook 后端部署（Railway / Fly.io）

**文件路径**: [Code3/task3/backend/](../../task3/backend/)

#### 方案 A: Railway

```bash
# 1. 安装 Railway CLI
npm install -g @railway/cli

# 2. 登录
railway login

# 3. 初始化项目
cd task3/backend
railway init

# 4. 配置环境变量（Railway Dashboard）
GITHUB_WEBHOOK_SECRET=<SECRET>
APTOS_API_KEY=<KEY>
RESOLVER_PRIVATE_KEY=<KEY>    # 可选
REDIS_URL=<REDIS_URL>

# 5. 部署
railway up
```

#### 方案 B: Docker 容器化

```bash
# 构建镜像
docker build -t code3-backend -f task3/backend/Dockerfile .

# 运行容器
docker run -d \
  -p 3001:3000 \
  --env-file .env.production \
  --name code3-backend \
  code3-backend

# 查看日志
docker logs -f code3-backend
```

### 5.4 GitHub Webhook 配置

**仓库设置**:
1. 访问 `https://github.com/<owner>/<repo>/settings/hooks`
2. 点击 "Add webhook"
3. 配置:
   - Payload URL: `https://your-backend.railway.app/webhook`
   - Content type: `application/json`
   - Secret: `<GITHUB_WEBHOOK_SECRET>`
   - Events: `Pull requests`（选择 "Let me select individual events" → 勾选 "Pull requests"）
4. 保存

**验证 Webhook**:
```bash
# 触发测试 PR 合并
# 查看后端日志确认收到事件
```

---

## 6. 故障排查

### 6.1 常见问题

**问题 1: `GITHUB_TOKEN` 权限不足**

错误信息:
```
Error: Resource not accessible by integration
```

解决方案:
```bash
# 确保 Token 有 repo scope
# 重新生成: https://github.com/settings/tokens/new
# Scopes: repo, workflow
```

**问题 2: Aptos 交易失败**

错误信息:
```
Error: INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE
```

解决方案:
```bash
# Testnet: 使用 Faucet 获取测试币
aptos account fund-with-faucet --account <ADDRESS>

# Mainnet: 确保钱包有足够 APT
```

**问题 3: Webhook 未触发**

解决方案:
```bash
# 1. 检查 Webhook 日志（GitHub Repo Settings → Webhooks → Recent Deliveries）
# 2. 验证签名配置
# 3. 检查后端日志（Railway/Docker）
# 4. 手动测试:
curl -X POST https://your-backend.railway.app/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -d '{"action": "closed", "pull_request": {...}}'
```

**问题 4: 冷静期未结束无法领取**

错误信息:
```
Error: Cooling period not ended
```

解决方案:
```bash
# 检查 cooling_until 时间戳
# 等待至 cooling_until <= current_timestamp
# 或在测试时调整合约冷静期参数（Move.toml）
```

### 6.2 日志查看

**MCP Servers**:
```bash
# spec-kit-mcp 日志
pnpm --filter @code3/spec-kit-mcp dev

# aptos-chain-mcp 日志
pnpm --filter @code3/aptos-mcp dev

# github-mcp-server 日志（外部 MCP，查看 Claude/Codex 日志）
```

**Dashboard**:
```bash
# Next.js 日志
pnpm --filter @code3/frontend dev

# Vercel 生产日志
vercel logs <deployment-url>
```

**Webhook 后端**:
```bash
# 本地
pnpm --filter @code3/backend dev

# Docker
docker logs -f code3-backend

# Railway
railway logs
```

---

## 7. 开发工作流

### 7.1 日常开发循环

```bash
# 1. 创建功能分支
git checkout -b feat/new-feature

# 2. 启动开发环境
pnpm dev

# 3. 修改代码 + 单元测试
# ... 编辑文件 ...
pnpm test --filter <package-name>

# 4. Lint 检查
pnpm lint

# 5. 提交变更
git add .
git commit -m "feat: implement new feature"

# 6. 推送并创建 PR
git push origin feat/new-feature
# 在 GitHub 上创建 PR
```

### 7.2 合约开发循环

```bash
cd task3/aptos

# 1. 修改合约
# 编辑 sources/bounty.move

# 2. 编译
aptos move compile

# 3. 测试
aptos move test

# 4. 部署到 Testnet
bash scripts/deploy_testnet.sh

# 5. 生成 ABI 并同步
bash ../../scripts/generate_abi.sh

# 6. 提交变更
git add .
git commit -m "feat(contract): add new bounty feature"
```

---

## 8. 性能优化

### 8.1 本地开发优化

**使用 pnpm 缓存**:
```bash
# 清理缓存
pnpm store prune

# 重新安装依赖
pnpm install
```

**并行构建**:
```bash
# 利用多核 CPU 并行构建
pnpm build --parallel
```

### 8.2 生产优化

**Dashboard（Next.js）**:
- 启用 ISR（Incremental Static Regeneration）
- 配置 CDN 缓存（Vercel 自动）
- 使用 Image Optimization

**Webhook 后端**:
- Redis 缓存（幂等去重）
- 连接池复用（Aptos SDK 客户端）
- 异步队列处理（Bull/BullMQ）

---

## 9. 环境变量完整清单

参考 [.env.example](../../.env.example):

```env
# ===== GitHub =====
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# ===== Aptos =====
APTOS_NETWORK=testnet                             # testnet | mainnet
APTOS_API_KEY=your_aptos_api_key
APTOS_CONTRACT_ADDRESS=0x...

# MVP (M2/M3): 私钥签名
APTOS_PRIVATE_KEY=0x...                           # Worker 私钥
RESOLVER_PRIVATE_KEY=0x...                        # Resolver 私钥（可选）

# M4: Wallet Adapter（前端不需要私钥）
# APTOS_PRIVATE_KEY 留空

# Gas Station（可选）
APTOS_GAS_STATION_API_KEY=your_gas_station_key

# ===== Backend =====
REDIS_URL=redis://localhost:6379                  # 或 sqlite:./data/dedup.db
PORT=3000

# ===== Frontend (Next.js Public Env) =====
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_APTOS_API_KEY=your_aptos_api_key
NEXT_PUBLIC_APTOS_CONTRACT_ADDRESS=0x...
```

---

## 10. 参考

- 包结构与配置：[03-packages-structure.md](./03-packages-structure.md)
- 数据模型：[05-data-model.md](./05-data-model.md)
- MCP 工具契约：[06-interfaces.md](./06-interfaces.md)
- 安全策略：[09-security.md](./09-security.md)
- TRUTH.md ADR-006/007/008：[../../TRUTH.md](../../TRUTH.md)

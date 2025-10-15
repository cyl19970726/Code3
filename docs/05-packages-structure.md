# 05 — 包结构与目录组织

> 本文定义 Code3 系统的包结构、目录组织和模块依赖
> 参考：[TRUTH.md](../../TRUTH.md) ADR-012

---

## 1. 总体目录结构

```
Code3/
├── spec-mcp/                    # 工作流层（Workflow）
│   ├── spec-kit-mcp/           # 规范驱动工作流（7 个工具）
│   ├── aptos-mcp/              # Aptos 链交互工具（6 个工具）
│   └── observer-mcp/           # 观察者工作流（3 个工具）
│
├── task3/                       # 核心基础设施
│   ├── bounty-operator/        # 链上操作层
│   ├── data-operator/          # 数据操作层接口
│   ├── orchestration/          # 流程编排层
│   ├── adapters/               # 工作流适配器
│   ├── data-layers/            # 数据层实现
│   ├── frontend/               # Dashboard（React）
│   └── backend/                # Webhook 服务
│
└── workflows/                   # 工作流独立目录（旧版，待迁移）
    └── doing/                  # 当前开发环境
```

---

## 2. spec-mcp/ — 工作流层

### 2.1 spec-kit-mcp（规范驱动工作流）

**位置**：`Code3/spec-mcp/spec-kit-mcp/`

**定位**：功能规范的全生命周期管理工具

**目录结构**：
```
spec-kit-mcp/
├── src/
│   ├── server.ts               # MCP 服务器入口
│   ├── tools/                  # 7 个 MCP 工具
│   │   ├── specify.ts          # 创建功能规范
│   │   ├── analyze.ts          # 分析规范
│   │   ├── clarify.ts          # 澄清规范细节
│   │   ├── plan.ts             # 生成实施计划
│   │   ├── implement.ts        # 实施功能
│   │   ├── constitution.ts     # 管理规范章程
│   │   └── tasks.ts            # 任务管理
│   ├── prompts/                # 7 个提示词
│   └── types.ts                # 类型定义
├── package.json
└── tsconfig.json
```

**核心文件**：
- `server.ts` - 注册 7 个工具，启动 MCP 服务器
- `tools/*.ts` - 每个工具实现一个 MCP tool handler
- `prompts/*.ts` - 每个提示词实现一个 MCP prompt handler

**依赖**：
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0"
  }
}
```

**导出**：
```typescript
// src/index.ts
export { SpecKitServer } from './server.js';
export * from './types.js';
```

---

### 2.2 aptos-mcp（Aptos 链交互工具）

**位置**：`Code3/spec-mcp/aptos-mcp/`

**定位**：Aptos 链上操作的 MCP 工具封装

**目录结构**：
```
aptos-mcp/
├── src/
│   ├── server.ts               # MCP 服务器入口
│   ├── tools/                  # 6 个 MCP 工具
│   │   ├── view.ts             # 查询合约状态
│   │   ├── call.ts             # 调用合约方法
│   │   ├── transfer.ts         # 转账
│   │   ├── deploy.ts           # 部署合约
│   │   ├── account.ts          # 账户管理
│   │   └── faucet.ts           # 测试网水龙头
│   ├── client.ts               # Aptos 客户端封装
│   └── types.ts                # 类型定义
├── package.json
└── tsconfig.json
```

**核心文件**：
- `client.ts` - 封装 @aptos-labs/ts-sdk，提供统一接口
- `tools/*.ts` - 每个工具对应一个链上操作

**依赖**：
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@aptos-labs/ts-sdk": "^1.29.0"
  }
}
```

---

### 2.3 observer-mcp（观察者工作流）

**位置**：`Code3/spec-mcp/observer-mcp/`

**定位**：去中心化存储 + 观察者任务管理

**目录结构**：
```
observer-mcp/
├── src/
│   ├── server.ts               # MCP 服务器入口
│   ├── tools/                  # 3 个 MCP 工具
│   │   ├── upload-to-ipfs.ts  # 上传到 IPFS
│   │   ├── download-from-ipfs.ts # 从 IPFS 下载
│   │   └── create-observation-task.ts # 创建观察任务
│   └── types.ts                # 类型定义
├── package.json
└── tsconfig.json
```

**依赖**：
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "ipfs-http-client": "^60.0.0",
    "@octokit/rest": "^20.0.0"
  }
}
```

---

## 3. task3/ — 核心基础设施

### 3.1 bounty-operator/ — 链上操作层

**位置**：`Code3/task3/bounty-operator/`

**定位**：多链 Bounty 操作的统一接口与实现

**目录结构**：
```
bounty-operator/
├── interface.ts                # BountyOperator 接口（11 个方法）
├── types.ts                    # 共享类型（Bounty, BountyStatus）
├── package.json
│
├── aptos/                      # Aptos 实现
│   ├── contract/               # Aptos Move 合约
│   │   ├── sources/
│   │   │   └── bounty.move    # Bounty 合约
│   │   ├── Move.toml
│   │   └── scripts/
│   │       └── deploy.sh      # 部署脚本
│   ├── src/
│   │   ├── bounty-operator.ts # AptosBountyOperator 实现
│   │   ├── client.ts          # Aptos 客户端封装
│   │   ├── types.ts           # Aptos 特定类型
│   │   └── index.ts           # 导出
│   ├── tests/
│   │   └── bounty-operator.test.ts
│   ├── package.json
│   └── tsconfig.json
│
└── ethereum/                   # Ethereum 实现（ADR-012-C）
    ├── contract/               # Solidity 合约
    │   ├── contracts/
    │   │   └── BountyManager.sol
    │   ├── hardhat.config.ts
    │   └── scripts/
    │       └── deploy.ts
    ├── src/
    │   ├── bounty-operator.ts # EthereumBountyOperator 实现
    │   ├── client.ts          # ethers.js 封装
    │   ├── types.ts
    │   └── index.ts
    ├── tests/
    │   └── bounty-operator.test.ts
    ├── package.json
    └── tsconfig.json
```

**接口定义**：`interface.ts`
```typescript
export interface BountyOperator {
  // 写入操作（6 个）
  createBounty(params: CreateBountyParams): Promise<CreateBountyResult>;
  acceptBounty(params: AcceptBountyParams): Promise<AcceptBountyResult>;
  submitBounty(params: SubmitBountyParams): Promise<SubmitBountyResult>;
  confirmBounty(params: ConfirmBountyParams): Promise<ConfirmBountyResult>;
  claimPayout(params: ClaimPayoutParams): Promise<ClaimPayoutResult>;
  cancelBounty(params: CancelBountyParams): Promise<CancelBountyResult>;

  // 查询操作（5 个）
  getBounty(params: GetBountyParams): Promise<Bounty>;
  getBountyByTaskHash(params: GetBountyByTaskHashParams): Promise<GetBountyByTaskHashResult>;
  listBounties(params?: ListBountiesParams): Promise<ListBountiesResult>;
  getBountiesBySponsor(params: GetBountiesBySponsorParams): Promise<GetBountiesBySponsorResult>;
  getBountiesByWorker(params: GetBountiesByWorkerParams): Promise<GetBountiesByWorkerResult>;
}
```

**详细接口定义**：见 [02-interfaces.md Section 2](./02-interfaces.md#2-bountyoperator-接口)

**package.json 示例**（aptos/）：
```json
{
  "name": "@code3-team/bounty-operator-aptos",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "dependencies": {
    "@aptos-labs/ts-sdk": "^1.29.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

### 3.2 data-operator/ — 数据操作层接口

**位置**：`Code3/task3/data-operator/`

**定位**：任务数据操作的统一接口（由 adapter 实现）

**目录结构**：
```
data-operator/
├── interface.ts                # DataOperator 接口（5 个方法）
├── types.ts                    # 共享类型（TaskMetadata）
└── package.json
```

**接口定义**：`interface.ts`
```typescript
export interface DataOperator {
  // 任务数据操作（5 个方法）
  uploadTaskData(params: UploadTaskDataParams): Promise<UploadTaskDataResult>;
  downloadTaskData(params: DownloadTaskDataParams): Promise<DownloadTaskDataResult>;
  uploadSubmission(params: UploadSubmissionParams): Promise<UploadSubmissionResult>;
  getTaskMetadata(params: GetTaskMetadataParams): Promise<TaskMetadata>;
  updateTaskMetadata(params: UpdateTaskMetadataParams): Promise<UpdateTaskMetadataResult>;
}
```

**详细接口定义**：见 [02-interfaces.md Section 3](./02-interfaces.md#3-dataoperator-接口)

**特点**：
- ✅ 接口与数据层无关（不包含 GitHub/IPFS 等具体概念）
- ✅ 由 adapter 实现（spec-kit-adapter, observer-adapter）
- ✅ 轻量级（只定义接口和类型，无具体实现）

---

### 3.3 orchestration/ — 流程编排层

**位置**：`Code3/task3/orchestration/`

**定位**：完整业务流程编排（5 个 flow）

**目录结构**：
```
orchestration/
├── src/
│   ├── publish-flow.ts         # 发布流程（幂等性检查）
│   ├── accept-flow.ts          # 接单流程（状态验证）
│   ├── submit-flow.ts          # 提交流程（上传提交内容）
│   ├── confirm-flow.ts         # 确认流程（进入冷静期）
│   ├── claim-flow.ts           # 领取流程（冷静期验证）
│   └── index.ts                # 导出所有流程
├── tests/
│   ├── publish-flow.test.ts
│   ├── accept-flow.test.ts
│   ├── submit-flow.test.ts
│   ├── confirm-flow.test.ts
│   └── claim-flow.test.ts
├── interface.ts                # Task3Operator 接口
├── types.ts                    # 流程参数和结果类型
├── package.json
└── tsconfig.json
```

**核心流程**：
```typescript
// src/index.ts
export { publishFlow } from './publish-flow.js';
export { acceptFlow } from './accept-flow.js';
export { submitFlow } from './submit-flow.js';
export { confirmFlow } from './confirm-flow.js';
export { claimFlow } from './claim-flow.js';
```

**详细流程定义**：见 [04-datastream.md](./04-datastream.md)

**依赖注入示例**：
```typescript
// publish-flow.ts
import type { BountyOperator } from '../bounty-operator/interface.js';
import type { DataOperator } from '../data-operator/interface.js';

export async function publishFlow(params: {
  dataOperator: DataOperator;    // 依赖注入
  bountyOperator: BountyOperator; // 依赖注入
  taskData: any;
  metadata: TaskMetadata;
  amount: string;
  asset: string;
}): Promise<PublishFlowResult> {
  // 1. 计算 taskHash（幂等性）
  // 2. 检查 bounty 是否已存在
  // 3. 上传任务数据
  // 4. 创建链上 bounty
  // 5. 更新任务元数据
}
```

---

### 3.4 adapters/ — 工作流适配器

**位置**：`Code3/task3/adapters/`

**定位**：连接 workflow（MCP 工具）与 task3 基础设施

**目录结构**：
```
adapters/
├── spec-kit-adapter/           # spec-kit-mcp 适配器
│   ├── src/
│   │   ├── server.ts           # MCP 服务器（4 个工具）
│   │   ├── data-operator.ts    # SpecKitDataOperator 实现
│   │   ├── tools/
│   │   │   ├── publish-bounty.ts
│   │   │   ├── accept-bounty.ts
│   │   │   ├── submit-bounty.ts
│   │   │   └── claim-bounty.ts
│   │   └── types.ts
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
└── observer-adapter/           # observer-mcp 适配器
    ├── src/
    │   ├── server.ts           # MCP 服务器（4 个工具）
    │   ├── data-operator.ts    # ObserverDataOperator 实现
    │   └── tools/
    ├── package.json
    └── tsconfig.json
```

**spec-kit-adapter 示例**：
```typescript
// src/data-operator.ts
import type { DataOperator } from '@code3-team/data-operator';
import { GitHubDataLayer } from '@code3-team/data-layers-github';

export class SpecKitDataOperator implements DataOperator {
  constructor(private github: GitHubDataLayer) {}

  async uploadTaskData(params: UploadTaskDataParams): Promise<UploadTaskDataResult> {
    // 1. 读取本地 specs/{id}/spec.md
    // 2. 调用 github.createIssue()
    // 3. 写入 metadata 到 Issue body
    return { taskUrl, taskId };
  }

  async downloadTaskData(params: DownloadTaskDataParams): Promise<DownloadTaskDataResult> {
    // 1. 调用 github.getIssue(taskUrl)
    // 2. 解析 metadata
    // 3. 写入本地 specs/{id}/spec.md
    return { taskData, localPath };
  }

  // ... 其他 3 个方法
}
```

**依赖**：
```json
{
  "dependencies": {
    "@code3-team/orchestration": "workspace:*",
    "@code3-team/bounty-operator-aptos": "workspace:*",
    "@code3-team/data-operator": "workspace:*",
    "@code3-team/data-layers-github": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

---

### 3.5 data-layers/ — 数据层实现

**位置**：`Code3/task3/data-layers/`

**定位**：数据存储的具体实现（GitHub, IPFS, Arweave）

**目录结构**：
```
data-layers/
├── github/                     # GitHub 数据层
│   ├── src/
│   │   ├── create-issue.ts    # 创建 Issue
│   │   ├── get-issue.ts       # 获取 Issue
│   │   ├── update-issue.ts    # 更新 Issue
│   │   ├── create-pr.ts       # 创建 PR
│   │   ├── client.ts          # Octokit 客户端
│   │   ├── metadata.ts        # code3/v2 metadata 处理
│   │   └── index.ts           # 导出
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
├── ipfs/                       # IPFS 数据层（未来）
│   └── ...
│
└── arweave/                    # Arweave 数据层（未来）
    └── ...
```

**github/ 核心文件**：
```typescript
// src/index.ts
export { GitHubDataLayer } from './client.js';
export { createIssue } from './create-issue.js';
export { getIssue } from './get-issue.js';
export { updateIssue } from './update-issue.js';
export { createPR } from './create-pr.js';
export * from './types.js';
```

**使用示例**：
```typescript
import { GitHubDataLayer } from '@code3-team/data-layers-github';

const github = new GitHubDataLayer({
  token: process.env.GITHUB_TOKEN,
  repo: 'owner/repo'
});

// 创建 Issue
const issue = await github.createIssue({
  title: 'New Task',
  body: metadata // code3/v2 JSON
});

// 更新 Issue
await github.updateIssue({
  issueUrl: issue.url,
  metadata: { bounty: { bountyId: '123' } }
});
```

**依赖**：
```json
{
  "dependencies": {
    "@octokit/rest": "^20.0.0",
    "yaml": "^2.3.0"
  }
}
```

---

### 3.6 frontend/ — Dashboard

**位置**：`Code3/task3/frontend/`

**定位**：用户界面（Bounty 列表、详情、发布、接单）

**目录结构**：
```
frontend/
├── app/                        # Next.js 14 App Router
│   ├── page.tsx               # 首页（Bounty 列表）
│   ├── bounty/
│   │   └── [id]/
│   │       └── page.tsx       # Bounty 详情页
│   ├── publish/
│   │   └── page.tsx           # 发布 Bounty
│   └── layout.tsx
├── components/
│   ├── BountyCard.tsx
│   ├── BountyList.tsx
│   ├── PublishForm.tsx
│   └── WalletConnect.tsx
├── lib/
│   ├── aptos.ts               # Aptos 钱包连接
│   ├── ethereum.ts            # Ethereum 钱包连接
│   └── api.ts                 # Backend API 调用
├── public/
├── package.json
└── next.config.js
```

**技术栈**：
- Next.js 14+ (App Router)
- React Server Components
- TailwindCSS
- @aptos-labs/wallet-adapter-react
- wagmi (Ethereum 钱包)

---

### 3.7 backend/ — Webhook 服务

**位置**：`Code3/task3/backend/`

**定位**：GitHub Webhook + 区块链事件监听 + 索引

**目录结构**：
```
backend/
├── src/
│   ├── server.ts               # Express 服务器
│   ├── routes/
│   │   ├── webhook.ts          # GitHub Webhook 处理
│   │   └── api.ts              # REST API
│   ├── indexer/
│   │   ├── aptos-indexer.ts    # Aptos 事件监听
│   │   └── ethereum-indexer.ts # Ethereum 事件监听
│   ├── db/
│   │   ├── schema.ts           # PostgreSQL schema
│   │   └── queries.ts          # 查询函数
│   └── index.ts
├── package.json
└── tsconfig.json
```

**核心功能**：
```typescript
// routes/webhook.ts
app.post('/webhook/github', async (req, res) => {
  const event = req.body;

  if (event.action === 'closed' && event.pull_request.merged) {
    // 触发 confirmFlow
    await handlePRMerged(event);
  }
});

// indexer/aptos-indexer.ts
client.on('BountyCreated', async (event) => {
  // 更新数据库索引
  await db.bounties.insert({
    bountyId: event.bountyId,
    taskId: event.taskId,
    status: 'Open'
  });
});
```

---

## 4. 模块依赖关系

### 4.1 依赖层级

```
┌─────────────────────────────────────────────────────────┐
│                 spec-mcp/ (工作流层)                    │
│  - spec-kit-mcp, aptos-mcp, observer-mcp               │
│  (独立运行，不依赖 task3/)                              │
└─────────────────────────────────────────────────────────┘
                            ↓ 依赖
┌─────────────────────────────────────────────────────────┐
│            task3/adapters/ (适配器层)                   │
│  - spec-kit-adapter, observer-adapter                   │
│  (依赖: orchestration, bounty-operator, data-operator)  │
└─────────────────────────────────────────────────────────┘
                            ↓ 依赖
┌─────────────────────────────────────────────────────────┐
│         task3/orchestration/ (编排层)                   │
│  - publishFlow, acceptFlow, submitFlow, ...             │
│  (依赖: bounty-operator, data-operator 接口)            │
└─────────────────────────────────────────────────────────┘
                   ↓ 依赖          ↓ 依赖
┌──────────────────────────┐  ┌──────────────────────────┐
│ task3/bounty-operator/   │  │ task3/data-layers/       │
│ - aptos/, ethereum/      │  │ - github/, ipfs/         │
│ (实现 BountyOperator)    │  │ (被 adapter 调用)        │
└──────────────────────────┘  └──────────────────────────┘
```

### 4.2 导入路径示例

**adapter 导入 orchestration**：
```typescript
// task3/adapters/spec-kit-adapter/src/tools/publish-bounty.ts
import { publishFlow } from '@code3-team/orchestration';
import { AptosBountyOperator } from '@code3-team/bounty-operator-aptos';
import { SpecKitDataOperator } from '../data-operator.js';
import { GitHubDataLayer } from '@code3-team/data-layers-github';
```

**orchestration 导入接口**：
```typescript
// task3/orchestration/src/publish-flow.ts
import type { BountyOperator } from '@code3-team/bounty-operator';
import type { DataOperator } from '@code3-team/data-operator';
```

**bounty-operator/aptos 导入接口**：
```typescript
// task3/bounty-operator/aptos/src/bounty-operator.ts
import type { BountyOperator, CreateBountyParams } from '../../interface.js';
```

---

## 5. 包管理与构建

### 5.1 Monorepo 结构（npm workspaces）

**根目录 package.json**：
```json
{
  "name": "code3-monorepo",
  "private": true,
  "workspaces": [
    "Code3/spec-mcp/*",
    "Code3/task3/bounty-operator",
    "Code3/task3/bounty-operator/aptos",
    "Code3/task3/bounty-operator/ethereum",
    "Code3/task3/data-operator",
    "Code3/task3/orchestration",
    "Code3/task3/adapters/*",
    "Code3/task3/data-layers/*",
    "Code3/task3/frontend",
    "Code3/task3/backend"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

### 5.2 包命名规范

**组织前缀**：`@code3-team/`

**命名规则**：
- `@code3-team/spec-kit-mcp` - 工作流层
- `@code3-team/aptos-mcp` - 工作流层
- `@code3-team/bounty-operator` - 接口包
- `@code3-team/bounty-operator-aptos` - 实现包
- `@code3-team/orchestration` - 编排层
- `@code3-team/data-operator` - 接口包
- `@code3-team/data-layers-github` - 数据层实现
- `@code3-team/spec-kit-adapter` - 适配器

### 5.3 TypeScript 配置

**根 tsconfig.json**：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**子包继承**：
```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

---

## 6. 文件命名规范

### 6.1 TypeScript 文件

**命名风格**：kebab-case

**示例**：
- ✅ `publish-flow.ts`
- ✅ `bounty-operator.ts`
- ✅ `data-operator.ts`
- ❌ `PublishFlow.ts`（不使用 PascalCase）
- ❌ `bounty_operator.ts`（不使用 snake_case）

### 6.2 目录命名

**命名风格**：kebab-case

**示例**：
- ✅ `spec-kit-mcp/`
- ✅ `bounty-operator/`
- ✅ `data-layers/`
- ❌ `SpecKitMcp/`
- ❌ `bounty_operator/`

### 6.3 测试文件

**命名规则**：`<module>.test.ts`

**示例**：
- ✅ `publish-flow.test.ts`
- ✅ `bounty-operator.test.ts`
- ❌ `publish-flow.spec.ts`（统一使用 .test.ts）

---

## 7. 导入导出规范

### 7.1 导出规范

**使用 Named Export**（不使用 Default Export）：
```typescript
// ✅ 推荐
export class AptosBountyOperator implements BountyOperator { }
export function publishFlow(params: PublishFlowParams) { }
export interface BountyOperator { }

// ❌ 不推荐
export default class AptosBountyOperator { }
```

**index.ts 统一导出**：
```typescript
// src/index.ts
export { AptosBountyOperator } from './bounty-operator.js';
export { AptosClient } from './client.js';
export * from './types.js';
```

### 7.2 导入规范

**导入顺序**：
```typescript
// 1. Node.js 内置模块
import fs from 'fs';
import path from 'path';

// 2. 外部依赖
import { Aptos } from '@aptos-labs/ts-sdk';
import { Octokit } from '@octokit/rest';

// 3. workspace 内部依赖
import { publishFlow } from '@code3-team/orchestration';
import type { BountyOperator } from '@code3-team/bounty-operator';

// 4. 相对路径导入
import { SpecKitDataOperator } from './data-operator.js';
import type { SpecKitToolParams } from './types.js';
```

**使用 .js 扩展名**（ESM 要求）：
```typescript
// ✅ 正确
import { publishFlow } from './publish-flow.js';

// ❌ 错误
import { publishFlow } from './publish-flow';
```

---

## 8. 包版本管理

### 8.1 版本号规范

**Semantic Versioning**：`MAJOR.MINOR.PATCH`

**初始版本**：
- 接口包（`@code3-team/bounty-operator`, `@code3-team/data-operator`）：`1.0.0`
- 实现包（`@code3-team/bounty-operator-aptos`）：`1.0.0`
- 适配器（`@code3-team/spec-kit-adapter`）：`0.1.0`（实验阶段）

### 8.2 依赖版本管理

**workspace 内部依赖**：
```json
{
  "dependencies": {
    "@code3-team/orchestration": "workspace:*"
  }
}
```

**外部依赖版本锁定**：
```json
{
  "dependencies": {
    "@aptos-labs/ts-sdk": "^1.29.0",
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

---

## 9. 扩展性设计

### 9.1 新增链

**步骤**：
1. 在 `task3/bounty-operator/` 下创建新目录（如 `sui/`）
2. 实现 `BountyOperator` 接口
3. 编写合约并部署
4. adapter 中切换 bountyOperator 实例

**无需修改**：
- `orchestration/`（流程编排层）
- `data-operator/`（数据操作层）
- 其他链的实现

### 9.2 新增数据层

**步骤**：
1. 在 `task3/data-layers/` 下创建新目录（如 `ipfs/`）
2. 实现 IPFS 客户端封装
3. adapter 中使用新的 data layer

**无需修改**：
- `orchestration/`
- `bounty-operator/`

### 9.3 新增工作流

**步骤**：
1. 在 `spec-mcp/` 下创建新 workflow（如 `code-review-mcp/`）
2. 在 `task3/adapters/` 下创建新 adapter（如 `code-review-adapter/`）
3. adapter 实现 `DataOperator` 接口
4. 暴露 MCP 工具

**无需修改**：
- `orchestration/`
- `bounty-operator/`
- 其他 workflow/adapter

---

## 10. 参考

- **接口定义**：[02-interfaces.md](./02-interfaces.md)
- **架构设计**：[03-architecture.md](./03-architecture.md)
- **数据流**：[04-datastream.md](./04-datastream.md)
- **ADR-012**：[TRUTH.md](../../TRUTH.md) ADR-012

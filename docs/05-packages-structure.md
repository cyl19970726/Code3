# 05 — 包结构与模块设计

> 本文定义 Code3 系统的包结构、模块依赖和 TypeScript 配置规范
> 参考：[TRUTH.md](../../TRUTH.md) ADR-012

---

## 1. 包结构总览

```
Code3/
├── spec-mcp/                    # MCP 工作流层（独立运行）
│   ├── spec-kit-mcp/           # 规范驱动工作流（7 个工具）
│   ├── aptos-mcp/              # Aptos 链交互工具（6 个工具）
│   └── observer-mcp/           # 观察者工作流（3 个工具）
│
└── task3/                       # 核心基础设施
    ├── bounty-operator/        # 链上操作层（接口 + 多链实现）
    ├── data-operator/          # 数据操作层接口
    ├── orchestration/          # 流程编排层（5 个 flow）
    ├── adapters/               # 工作流适配器
    ├── data-layers/            # 数据层实现（GitHub, IPFS, Arweave）
    ├── frontend/               # Dashboard（Next.js）
    └── backend/                # Webhook + 索引服务
```

---

## 2. 核心包设计

### 2.1 bounty-operator/ — 多链 Bounty 操作

**位置**：`Code3/task3/bounty-operator/`

**包名**：`@code3-team/bounty-operator`（接口包）

**设计原则**：
- ✅ 接口与实现分离
- ✅ 多链统一接口（11 个方法）
- ✅ 每条链独立实现（Aptos, Ethereum）

**目录结构**：
```
bounty-operator/
├── interface.ts                # BountyOperator 接口（11 个方法）
├── types.ts                    # 共享类型（Bounty, BountyStatus）
├── index.ts                    # 导出接口和类型
├── package.json                # @code3-team/bounty-operator
│
├── aptos/                      # Aptos 实现
│   ├── contract/               # Move 合约
│   │   ├── sources/bounty.move
│   │   ├── Move.toml
│   │   └── scripts/deploy.sh
│   ├── src/
│   │   ├── aptos-bounty-operator.ts  # AptosBountyOperator 实现
│   │   ├── client.ts           # @aptos-labs/ts-sdk 封装
│   │   ├── types.ts            # Aptos 特定类型
│   │   └── index.ts            # 导出
│   ├── package.json            # @code3-team/bounty-operator-aptos
│   └── tsconfig.json
│
└── ethereum/                   # Ethereum 实现
    ├── contract/               # Solidity 合约
    │   ├── contracts/BountyManager.sol
    │   ├── hardhat.config.ts
    │   └── scripts/deploy.ts
    ├── src/
    │   ├── ethereum-bounty-operator.ts  # EthereumBountyOperator 实现
    │   ├── client.ts           # ethers.js v6 封装
    │   ├── types.ts
    │   └── index.ts
    ├── package.json            # @code3-team/bounty-operator-ethereum
    └── tsconfig.json
```

**接口定义**（interface.ts）：
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

**package.json 示例**：
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
  }
}
```

---

### 2.2 data-operator/ — 数据操作层接口

**位置**：`Code3/task3/data-operator/`

**包名**：`@code3-team/data-operator`（纯接口包）

**设计原则**：
- ✅ 接口与数据层无关（不包含 GitHub/IPFS 等具体概念）
- ✅ 由 adapter 实现（spec-kit-adapter, observer-adapter）
- ✅ 轻量级（只定义接口和类型）

**目录结构**：
```
data-operator/
├── interface.ts                # DataOperator 接口（5 个方法）
├── types.ts                    # 共享类型（TaskMetadata）
├── index.ts                    # 导出
└── package.json                # @code3-team/data-operator
```

**接口定义**（interface.ts）：
```typescript
export interface DataOperator {
  uploadTaskData(params: UploadTaskDataParams): Promise<UploadTaskDataResult>;
  downloadTaskData(params: DownloadTaskDataParams): Promise<DownloadTaskDataResult>;
  uploadSubmission(params: UploadSubmissionParams): Promise<UploadSubmissionResult>;
  getTaskMetadata(params: GetTaskMetadataParams): Promise<TaskMetadata>;
  updateTaskMetadata(params: UpdateTaskMetadataParams): Promise<UpdateTaskMetadataResult>;
}
```

**详细接口定义**：见 [02-interfaces.md Section 3](./02-interfaces.md#3-dataoperator-接口)

---

### 2.3 orchestration/ — 流程编排层

**位置**：`Code3/task3/orchestration/`

**包名**：`@code3-team/orchestration`

**设计原则**：
- ✅ 纯业务逻辑（无 workflow 依赖）
- ✅ 依赖注入（dataOperator + bountyOperator）
- ✅ 幂等性设计（通过 taskHash 查重）

**目录结构**：
```
orchestration/
├── src/
│   ├── task3-operator.ts       # Task3Operator 抽象类（5 个 flow）
│   └── index.ts                # 导出
├── types.ts                    # 流程参数和结果类型
├── package.json                # @code3-team/orchestration
└── tsconfig.json
```

**核心流程**：
```typescript
export abstract class Task3Operator {
  async publishFlow(params: PublishFlowParams): Promise<PublishFlowResult>;
  async acceptFlow(params: AcceptFlowParams): Promise<AcceptFlowResult>;
  async submitFlow(params: SubmitFlowParams): Promise<SubmitFlowResult>;
  async confirmFlow(params: ConfirmFlowParams): Promise<ConfirmFlowResult>;
  async claimFlow(params: ClaimFlowParams): Promise<ClaimFlowResult>;
}
```

**详细流程定义**：见 [04-datastream.md](./04-datastream.md)

**依赖注入示例**：
```typescript
// orchestration/src/task3-operator.ts
import type { BountyOperator } from '@code3-team/bounty-operator';
import type { DataOperator } from '@code3-team/data-operator';

export abstract class Task3Operator {
  async publishFlow(params: {
    dataOperator: DataOperator;      // 依赖注入
    bountyOperator: BountyOperator;  // 依赖注入
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
}
```

---

### 2.4 adapters/ — 工作流适配器

**位置**：`Code3/task3/adapters/`

**设计原则**：
- ✅ 连接 workflow（MCP 工具）与 task3 基础设施
- ✅ 实现 DataOperator 接口
- ✅ 暴露 4 个 MCP 工具（publish/accept/submit/claim）

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
│   ├── package.json            # @code3-team/spec-kit-mcp-adapter
│   └── tsconfig.json
│
└── observer-adapter/           # observer-mcp 适配器
    ├── src/
    │   ├── server.ts           # MCP 服务器（4 个工具）
    │   ├── data-operator.ts    # ObserverDataOperator 实现
    │   └── tools/
    ├── package.json            # @code3-team/observer-mcp-adapter
    └── tsconfig.json
```

**SpecKitDataOperator 实现示例**：
```typescript
// src/data-operator.ts
import type { DataOperator } from '@code3-team/data-operator';
import { GitHubDataLayer } from '@code3-team/data-layers-github';

export class SpecKitDataOperator implements DataOperator {
  constructor(private github: GitHubDataLayer) {}

  async uploadTaskData(params: UploadTaskDataParams): Promise<UploadTaskDataResult> {
    // 1. 读取本地 specs/{id}/spec.md
    // 2. 调用 github.createIssue()
    // 3. 写入 metadata 到 Issue body（code3/v2 格式）
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

**依赖**（package.json）：
```json
{
  "dependencies": {
    "@code3-team/orchestration": "workspace:*",
    "@code3-team/bounty-operator-aptos": "workspace:*",
    "@code3-team/bounty-operator-ethereum": "workspace:*",
    "@code3-team/data-operator": "workspace:*",
    "@code3-team/data-layers-github": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

---

### 2.5 data-layers/ — 数据层实现

**位置**：`Code3/task3/data-layers/`

**设计原则**：
- ✅ 数据存储的具体实现（GitHub, IPFS, Arweave）
- ✅ 被 adapter 调用
- ✅ 独立包（可替换）

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
│   ├── package.json           # @code3-team/data-layers-github
│   └── tsconfig.json
│
├── ipfs/                       # IPFS 数据层（未来）
└── arweave/                    # Arweave 数据层（未来）
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

---

## 3. 模块依赖关系

### 3.1 依赖层级

```
┌─────────────────────────────────────────────┐
│       spec-mcp/ (MCP 工作流层)              │
│  独立运行，不依赖 task3/                     │
└─────────────────────────────────────────────┘
                    ↓ 依赖
┌─────────────────────────────────────────────┐
│      task3/adapters/ (适配器层)             │
│  依赖: orchestration, bounty-operator,      │
│       data-operator, data-layers            │
└─────────────────────────────────────────────┘
                    ↓ 依赖
┌─────────────────────────────────────────────┐
│    task3/orchestration/ (编排层)            │
│  依赖: bounty-operator 接口,                │
│       data-operator 接口                    │
└─────────────────────────────────────────────┘
          ↓ 依赖            ↓ 依赖
┌────────────────────┐  ┌─────────────────────┐
│ bounty-operator/   │  │ data-layers/        │
│ - aptos/           │  │ - github/           │
│ - ethereum/        │  │ - ipfs/             │
│ (实现接口)         │  │ (被 adapter 调用)   │
└────────────────────┘  └─────────────────────┘
```

### 3.2 导入路径示例

**adapter 导入 orchestration**：
```typescript
// task3/adapters/spec-kit-adapter/src/tools/publish-bounty.ts
import { Task3Operator } from '@code3-team/orchestration';
import { AptosBountyOperator } from '@code3-team/bounty-operator-aptos';
import { SpecKitDataOperator } from '../data-operator.js';
import { GitHubDataLayer } from '@code3-team/data-layers-github';
```

**orchestration 导入接口**：
```typescript
// task3/orchestration/src/task3-operator.ts
import type { BountyOperator } from '@code3-team/bounty-operator';
import type { DataOperator } from '@code3-team/data-operator';
import { BountyStatus } from '@code3-team/bounty-operator';
```

**bounty-operator/aptos 导入接口**：
```typescript
// task3/bounty-operator/aptos/src/aptos-bounty-operator.ts
import type { BountyOperator, CreateBountyParams } from '@code3-team/bounty-operator';
```

---

## 4. TypeScript 配置规范

### 4.1 统一配置

**所有包必须使用**：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**关键配置说明**：
- `"module": "Node16"` + `"moduleResolution": "Node16"` — **必须配对使用**
- 这是 Node.js ES Module 的正确配置
- **不要使用** `"moduleResolution": "bundler"`（那是给 Vite/Webpack 用的）

### 4.2 导入规范

**必须使用 `.js` 扩展名**（ES Module 要求）：

```typescript
// ✅ 正确
import { publishFlow } from './publish-flow.js';
import { BountyStatus } from '@code3-team/bounty-operator';

// ❌ 错误
import { publishFlow } from './publish-flow';
```

**导入顺序**：
```typescript
// 1. Node.js 内置模块
import crypto from 'crypto';

// 2. 外部依赖
import { Aptos } from '@aptos-labs/ts-sdk';

// 3. workspace 内部依赖
import { Task3Operator } from '@code3-team/orchestration';
import type { BountyOperator } from '@code3-team/bounty-operator';

// 4. 相对路径导入
import { SpecKitDataOperator } from './data-operator.js';
```

---

## 5. 包管理

### 5.1 包命名规范

**组织前缀**：`@code3-team/`

**命名规则**：
- `@code3-team/spec-kit-mcp` — MCP 工作流层
- `@code3-team/bounty-operator` — 接口包
- `@code3-team/bounty-operator-aptos` — 实现包
- `@code3-team/orchestration` — 编排层
- `@code3-team/data-operator` — 接口包
- `@code3-team/data-layers-github` — 数据层实现
- `@code3-team/spec-kit-mcp-adapter` — 适配器

### 5.2 Monorepo 结构（pnpm workspaces）

**根目录 pnpm-workspace.yaml**：
```yaml
packages:
  - 'Code3/spec-mcp/*'
  - 'Code3/task3/bounty-operator'
  - 'Code3/task3/bounty-operator/aptos'
  - 'Code3/task3/bounty-operator/ethereum'
  - 'Code3/task3/data-operator'
  - 'Code3/task3/orchestration'
  - 'Code3/task3/adapters/*'
  - 'Code3/task3/data-layers/*'
  - 'Code3/task3/frontend'
  - 'Code3/task3/backend'
```

### 5.3 workspace 内部依赖

**使用 `workspace:*`**：
```json
{
  "dependencies": {
    "@code3-team/orchestration": "workspace:*",
    "@code3-team/bounty-operator-aptos": "workspace:*"
  }
}
```

---

## 6. 扩展性设计

### 6.1 新增链

**步骤**：
1. 在 `task3/bounty-operator/` 下创建新目录（如 `sui/`）
2. 实现 `BountyOperator` 接口
3. 编写合约并部署
4. adapter 中切换 bountyOperator 实例

**无需修改**：
- `orchestration/`
- `data-operator/`
- 其他链的实现

### 6.2 新增数据层

**步骤**：
1. 在 `task3/data-layers/` 下创建新目录（如 `ipfs/`）
2. 实现 IPFS 客户端封装
3. adapter 中使用新的 data layer

**无需修改**：
- `orchestration/`
- `bounty-operator/`

### 6.3 新增工作流

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

## 7. 常见问题

### 7.1 为什么模块找不到？

**错误**：`Error [ERR_MODULE_NOT_FOUND]: Cannot find module './file'`

**原因**：
1. 使用了 `"moduleResolution": "bundler"`（错误配置）
2. 导入时没有加 `.js` 扩展名

**解决**：
1. 修改 `tsconfig.json` 为 `"moduleResolution": "Node16"`
2. 修改 `tsconfig.json` 为 `"module": "Node16"`
3. 所有相对路径导入加上 `.js` 扩展名

### 7.2 为什么 TypeScript 编译报错 TS5110？

**错误**：`Option 'module' must be set to 'Node16' when option 'moduleResolution' is set to 'Node16'`

**原因**：`moduleResolution` 和 `module` 必须配对

**解决**：
```json
{
  "compilerOptions": {
    "module": "Node16",           // ← 必须是 Node16
    "moduleResolution": "Node16"  // ← 必须配对
  }
}
```

### 7.3 如何验证配置正确？

**测试步骤**：
```bash
# 1. 构建所有包
pnpm run build

# 2. 测试模块加载
node -e "import('./dist/index.js').then(m => console.log('✅ OK:', Object.keys(m)))"

# 3. 测试 MCP Server 启动
node dist/src/server.js
```

**成功标志**：
- ✅ 构建无错误
- ✅ 模块加载成功
- ✅ 错误信息不是 `ERR_MODULE_NOT_FOUND`

---

## 8. 参考

- **接口定义**：[02-interfaces.md](./02-interfaces.md)
- **架构设计**：[03-architecture.md](./03-architecture.md)
- **数据流**：[04-datastream.md](./04-datastream.md)
- **ADR-012**：[TRUTH.md](../../TRUTH.md) ADR-012

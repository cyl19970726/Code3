# 02 — 接口定义

> 本文定义 task3/ 三层接口架构及其调用关系
> 参考：[TRUTH.md](../../TRUTH.md) ADR-012
> 数据模型：[01-data-model.md](./01-data-model.md)

---

## 1. 接口架构总览

### 1.1 三层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow Adapters                            │
│  (spec-kit-mcp-adapter, observer-adapter, ...)                  │
│                                                                 │
│  职责：                                                          │
│  1. 实现 workflow 特定的 dataOperator（上传/下载任务数据）        │
│  2. 调用 task3Operator 完整流程                                  │
│  3. 暴露 MCP 工具给用户                                          │
└─────────────────────────────────────────────────────────────────┘
                          ↓ 调用
┌─────────────────────────────────────────────────────────────────┐
│                    task3Operator                                │
│  (task3/orchestration/)                                         │
│                                                                 │
│  职责：完整流程编排（业务逻辑）                                    │
│  - publishFlow()   — 幂等性检查 + 创建任务 + 创建 bounty         │
│  - acceptFlow()    — 状态验证 + 下载任务 + 接受 bounty           │
│  - submitFlow()    — 状态验证 + 上传提交 + 更新链上              │
│  - confirmFlow()   — 验证提交 + 确认 bounty + 进入冷静期         │
│  - claimFlow()     — 冷静期验证 + 领取赏金                       │
└─────────────────────────────────────────────────────────────────┘
          ↓ 调用                              ↓ 调用
┌──────────────────────────────┐    ┌──────────────────────────────┐
│    bountyOperator            │    │    dataOperator              │
│  (task3/bounty-operator/)    │    │  (由 adapter 实现)            │
│                              │    │                              │
│  职责：链上操作（技术实现）     │    │  职责：任务数据操作           │
│  - createBounty()            │    │  - uploadTaskData()          │
│  - acceptBounty()            │    │  - downloadTaskData()        │
│  - submitBounty()            │    │  - uploadSubmission()        │
│  - confirmBounty()           │    │  - getTaskMetadata()         │
│  - claimPayout()             │    │  - updateTaskMetadata()      │
│  - getBounty()               │    │                              │
│  - getBountyByTaskHash()     │    │                              │
│  - ...                       │    │                              │
└──────────────────────────────┘    └──────────────────────────────┘
```

### 1.2 职责划分

| 层次 | 职责 | 实现位置 | 可扩展性 |
|------|------|----------|---------|
| **Workflow Adapters** | 实现 workflow 特定的 DataOperator | `task3/adapters/` | 新增 workflow = 新增 adapter |
| **task3Operator** | 流程编排 + 状态验证 + 业务逻辑 | `task3/orchestration/` | 固定（通用逻辑） |
| **bountyOperator** | 链上操作（创建/查询/更新） | `task3/bounty-operator/` | 新增链 = 新增实现 |
| **dataOperator** | 任务数据操作（上传/下载） | adapter 中实现 | 新增数据层 = 新实现 |

---

## 2. BountyOperator 接口

### 2.1 定位

- **抽象层**：定义链上操作的统一接口
- **实现层**：每条链有独立实现
  - `task3/bounty-operator/aptos/` — Aptos 实现
  - `task3/bounty-operator/ethereum/` — Ethereum 实现
  - `task3/bounty-operator/sui/` — Sui 实现（未来）

### 2.2 接口定义

**文件位置**: `task3/bounty-operator/interface.ts`

```typescript
export interface BountyOperator {
  // ========== 写入操作（6 个）==========

  /**
   * 创建 bounty
   */
  createBounty(params: CreateBountyParams): Promise<CreateBountyResult>;

  /**
   * 接受 bounty（requester 将任务分配给 worker）
   */
  acceptBounty(params: AcceptBountyParams): Promise<AcceptBountyResult>;

  /**
   * 提交工作成果（worker 提交，更新链上状态为 Submitted）
   */
  submitBounty(params: SubmitBountyParams): Promise<SubmitBountyResult>;

  /**
   * 确认工作成果（requester 确认，更新链上状态为 Confirmed，进入冷静期）
   */
  confirmBounty(params: ConfirmBountyParams): Promise<ConfirmBountyResult>;

  /**
   * 领取赏金（worker 领取，冷静期后）
   */
  claimPayout(params: ClaimPayoutParams): Promise<ClaimPayoutResult>;

  /**
   * 取消 bounty（仅 sponsor 可调用，仅 Open 状态）
   */
  cancelBounty(params: CancelBountyParams): Promise<CancelBountyResult>;

  // ========== 查询操作（5 个）==========

  /**
   * 通过 bounty_id 获取完整信息
   */
  getBounty(params: GetBountyParams): Promise<Bounty>;

  /**
   * 通过 task_hash 获取 bounty_id（幂等性检查）
   */
  getBountyByTaskHash(params: GetBountyByTaskHashParams): Promise<GetBountyByTaskHashResult>;

  /**
   * 列出所有 bounty IDs
   */
  listBounties(params?: ListBountiesParams): Promise<ListBountiesResult>;

  /**
   * 按 sponsor 查询 bounties
   */
  getBountiesBySponsor(params: GetBountiesBySponsorParams): Promise<GetBountiesBySponsorResult>;

  /**
   * 按 worker 查询 bounties
   */
  getBountiesByWorker(params: GetBountiesByWorkerParams): Promise<GetBountiesByWorkerResult>;
}
```

**类型定义**: 见 [01-data-model.md Section 2](./01-data-model.md#2-bounty-数据模型) 和 [Section 5](./01-data-model.md#5-bountyoperator-参数与返回值类型)

---

### 2.3 实现示例（Aptos）

**文件位置**: `task3/bounty-operator/aptos/src/bounty-operator.ts`

```typescript
import { BountyOperator, CreateBountyParams, CreateBountyResult, Bounty } from '@code3/task3/bounty-operator';
import { AptosClient } from '@aptos-labs/ts-sdk';

export class AptosBountyOperator implements BountyOperator {
  private client: AptosClient;
  private contractAddress: string;

  constructor(config: {
    privateKey: string;
    network: 'testnet' | 'mainnet';
    contractAddress: string;
  }) {
    this.client = new AptosClient({
      privateKey: config.privateKey,
      network: config.network
    });
    this.contractAddress = config.contractAddress;
  }

  async createBounty(params: CreateBountyParams): Promise<CreateBountyResult> {
    // 调用 Aptos 合约 create_bounty
    const result = await this.client.submitTransaction({
      function: `${this.contractAddress}::bounty::create_bounty`,
      type_arguments: [],
      arguments: [params.taskId, params.taskHash, params.amount, params.asset]
    });

    return {
      bountyId: result.bountyId,
      txHash: result.txHash
    };
  }

  async getBounty(params: GetBountyParams): Promise<Bounty> {
    // 调用 Aptos 合约 view function get_bounty
    const bounty = await this.client.view({
      function: `${this.contractAddress}::bounty::get_bounty`,
      type_arguments: [],
      arguments: [params.bountyId]
    });

    return bounty as Bounty;
  }

  async getBountyByTaskHash(params: GetBountyByTaskHashParams): Promise<GetBountyByTaskHashResult> {
    const bountyId = await this.client.view({
      function: `${this.contractAddress}::bounty::get_bounty_by_task_hash`,
      type_arguments: [],
      arguments: [params.taskHash]
    });

    return {
      found: bountyId !== '0',
      bountyId: bountyId !== '0' ? bountyId : undefined
    };
  }

  // ... 其他方法实现
}
```

---

## 3. DataOperator 接口

### 3.1 定位

- **抽象层**：定义任务数据操作的统一接口（与具体数据层无关）
- **实现层**：由各个 workflow-adapter 实现
  - `spec-kit-mcp-adapter` — SpecKitDataOperator（GitHub Issue/PR）
  - `observer-adapter` — ObserverDataOperator（IPFS）
  - 未来扩展：IPFSDataOperator, ArweaveDataOperator, S3DataOperator 等

### 3.2 接口定义

**文件位置**: `task3/data-operator/interface.ts`

```typescript
export interface DataOperator {
  /**
   * 上传任务数据到数据层
   * @returns taskUrl - 任务数据的 URL（可以是 GitHub Issue URL, IPFS CID, Arweave TX ID 等）
   */
  uploadTaskData(params: UploadTaskDataParams): Promise<UploadTaskDataResult>;

  /**
   * 从数据层下载任务数据
   */
  downloadTaskData(params: DownloadTaskDataParams): Promise<DownloadTaskDataResult>;

  /**
   * 上传提交内容到数据层
   * @returns submissionUrl - 提交内容的 URL（GitHub PR URL, IPFS CID 等）
   */
  uploadSubmission(params: UploadSubmissionParams): Promise<UploadSubmissionResult>;

  /**
   * 获取任务元数据
   */
  getTaskMetadata(params: GetTaskMetadataParams): Promise<TaskMetadata>;

  /**
   * 更新任务元数据
   */
  updateTaskMetadata(params: UpdateTaskMetadataParams): Promise<UpdateTaskMetadataResult>;
}
```

**类型定义**: 见 [01-data-model.md Section 6](./01-data-model.md#6-dataoperator-参数与返回值类型)

---

### 3.3 实现示例（spec-kit-mcp-adapter）

**文件位置**: `task3/adapters/spec-kit-mcp-adapter/src/data-operator.ts`

```typescript
import { DataOperator, UploadTaskDataParams, UploadTaskDataResult } from '@code3/task3/data-operator';
import { GitHubDataLayer } from '@code3/task3/data-layers/github';
import fs from 'fs/promises';
import path from 'path';

export class SpecKitDataOperator implements DataOperator {
  private github: GitHubDataLayer;
  private localSpecsDir: string;

  constructor(config: {
    githubToken: string;
    localSpecsDir: string; // 默认 "specs/"
  }) {
    this.github = new GitHubDataLayer({ token: config.githubToken });
    this.localSpecsDir = config.localSpecsDir;
  }

  async uploadTaskData(params: UploadTaskDataParams): Promise<UploadTaskDataResult> {
    const { taskData, metadata } = params;

    // 1. spec-kit 特定：读取本地 spec.md 文件
    const specContent = taskData.content; // Markdown string

    // 2. 通过 GitHubDataLayer 上传到 GitHub Issue
    const result = await this.github.createIssue({
      repo: metadata.repo,
      title: `[Code3 Bounty] ${this.extractTitle(specContent)}`,
      body: this.serializeContent(specContent, metadata),
      labels: ['code3-bounty', 'spec-kit', metadata.chain.name]
    });

    return {
      taskUrl: result.issueUrl,
      taskId: result.taskId,
      metadata
    };
  }

  async downloadTaskData(params: DownloadTaskDataParams): Promise<DownloadTaskDataResult> {
    const { taskUrl } = params;

    // 1. 通过 GitHubDataLayer 下载任务数据
    const result = await this.github.getIssue({ issueUrl: taskUrl });

    // 2. spec-kit 特定：写入本地 specs/{bountyId}/spec.md
    const bountyId = result.metadata.chain.bountyId;
    const localPath = path.join(this.localSpecsDir, bountyId, 'spec.md');

    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, result.content, 'utf-8');

    return {
      taskData: { content: result.content },
      localPath,
      metadata: result.metadata
    };
  }

  async uploadSubmission(params: UploadSubmissionParams): Promise<UploadSubmissionResult> {
    const { taskUrl, submissionData } = params;

    // 通过 GitHubDataLayer 创建 PR
    const result = await this.github.createPR({
      taskUrl,
      branchName: submissionData.branchName,
      title: `[Code3 Submission] ${submissionData.summary}`,
      body: this.generatePRBody(submissionData)
    });

    return {
      submissionUrl: result.prUrl,
      submissionId: result.prNumber
    };
  }

  async getTaskMetadata(params: GetTaskMetadataParams): Promise<TaskMetadata> {
    const result = await this.github.getIssueMetadata({ issueUrl: params.taskUrl });
    return result.metadata;
  }

  async updateTaskMetadata(params: UpdateTaskMetadataParams): Promise<UpdateTaskMetadataResult> {
    await this.github.updateIssueMetadata({
      issueUrl: params.taskUrl,
      metadata: params.metadata
    });
    return { success: true };
  }

  // Helper methods
  private extractTitle(specContent: string): string {
    const match = specContent.match(/^#\s+(.+)$/m);
    return match ? match[1] : 'Untitled';
  }

  private serializeContent(content: string, metadata: TaskMetadata): string {
    // 将 metadata 序列化为 YAML frontmatter
    return `---\n${this.toYAML(metadata)}\n---\n\n${content}`;
  }

  private generatePRBody(submissionData: any): string {
    return `## Summary\n${submissionData.summary}\n\n---\nGenerated by Code3`;
  }

  private toYAML(obj: any): string {
    // 简化版 YAML 序列化
    return JSON.stringify(obj, null, 2);
  }
}
```

---

## 4. Task3Operator 抽象类

### 4.1 定位

- **职责**：完整流程编排，协调 bountyOperator 和 dataOperator
- **实现位置**：`task3/orchestration/`
- **特点**：与 workflow 和数据层无关，只关心业务逻辑
- **设计模式**：抽象类（直接实现通用逻辑）

**为什么是抽象类而不是接口？**
- 5 个流程的核心逻辑对所有 workflow 都是相同的
- 只有 `dataOperator` 和 `bountyOperator` 是通过依赖注入传入的
- 无需为每个 workflow 重新实现流程逻辑

---

### 4.2 抽象类定义

**文件位置**: `task3/orchestration/task3-operator.ts`

```typescript
export abstract class Task3Operator {
  /**
   * 发布流程：幂等性检查 + 上传任务数据 + 创建 bounty
   */
  async publishFlow(params: PublishFlowParams): Promise<PublishFlowResult> {
    const { dataOperator, bountyOperator, taskData, metadata, amount, asset } = params;

    // 1. 计算 task_hash（幂等性检查）
    const taskHash = crypto.createHash('sha256').update(JSON.stringify(taskData)).digest('hex');

    // 2. 检查是否已存在 bounty（幂等性）
    const existingBounty = await bountyOperator.getBountyByTaskHash({ taskHash });
    if (existingBounty.found) {
      const taskMetadata = await dataOperator.getTaskMetadata({ taskUrl: metadata.dataLayer.url });
      return { taskUrl: taskMetadata.dataLayer.url, bountyId: existingBounty.bountyId, txHash: null, isNew: false };
    }

    // 3. 上传任务数据到数据层
    const uploadResult = await dataOperator.uploadTaskData({ taskData, metadata: { ...metadata, taskHash } });

    // 4. 创建链上 bounty
    const bountyResult = await bountyOperator.createBounty({ taskId: uploadResult.taskId, taskHash, amount, asset });

    // 5. 更新任务元数据（回写 bounty_id）
    await dataOperator.updateTaskMetadata({
      taskUrl: uploadResult.taskUrl,
      metadata: { chain: { ...metadata.chain, bountyId: bountyResult.bountyId } }
    });

    return { taskUrl: uploadResult.taskUrl, bountyId: bountyResult.bountyId, txHash: bountyResult.txHash, isNew: true };
  }

  /**
   * 接受流程：状态验证 + 下载任务数据 + 接受 bounty
   */
  async acceptFlow(params: AcceptFlowParams): Promise<AcceptFlowResult> {
    const { dataOperator, bountyOperator, taskUrl } = params;

    const metadata = await dataOperator.getTaskMetadata({ taskUrl });
    const { bountyId } = metadata.chain;

    const bounty = await bountyOperator.getBounty({ bountyId });
    if (bounty.status !== BountyStatus.Open) {
      throw new Error(`Bounty is not Open (current: ${bounty.status})`);
    }

    const downloadResult = await dataOperator.downloadTaskData({ taskUrl });
    const acceptResult = await bountyOperator.acceptBounty({ bountyId });

    return { taskData: downloadResult.taskData, localPath: downloadResult.localPath, bountyId, txHash: acceptResult.txHash };
  }

  /**
   * 提交流程：状态验证 + 上传提交 + 更新链上
   */
  async submitFlow(params: SubmitFlowParams): Promise<SubmitFlowResult> {
    const { dataOperator, bountyOperator, taskUrl, submissionData } = params;

    const metadata = await dataOperator.getTaskMetadata({ taskUrl });
    const { bountyId } = metadata.chain;

    const bounty = await bountyOperator.getBounty({ bountyId });
    if (bounty.status !== BountyStatus.Accepted) {
      throw new Error(`Bounty is not Accepted (current: ${bounty.status})`);
    }

    const uploadResult = await dataOperator.uploadSubmission({ taskUrl, submissionData });
    const submitResult = await bountyOperator.submitBounty({
      bountyId,
      submissionHash: crypto.createHash('sha256').update(JSON.stringify(submissionData)).digest('hex')
    });

    return { submissionUrl: uploadResult.submissionUrl, txHash: submitResult.txHash };
  }

  /**
   * 确认流程：验证提交 + 确认 bounty（进入冷静期）
   */
  async confirmFlow(params: ConfirmFlowParams): Promise<ConfirmFlowResult> {
    const { bountyOperator, dataOperator, taskUrl } = params;

    const metadata = await dataOperator.getTaskMetadata({ taskUrl });
    const { bountyId } = metadata.chain;

    const bounty = await bountyOperator.getBounty({ bountyId });
    if (bounty.status !== BountyStatus.Submitted) {
      throw new Error(`Bounty is not Submitted (current: ${bounty.status})`);
    }

    const confirmResult = await bountyOperator.confirmBounty({ bountyId, confirmedAt: Math.floor(Date.now() / 1000) });

    await dataOperator.updateTaskMetadata({
      taskUrl,
      metadata: { bounty: { ...metadata.bounty, confirmedAt: confirmResult.confirmedAt, coolingUntil: confirmResult.coolingUntil } }
    });

    return { txHash: confirmResult.txHash, coolingUntil: confirmResult.coolingUntil };
  }

  /**
   * 领取流程：冷静期验证 + 领取赏金
   */
  async claimFlow(params: ClaimFlowParams): Promise<ClaimFlowResult> {
    const { bountyOperator, dataOperator, taskUrl } = params;

    const metadata = await dataOperator.getTaskMetadata({ taskUrl });
    const { bountyId } = metadata.chain;

    const bounty = await bountyOperator.getBounty({ bountyId });
    if (bounty.status !== BountyStatus.Confirmed) {
      throw new Error(`Bounty is not Confirmed (current: ${bounty.status})`);
    }

    const now = Math.floor(Date.now() / 1000);
    if (bounty.coolingUntil && now < bounty.coolingUntil) {
      throw new Error(`Cooling period not ended (${bounty.coolingUntil - now}s remaining)`);
    }

    const claimResult = await bountyOperator.claimPayout({ bountyId });
    return { txHash: claimResult.txHash, amount: bounty.amount, asset: bounty.asset };
  }
}
```

**类型定义**: 见 [01-data-model.md Section 4](./01-data-model.md#4-flow-参数与返回值类型)

---

## 5. 调用关系

### 5.1 完整 Bounty 流程（5 个阶段）

```
Requester                               Worker
────────                                ──────
  │                                        │
  │ 1. publish (发布任务)                  │
  ├─→ publishFlow()                        │
  │   ├─ getBountyByTaskHash() (幂等性)    │
  │   ├─ uploadTaskData()                  │
  │   ├─ createBounty()                    │
  │   └─ updateTaskMetadata()              │
  │                                        │
  │                                        │ 2. accept (接单)
  │                                        ├─→ acceptFlow()
  │                                        │   ├─ getTaskMetadata()
  │                                        │   ├─ getBounty() (验证 Open)
  │                                        │   ├─ downloadTaskData()
  │                                        │   └─ acceptBounty()
  │                                        │
  │                                        │ 3. submit (提交工作)
  │                                        ├─→ submitFlow()
  │                                        │   ├─ getTaskMetadata()
  │                                        │   ├─ getBounty() (验证 Accepted)
  │                                        │   ├─ uploadSubmission()
  │                                        │   └─ submitBounty()
  │                                        │
  │ 4. confirm (确认工作)                  │
  ├─→ confirmFlow()                        │
  │   ├─ getTaskMetadata()                 │
  │   ├─ getBounty() (验证 Submitted)      │
  │   ├─ confirmBounty() (进入冷静期)      │
  │   └─ updateTaskMetadata()              │
  │                                        │
  │                                        │ 5. claim (领取赏金)
  │                                        ├─→ claimFlow()
  │                                        │   ├─ getTaskMetadata()
  │                                        │   ├─ getBounty() (验证 Confirmed + 冷静期)
  │                                        │   └─ claimPayout()
  │                                        │
```

---

### 5.2 publishFlow 调用详情

```
spec-kit-mcp-adapter.publish()
  ↓
  1. 读取本地 specs/00x/spec.md
  2. 创建 SpecKitDataOperator
  3. 创建 AptosBountyOperator
  ↓
task3Operator.publishFlow({
  dataOperator,
  bountyOperator,
  taskData,
  metadata,
  amount,
  asset
})
  ↓
  ├─→ bountyOperator.getBountyByTaskHash() — 幂等性检查
  │   └─→ 如果已存在，返回现有 bounty
  │
  ├─→ dataOperator.uploadTaskData() — 上传任务数据
  │   └─→ SpecKitDataOperator → GitHubDataLayer.createIssue()
  │       └─→ 创建 GitHub Issue
  │
  ├─→ bountyOperator.createBounty() — 创建链上 bounty
  │   └─→ AptosBountyOperator → Aptos 合约 create_bounty()
  │
  └─→ dataOperator.updateTaskMetadata() — 回写 bounty_id
      └─→ GitHubDataLayer.updateIssueMetadata()
  ↓
返回 { taskUrl, bountyId, txHash, isNew }
```

---

### 5.3 acceptFlow 调用详情

```
spec-kit-mcp-adapter.accept()
  ↓
task3Operator.acceptFlow({
  dataOperator,
  bountyOperator,
  taskUrl
})
  ↓
  ├─→ dataOperator.getTaskMetadata() — 获取任务元数据
  │
  ├─→ bountyOperator.getBounty() — 验证 bounty 状态
  │   └─→ 如果状态不是 Open，抛出错误
  │
  ├─→ dataOperator.downloadTaskData() — 下载任务数据
  │   └─→ SpecKitDataOperator:
  │       ├─ GitHubDataLayer.getIssue()
  │       └─ 写入 specs/{bountyId}/spec.md
  │
  └─→ bountyOperator.acceptBounty() — 接受链上 bounty
      └─→ Aptos 合约 accept_bounty()
  ↓
返回 { taskData, localPath, bountyId, txHash }
```

---

## 6. 关键设计原则

### 6.1 职责分离

- **bountyOperator**：只关心链上操作，不知道任务数据格式和数据层
  - 输入：bountyId, taskHash, amount, asset
  - 输出：txHash, bounty status
  - 不知道 GitHub / IPFS / Arweave

- **dataOperator**：只关心任务数据操作，不知道链上状态
  - 输入：taskData, taskUrl, metadata
  - 输出：taskUrl, submissionUrl, metadata
  - 不知道 Aptos / Ethereum / Sui

- **task3Operator**：协调两者，实现完整业务逻辑
  - 依赖注入：接收 dataOperator 和 bountyOperator
  - 流程编排：协调数据层和链上操作
  - 状态验证：确保 bounty 状态正确

---

### 6.2 接口抽象（与具体实现解耦）

#### bountyOperator: 不耦合数据层概念

- ✅ 使用通用术语：`taskHash`, `taskId`, `worker`, `submissionHash`
- ❌ 避免特定概念：~~`issueHash`~~, ~~`prUrl`~~, ~~`mergedAt`~~
- 状态机：`Open` → `Accepted` → `Submitted` → `Confirmed` → `Claimed`

#### dataOperator: 不耦合数据层概念

- ✅ 使用通用术语：`taskUrl`, `submissionUrl`, `taskData`, `metadata`
- ❌ 避免特定概念：~~`issueUrl`~~, ~~`prUrl`~~, ~~`Issue`~~, ~~`PR`~~
- 核心方法：`uploadTaskData`, `downloadTaskData`, `uploadSubmission`

---

### 6.3 依赖注入模式

```typescript
// adapter 创建实例并注入
const dataOperator = new SpecKitDataOperator({
  githubToken: process.env.GITHUB_TOKEN,
  localSpecsDir: 'specs/'
});

const bountyOperator = new AptosBountyOperator({
  privateKey: process.env.APTOS_PRIVATE_KEY,
  network: 'testnet'
});

// 注入到 orchestration
const result = await publishFlow({
  dataOperator,
  bountyOperator,
  taskData,
  metadata,
  amount,
  asset
});
```

**优势**：
- task3Operator 不依赖具体实现
- 易于测试（Mock dataOperator 和 bountyOperator）
- 易于扩展（新增链或数据层不影响 orchestration）

---

### 6.4 可扩展性

#### 新增链（例如：Sui）

1. 实现 `BountyOperator` 接口：
```typescript
export class SuiBountyOperator implements BountyOperator {
  async createBounty(params: CreateBountyParams): Promise<CreateBountyResult> {
    // 调用 Sui 合约
  }
  // ... 其他 10 个方法
}
```

2. 在 adapter 中使用：
```typescript
const bountyOperator = new SuiBountyOperator({ ... });
await publishFlow({ bountyOperator, ... });
```

#### 新增数据层（例如：IPFS）

1. 实现 DataOperator：
```typescript
export class IPFSDataOperator implements DataOperator {
  async uploadTaskData(params): Promise<UploadTaskDataResult> {
    const cid = await this.ipfs.add(content);
    return { taskUrl: `ipfs://${cid}`, taskId: cid };
  }
}
```

2. 在 adapter 中使用：
```typescript
const dataOperator = new IPFSDataOperator({ ... });
```

#### 新增 workflow（例如：code-review）

1. 实现 DataOperator：
```typescript
export class CodeReviewDataOperator implements DataOperator {
  async uploadTaskData(params): Promise<UploadTaskDataResult> {
    // 上传代码审查任务
  }
}
```

2. 暴露 MCP 工具：
```typescript
export async function publishReview(args) {
  const dataOperator = new CodeReviewDataOperator({ ... });
  const bountyOperator = new AptosBountyOperator({ ... });

  return await publishFlow({
    dataOperator,
    bountyOperator,
    taskData: args.reviewData,
    metadata: { workflow: { name: 'code-review' }, ... },
    amount: args.amount,
    asset: args.asset
  });
}
```

---

### 6.5 关键优势总结

1. **高内聚低耦合**：每个接口职责单一，互不依赖具体实现
2. **易于测试**：可以 Mock 任何层的接口进行单元测试
3. **易于扩展**：新增链/数据层/workflow 不影响现有代码
4. **类型安全**：TypeScript 接口提供编译时类型检查
5. **幂等性保障**：通过 `taskHash` 和 `getBountyByTaskHash` 确保幂等
6. **状态验证**：每个流程都验证 bounty 状态，防止非法操作

---

## 7. 参考

- **数据模型**: [01-data-model.md](./01-data-model.md)
- **ADR-012**: [TRUTH.md](../../TRUTH.md) ADR-012
- **包结构**: [05-packages-structure.md](./05-packages-structure.md)
- **工作流**: [08-workflow.md](./08-workflow.md)

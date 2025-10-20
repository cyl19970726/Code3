# 04 — 数据流

> 本文描述 Code3 系统中数据的完整流动过程
> 参考：[TRUTH.md](../../TRUTH.md) ADR-012

---

## 1. 完整 Bounty 生命周期

### 1.1 五阶段流程

```
┌────────────────────────────────────────────────────────────────┐
│                   Bounty 生命周期                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Phase 1: Publish (发布)                                       │
│  ────────────────────────────────────────────────────────────  │
│  Requester → publishFlow()                                     │
│  ├─ 计算 taskHash                                              │
│  ├─ 检查幂等性（getBountyByTaskHash）                          │
│  ├─ 上传任务数据（uploadTaskData）                             │
│  ├─ 创建链上 bounty（createBounty）                            │
│  └─ 回写 bounty_id（updateTaskMetadata）                       │
│  结果: taskUrl, bountyId                                       │
│                                                                │
│  Phase 2: Accept (接单)                                        │
│  ────────────────────────────────────────────────────────────  │
│  Worker → acceptFlow()                                         │
│  ├─ 获取任务元数据（getTaskMetadata）                          │
│  ├─ 验证状态为 Open（getBounty）                               │
│  ├─ 下载任务数据（downloadTaskData）                           │
│  └─ 接受链上 bounty（acceptBounty）                            │
│  结果: taskData, localPath, bountyId                           │
│                                                                │
│  Phase 3: Submit (提交)                                        │
│  ────────────────────────────────────────────────────────────  │
│  Worker → submitFlow()                                         │
│  ├─ 获取任务元数据（getTaskMetadata）                          │
│  ├─ 验证状态为 Accepted（getBounty）                           │
│  ├─ 上传提交内容（uploadSubmission）                           │
│  └─ 更新链上状态为 Submitted（submitBounty）                   │
│  结果: submissionUrl, txHash                                   │
│                                                                │
│  Phase 4: Confirm (确认)                                       │
│  ────────────────────────────────────────────────────────────  │
│  Requester → confirmFlow()                                     │
│  ├─ 获取任务元数据（getTaskMetadata）                          │
│  ├─ 验证状态为 Submitted（getBounty）                          │
│  ├─ 确认链上 bounty（confirmBounty）                           │
│  └─ 更新冷静期信息（updateTaskMetadata）                       │
│  结果: txHash, coolingUntil (confirmedAt + 7天)               │
│                                                                │
│  Phase 5: Claim (领取)                                         │
│  ────────────────────────────────────────────────────────────  │
│  Worker → claimFlow()                                          │
│  ├─ 获取任务元数据（getTaskMetadata）                          │
│  ├─ 验证状态为 Confirmed（getBounty）                          │
│  ├─ 验证冷静期结束（now >= coolingUntil）                      │
│  └─ 领取赏金（claimPayout）                                    │
│  结果: txHash, amount, asset                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**状态转换**: 见 [01-data-model.md Section 2.3](./01-data-model.md#23-状态机)

---

## 2. Phase 1: Publish（发布任务）

### 2.1 数据流图

```
Requester (Claude Code)
  │
  │ 1. 读取本地任务数据
  ├─→ specs/001/spec.md
  │
  │ 2. 调用 publish MCP 工具
  ├─→ spec-kit-mcp-adapter.publish({ amount, asset })
  │
  │ 3. 创建 operators
  ├─→ SpecKitDataOperator (GitHub)
  ├─→ AptosBountyOperator (Aptos)
  │
  │ 4. 执行 publishFlow
  ├─→ task3Operator.publishFlow()
  │     │
  │     ├─ crypto.sha256(taskData) → taskHash
  │     │
  │     ├─ bountyOperator.getBountyByTaskHash(taskHash)
  │     │   └─→ Aptos Contract: get_bounty_by_task_hash()
  │     │       └─→ 返回 bountyId (0=不存在)
  │     │
  │     ├─ [幂等分支] 如果已存在 → 返回现有 bounty
  │     │
  │     ├─ dataOperator.uploadTaskData({ taskData, metadata })
  │     │   └─→ GitHubDataLayer.createIssue()
  │     │       ├─ 序列化 metadata (YAML frontmatter)
  │     │       ├─ GitHub API: POST /repos/:owner/:repo/issues
  │     │       └─→ 返回 issueUrl, taskId
  │     │
  │     ├─ bountyOperator.createBounty({ taskId, taskHash, amount, asset })
  │     │   └─→ Aptos Contract: create_bounty()
  │     │       ├─ 存储 Bounty 实体
  │     │       ├─ 映射 taskHash → bountyId
  │     │       └─→ 返回 bountyId, txHash
  │     │
  │     └─ dataOperator.updateTaskMetadata({ taskUrl, metadata: { bountyId } })
  │         └─→ GitHubDataLayer.updateIssue()
  │             └─ 更新 Issue body (回写 bountyId)
  │
  └─→ 返回 { taskUrl, bountyId, txHash, isNew: true }
```

---

### 2.2 数据格式

**输入** (taskData):
```json
{
  "content": "# Feature Spec\n\n## Goal\n..."
}
```

**输出** (PublishFlowResult):
```json
{
  "taskUrl": "https://github.com/owner/repo/issues/123",
  "bountyId": "456",
  "txHash": "0xabc123...",
  "isNew": true
}
```

**链上存储** (Bounty):
```typescript
{
  bountyId: "456",
  taskId: "owner/repo#123",
  taskHash: "a3f8c9d2...",
  sponsor: "0xrequester...",
  worker: null,
  amount: "100.00",
  asset: "USDT",
  status: BountyStatus.Open,
  createdAt: 1696550400
}
```

**GitHub Issue** (元数据):
```yaml
---
schema: code3/v2
taskId: owner/repo#123
taskHash: a3f8c9d2...
chain:
  name: aptos
  network: testnet
  bountyId: "456"
  contractAddress: "0xcontract..."
workflow:
  name: spec-kit
  version: 1.0.0
bounty:
  asset: USDT
  amount: "100.00"
dataLayer:
  type: github
  url: https://github.com/owner/repo/issues/123
---

# Feature Spec

## Goal
...
```

---

## 3. Phase 2: Accept（接受任务）

### 3.1 数据流图

```
Worker (Claude Code)
  │
  │ 1. 调用 accept MCP 工具
  ├─→ spec-kit-mcp-adapter.accept({ taskUrl })
  │
  │ 2. 执行 acceptFlow
  ├─→ task3Operator.acceptFlow()
  │     │
  │     ├─ dataOperator.getTaskMetadata({ taskUrl })
  │     │   └─→ GitHubDataLayer.getIssue({ issueUrl })
  │     │       ├─ 解析 Issue body (YAML frontmatter)
  │     │       └─→ 返回 metadata (含 bountyId)
  │     │
  │     ├─ bountyOperator.getBounty({ bountyId })
  │     │   └─→ Aptos Contract: get_bounty()
  │     │       └─→ 返回 Bounty 实体
  │     │
  │     ├─ [状态验证] 如果 status != Open → 抛出错误
  │     │
  │     ├─ dataOperator.downloadTaskData({ taskUrl })
  │     │   └─→ GitHubDataLayer.getIssue({ issueUrl })
  │     │       ├─ 解析 Issue body
  │     │       ├─ 写入 specs/{bountyId}/spec.md
  │     │       └─→ 返回 taskData, localPath
  │     │
  │     └─ bountyOperator.acceptBounty({ bountyId, worker })
  │         └─→ Aptos Contract: accept_bounty()
  │             ├─ 更新 Bounty.worker
  │             ├─ 更新 Bounty.status = Accepted
  │             └─→ 返回 txHash
  │
  └─→ 返回 { taskData, localPath, bountyId, txHash }
```

---

### 3.2 数据格式

**输入** (AcceptFlowParams):
```typescript
{
  taskUrl: "https://github.com/owner/repo/issues/123",
  worker: "0xworker..."
}
```

**输出** (AcceptFlowResult):
```typescript
{
  taskData: { content: "# Feature Spec..." },
  localPath: "specs/456/spec.md",
  bountyId: "456",
  txHash: "0xdef456..."
}
```

**链上更新**:
```typescript
Bounty {
  worker: "0xworker...",       // ← 新增
  status: BountyStatus.Accepted, // ← 更新
  acceptedAt: 1696551000       // ← 新增
}
```

---

## 4. Phase 3: Submit（提交工作）

### 4.1 数据流图

```
Worker (Claude Code)
  │
  │ 1. 完成工作，提交代码到分支
  ├─→ git push origin worker-branch
  │
  │ 2. 调用 submit MCP 工具
  ├─→ spec-kit-mcp-adapter.submit({ taskUrl, branchName, summary })
  │
  │ 3. 执行 submitFlow
  ├─→ task3Operator.submitFlow()
  │     │
  │     ├─ dataOperator.getTaskMetadata({ taskUrl })
  │     │   └─→ 返回 metadata (含 bountyId)
  │     │
  │     ├─ bountyOperator.getBounty({ bountyId })
  │     │   └─→ 返回 Bounty 实体
  │     │
  │     ├─ [状态验证] 如果 status != Accepted → 抛出错误
  │     │
  │     ├─ dataOperator.uploadSubmission({ taskUrl, submissionData })
  │     │   └─→ GitHubDataLayer.createPR()
  │     │       ├─ GitHub API: POST /repos/:owner/:repo/pulls
  │     │       ├─ 创建 PR (head: worker-branch, base: main)
  │     │       ├─ PR body: "Closes #123"
  │     │       └─→ 返回 prUrl
  │     │
  │     └─ bountyOperator.submitBounty({ bountyId, submissionUrl })
  │         └─→ Aptos Contract: submit_bounty()
  │             ├─ 更新 Bounty.submissionUrl
  │             ├─ 更新 Bounty.status = Submitted
  │             └─→ 返回 txHash
  │
  └─→ 返回 { submissionUrl, txHash }
```

---

### 4.2 数据格式

**输入** (submissionData):
```typescript
{
  branchName: "worker-branch",
  summary: "Implement feature X",
  filesChanged: ["src/feature.ts", "tests/feature.test.ts"]
}
```

**输出** (SubmitFlowResult):
```typescript
{
  submissionUrl: "https://github.com/owner/repo/pull/124",
  txHash: "0xghi789..."
}
```

**链上更新**:
```typescript
Bounty {
  submissionUrl: "https://github.com/owner/repo/pull/124", // ← 新增
  status: BountyStatus.Submitted,                           // ← 更新
  submittedAt: 1696552000                                   // ← 新增
}
```

---

## 5. Phase 4: Confirm（确认工作）

### 5.1 数据流图

```
Requester (Claude Code / Webhook)
  │
  │ 触发方式 1: 手动调用
  ├─→ spec-kit-mcp-adapter.confirm({ taskUrl })
  │
  │ 触发方式 2: Webhook 自动触发
  ├─→ Backend: POST /webhook/github
  │   └─ event.action === 'closed' && event.pull_request.merged
  │       └─→ 自动调用 confirmFlow()
  │
  │ 3. 执行 confirmFlow
  ├─→ task3Operator.confirmFlow()
  │     │
  │     ├─ dataOperator.getTaskMetadata({ taskUrl })
  │     │   └─→ 返回 metadata (含 bountyId)
  │     │
  │     ├─ bountyOperator.getBounty({ bountyId })
  │     │   └─→ 返回 Bounty 实体
  │     │
  │     ├─ [状态验证] 如果 status != Submitted → 抛出错误
  │     │
  │     ├─ bountyOperator.confirmBounty({ bountyId, confirmedAt })
  │     │   └─→ Aptos Contract: confirm_bounty()
  │     │       ├─ 更新 Bounty.confirmedAt
  │     │       ├─ 计算 coolingUntil = confirmedAt + 7天
  │     │       ├─ 更新 Bounty.status = Confirmed
  │     │       └─→ 返回 txHash, coolingUntil
  │     │
  │     └─ dataOperator.updateTaskMetadata({ metadata: { coolingUntil } })
  │         └─→ GitHubDataLayer.updateIssue()
  │             └─ 更新 Issue metadata
  │
  └─→ 返回 { txHash, coolingUntil }
```

---

### 5.2 数据格式

**输出** (ConfirmFlowResult):
```typescript
{
  txHash: "0xjkl012...",
  coolingUntil: 1697155200  // confirmedAt + 7天
}
```

**链上更新**:
```typescript
Bounty {
  confirmedAt: 1696550400,                // ← 新增
  coolingUntil: 1697155200,               // ← 新增 (7天后)
  status: BountyStatus.Confirmed          // ← 更新
}
```

---

## 6. Phase 5: Claim（领取赏金）

### 6.1 数据流图

```
Worker (Claude Code)
  │
  │ 1. 等待冷静期结束（7天）
  │
  │ 2. 调用 claim MCP 工具
  ├─→ spec-kit-mcp-adapter.claim({ taskUrl })
  │
  │ 3. 执行 claimFlow
  ├─→ task3Operator.claimFlow()
  │     │
  │     ├─ dataOperator.getTaskMetadata({ taskUrl })
  │     │   └─→ 返回 metadata (含 bountyId)
  │     │
  │     ├─ bountyOperator.getBounty({ bountyId })
  │     │   └─→ 返回 Bounty 实体
  │     │
  │     ├─ [状态验证] 如果 status != Confirmed → 抛出错误
  │     │
  │     ├─ [冷静期验证] 如果 now < coolingUntil → 抛出错误
  │     │
  │     └─ bountyOperator.claimPayout({ bountyId })
  │         └─→ Aptos Contract: claim_payout()
  │             ├─ 更新 Bounty.status = Claimed
  │             ├─ 更新 Bounty.claimedAt
  │             ├─ 转账: sponsor → worker (amount, asset)
  │             └─→ 返回 txHash
  │
  └─→ 返回 { txHash, amount, asset }
```

---

### 6.2 数据格式

**输出** (ClaimFlowResult):
```typescript
{
  txHash: "0xmno345...",
  amount: "100.00",
  asset: "USDT"
}
```

**链上更新**:
```typescript
Bounty {
  status: BountyStatus.Claimed,  // ← 更新
  claimedAt: 1697156000          // ← 新增
}
```

**资金流动**:
```
Sponsor (0xrequester...) → Worker (0xworker...)
Amount: 100.00 USDT
```

---

## 7. 幂等性保证

### 7.1 重复发布检测

**场景**: Requester 误操作，重复调用 `publish` 发布相同任务

**机制**: 见 [01-data-model.md Section 8](./01-data-model.md#8-幂等性机制)

**流程**:
```
publishFlow()
  ├─ taskHash = sha256(taskData)
  ├─ existingBounty = getBountyByTaskHash(taskHash)
  │
  ├─ [已存在] → 返回 { bountyId, isNew: false, txHash: null }
  │
  └─ [不存在] → 创建新 bounty
```

---

### 7.2 重复接受检测

**场景**: Worker 误操作，重复调用 `accept`

**机制**: 状态验证

**流程**:
```
acceptFlow()
  ├─ bounty = getBounty(bountyId)
  ├─ if (bounty.status !== Open) → 抛出错误
  └─ acceptBounty()
```

---

## 8. 错误处理

### 8.1 状态不匹配

**场景**: Worker 在 Open 状态直接调用 `submit`

**处理**:
```typescript
submitFlow() {
  const bounty = await getBounty({ bountyId });
  if (bounty.status !== BountyStatus.Accepted) {
    throw new Error(`Bounty is not Accepted (current: ${bounty.status})`);
  }
}
```

---

### 8.2 冷静期未结束

**场景**: Worker 在冷静期内调用 `claim`

**处理**:
```typescript
claimFlow() {
  const bounty = await getBounty({ bountyId });
  const now = Math.floor(Date.now() / 1000);

  if (bounty.coolingUntil && now < bounty.coolingUntil) {
    const remainingSeconds = bounty.coolingUntil - now;
    throw new Error(`Cooling period not ended (${remainingSeconds}s remaining)`);
  }
}
```

---

### 8.3 交易失败

**场景**: 链上交易因 Gas 不足等原因失败

**处理**:
1. 捕获异常
2. 返回详细错误信息（txHash, reason）
3. 提示用户重试
4. 不修改链下状态（保证一致性）

---

## 9. 并发控制

### 9.1 同一任务多人接受

**场景**: 多个 worker 同时调用 `accept`

**机制**: 链上状态机（先到先得）

**流程**:
```
Worker A: acceptBounty(bountyId) → 成功 (status: Open → Accepted)
Worker B: acceptBounty(bountyId) → 失败 (status: Accepted, 不是 Open)
```

---

### 9.2 Requester 提前取消

**场景**: Requester 在 Worker 接受前取消 bounty

**机制**: 只有 Open 状态可取消

**流程**:
```
cancelBounty() {
  if (bounty.status !== BountyStatus.Open) {
    throw new Error("Can only cancel open bounty");
  }
  // 退款给 sponsor
}
```

---

## 10. 参考

- **数据模型**: [01-data-model.md](./01-data-model.md)
- **接口定义**: [02-interfaces.md](./02-interfaces.md)
- **架构设计**: [03-architecture.md](./03-architecture.md)

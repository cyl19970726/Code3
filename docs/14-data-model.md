# Data Model — 统一数据模型（code3/v1）

**版本**: 1.0.0
**最后更新**: 2025-09-30
**状态**: Draft

## 概述

本文档是 Code3 项目所有数据结构的**单一事实来源（Single Source of Truth）**。

### 为什么需要这个文档？

Code3 涉及多种技术栈和语言：
- **Move**：Aptos 智能合约（链上状态）
- **TypeScript**：MCP 工具、前端、后端服务
- **JSON**：GitHub Issue 元数据、API 通信

如果在不同地方重复定义数据结构，会导致：
- 字段命名不一致（`issue_hash` vs `issueHash`）
- 类型映射错误（Move 的 `u8` vs TypeScript 的 `string`）
- Schema 演进困难（修改一个字段需要同步 5 处代码）
- 集成错误频发（序列化/反序列化失败）

### 使用约定

**强制规则**：
1. ✅ **添加新数据结构时**：必须先在本文档中定义，再写代码
2. ✅ **修改现有结构时**：必须先更新本文档，再更新代码
3. ✅ **实现代码时**：必须参考本文档的类型定义，确保字段名、类型、约束完全一致
4. ✅ **Code Review 时**：必须检查文档与代码的一致性

**更新流程**：
```
修改需求 → 更新本文档 → 更新 IMPLEMENTATION_PLAN.md → 更新代码 → 测试 → 提交时在本文档末尾记录变更历史
```

---

## 目录

- [1. 核心领域模型](#1-核心领域模型)
  - [1.1 Bounty（赏金）](#11-bounty赏金)
  - [1.2 Issue Metadata（任务元数据）](#12-issue-metadata任务元数据)
  - [1.3 Feature Metadata（特性元数据）](#13-feature-metadata特性元数据)
- [2. 状态与枚举](#2-状态与枚举)
  - [2.1 BountyStatus（赏金状态）](#21-bountystatus赏金状态)
  - [2.2 Error Codes（错误码）](#22-error-codes错误码)
- [3. MCP 工具契约](#3-mcp-工具契约)
  - [3.1 Specify Tool I/O](#31-specify-tool-io)
  - [3.2 Plan Tool I/O](#32-plan-tool-io)
  - [3.3 Tasks Tool I/O](#33-tasks-tool-io)
- [4. 事件定义](#4-事件定义)
- [5. 幂等键与标识符](#5-幂等键与标识符)
- [6. 时间与时间戳](#6-时间与时间戳)
- [7. 变更历史](#7-变更历史)

---

## 1. 核心领域模型

### 1.1 Bounty（赏金）

赏金是 Code3 系统的核心实体，代表一个悬赏任务的完整生命周期。

#### 字段定义

| 字段名 | Move 类型 | TypeScript 类型 | JSON 表示 | 说明 | 约束 |
|--------|-----------|-----------------|-----------|------|------|
| `id` | `u64` | `number \| string` | `"123"` | 赏金唯一标识 | 自增，全局唯一；TypeScript 建议用 string 避免精度丢失 |
| `sponsor` | `address` | `string` | `"0xabc..."` | 发布者地址 | 必填，Aptos 地址格式 |
| `winner` | `Option<address>` | `string \| null` | `"0xdef..."` or `null` | 获胜者地址 | 初始为 null，首个合并 PR 的接单者 |
| `repo_url` | `String` | `string` | `"https://github.com/owner/repo"` | 仓库 URL | 必填，完整的 GitHub 仓库 URL |
| `issue_hash` | `vector<u8>` | `Uint8Array` | `"0x1a2b..."` (hex) | Issue 元数据 SHA256 哈希 | 32 字节，幂等键 |
| `pr_url` | `Option<String>` | `string \| null` | `"https://github.com/.../pull/456"` | PR URL | 初始 null，submit_pr 时填充 |
| `pr_digest` | `Option<vector<u8>>` | `Uint8Array \| null` | `"0x3c4d..."` (hex) | PR 摘要 | `hash(bounty_id \|\| pr_url \|\| commit_sha)`，用于验证 |
| `asset` | `Object<Metadata>` | `string` | `"USDT"` | 资产类型 | Move 使用 FA Object，TypeScript 用资产符号 |
| `amount` | `u64` | `string` | `"1000000"` | 赏金金额 | 最小单位（USDT 为 6 位小数），TypeScript 用 string 避免精度问题 |
| `status` | `u8` | `BountyStatus` (enum) | `0` or `"Open"` | 状态码 | 见 BountyStatus 枚举 |
| `merged_at` | `Option<u64>` | `number \| null` | `1704067200` | 合并时间戳 | Unix 时间戳（秒），null 表示未合并 |
| `cooling_until` | `Option<u64>` | `number \| null` | `1704672000` | 冷静期结束时间 | `merged_at + 7 days`，null 表示未进入冷静期 |
| `created_at` | `u64` | `number` | `1703980800` | 创建时间戳 | Unix 时间戳（秒） |

#### Move 结构体

```move
struct Bounty has key, store {
    id: u64,
    sponsor: address,
    winner: Option<address>,
    repo_url: String,
    issue_hash: vector<u8>,
    pr_url: Option<String>,
    pr_digest: Option<vector<u8>>,
    asset: Object<Metadata>,  // Fungible Asset
    amount: u64,
    status: u8,
    merged_at: Option<u64>,
    cooling_until: Option<u64>,
    created_at: u64,
}
```

#### TypeScript 接口

```typescript
interface Bounty {
  id: string;  // u64 as string to avoid precision loss
  sponsor: string;  // Aptos address
  winner: string | null;
  repo_url: string;
  issue_hash: string;  // hex string
  pr_url: string | null;
  pr_digest: string | null;  // hex string
  asset: string;  // "USDT"
  amount: string;  // u64 as string
  status: BountyStatus;
  merged_at: number | null;  // Unix timestamp in seconds
  cooling_until: number | null;
  created_at: number;
}
```

#### 不变量

1. `winner` 只能从 `null` 设置为某个 address 一次，不可修改
2. `status` 必须按状态机顺序转换（见 BountyStatus）
3. `cooling_until = merged_at + 604800`（7 天 = 604800 秒）
4. `pr_digest` 一经设置不可修改
5. `amount` 必须 > 0

---

### 1.2 Issue Metadata（任务元数据）

嵌入在 GitHub Issue 正文中的机器可读元数据，用于任务发现、接单、状态同步。

#### 字段定义

| 字段名 | JSON 类型 | TypeScript 类型 | 说明 | 约束 |
|--------|-----------|-----------------|------|------|
| `schema` | `string` | `"code3/v1"` (literal) | Schema 版本标识 | 固定值 `"code3/v1"` |
| `repo` | `string` | `string` | 仓库完整 URL | 必填，如 `https://github.com/owner/repo` |
| `issue_number` | `number` | `number` | Issue 编号 | 必填，GitHub Issue 编号 |
| `issue_hash` | `string` | `string` | Canonical JSON 的 SHA256 | 幂等键，hex 小写字符串 |
| `feature_id` | `string` | `string` | 特性标识 | 如 `003-web-ai-agent` |
| `task_id` | `string` | `string` | 规范化任务标识 | 格式：`{owner}/{repo}#{issue_number}` |
| `bounty.network` | `string` | `"testnet" \| "mainnet"` | 链网络 | Aptos 网络 |
| `bounty.asset` | `string` | `"USDT"` (literal) | 资产类型 | 统一 USDT |
| `bounty.amount` | `string` | `string` | 赏金金额 | 最小单位，字符串表示 |
| `bounty.bounty_id` | `string \| null` | `string \| null` | 链上赏金 ID | 初始 null，create_bounty 后回写 |
| `bounty.merged_at` | `string \| null` | `string \| null` | 合并时间 | ISO8601 或 Unix 时间戳字符串 |
| `bounty.cooling_until` | `string \| null` | `string \| null` | 冷静期结束时间 | 同上 |
| `spec_refs` | `string[]` | `string[]` | Spec 文档相对路径列表 | 如 `["specs/003-web-ai-agent/spec.md"]` |
| `labels` | `string[]` | `string[]` | GitHub 标签 | 至少包含 `["code3", "open"]` |

#### JSON Schema

```json
{
  "schema": "code3/v1",
  "repo": "https://github.com/owner/repo",
  "issue_number": 123,
  "issue_hash": "a1b2c3d4...",
  "feature_id": "003-web-ai-agent",
  "task_id": "owner/repo#123",
  "bounty": {
    "network": "testnet",
    "asset": "USDT",
    "amount": "1000000",
    "bounty_id": null,
    "merged_at": null,
    "cooling_until": null
  },
  "spec_refs": ["specs/003-web-ai-agent/spec.md"],
  "labels": ["code3", "open"]
}
```

#### TypeScript 接口

```typescript
interface IssueMetadata {
  schema: 'code3/v1';
  repo: string;
  issue_number: number;
  issue_hash: string;
  feature_id: string;
  task_id: string;
  bounty: {
    network: 'testnet' | 'mainnet';
    asset: 'USDT';
    amount: string;
    bounty_id: string | null;
    merged_at: string | null;
    cooling_until: string | null;
  };
  spec_refs: string[];
  labels: string[];
}
```

#### Canonical JSON 计算规则

用于生成稳定的 `issue_hash`：

1. 递归按 key 升序排序对象属性
2. 数组顺序保持输入顺序
3. 使用紧凑 JSON.stringify（无空白）
4. UTF-8 编码后计算 SHA256
5. 输出十六进制小写字符串

```typescript
function canonical(obj: any): any {
  if (Array.isArray(obj)) return obj.map(canonical);
  if (obj && typeof obj === 'object') {
    const sorted: any = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = canonical(obj[key]);
    }
    return sorted;
  }
  return obj;
}

const canonicalJson = JSON.stringify(canonical(metadata));
const issue_hash = sha256(canonicalJson).toString('hex');
```

---

### 1.3 Feature Metadata（特性元数据）

本地特性（feature）的元数据，用于 spec-kit 工作流。

#### 字段定义

| 字段名 | TypeScript 类型 | 说明 | 示例 |
|--------|-----------------|------|------|
| `feature_id` | `string` | 特性唯一标识 | `"003-web-ai-agent"` |
| `feature_num` | `number` | 特性编号 | `3` |
| `slug` | `string` | URL 友好的短名称 | `"web-ai-agent"` |
| `branch_name` | `string \| undefined` | Git 分支名 | `"feat/003-web-ai-agent"` |
| `dir_path` | `string` | 特性目录路径 | `"specs/003-web-ai-agent"` |

#### TypeScript 接口

```typescript
interface FeatureMetadata {
  feature_id: string;
  feature_num: number;
  slug: string;
  branch_name?: string;
  dir_path: string;
}
```

---

## 2. 状态与枚举

### 2.1 BountyStatus（赏金状态）

赏金的生命周期状态机。

#### 状态转换图

```
Open → Started → PRSubmitted → Merged → CoolingDown → Paid
  ↓        ↓                                ↓
Cancelled  Cancelled                      Cancelled (仅争议情况)
```

#### 状态定义

| 状态名 | Move 值 | TypeScript 字符串 | TypeScript 数值 | 说明 | 可转换到 |
|--------|---------|-------------------|----------------|------|----------|
| Open | `0` | `"Open"` | `0` | 已发布，待接单 | Started, Cancelled |
| Started | `1` | `"Started"` | `1` | 已接单，进行中 | PRSubmitted, Cancelled |
| PRSubmitted | `2` | `"PRSubmitted"` | `2` | PR 已提交 | Merged |
| Merged | `3` | `"Merged"` | `3` | PR 已合并（瞬态） | CoolingDown |
| CoolingDown | `4` | `"CoolingDown"` | `4` | 7 天冷静期 | Paid, Cancelled (争议) |
| Paid | `5` | `"Paid"` | `5` | 已结算（终态） | - |
| Cancelled | `6` | `"Cancelled"` | `6` | 已取消（终态） | - |

#### Move 定义

```move
const STATUS_OPEN: u8 = 0;
const STATUS_STARTED: u8 = 1;
const STATUS_PR_SUBMITTED: u8 = 2;
const STATUS_MERGED: u8 = 3;
const STATUS_COOLING_DOWN: u8 = 4;
const STATUS_PAID: u8 = 5;
const STATUS_CANCELLED: u8 = 6;
```

#### TypeScript 定义

```typescript
enum BountyStatus {
  Open = 0,
  Started = 1,
  PRSubmitted = 2,
  Merged = 3,
  CoolingDown = 4,
  Paid = 5,
  Cancelled = 6,
}

// 或使用字符串枚举（推荐用于 JSON 序列化）
type BountyStatusString =
  | 'Open'
  | 'Started'
  | 'PRSubmitted'
  | 'Merged'
  | 'CoolingDown'
  | 'Paid'
  | 'Cancelled';
```

---

### 2.2 Error Codes（错误码）

统一的错误码定义，用于 MCP 工具和合约。

#### 错误码表

| 名称 | Move 常量 | TypeScript enum | 数值 | 说明 | 触发场景 |
|------|-----------|-----------------|------|------|----------|
| `E_NOT_FOUND` | `E_NOT_FOUND` | `ErrorCode.NOT_FOUND` | `1` | 资源不存在 | 特性/Issue/Bounty 不存在 |
| `E_EXISTS` | `E_EXISTS` | `ErrorCode.EXISTS` | `2` | 资源已存在 | 重复创建特性/赏金 |
| `E_PRECONDITION` | `E_PRECONDITION` | `ErrorCode.PRECONDITION` | `3` | 前置条件不满足 | 缺少 spec.md，plan 产物不完整 |
| `E_INVALID_STATE` | `E_INVALID_STATE` | `ErrorCode.INVALID_STATE` | `4` | 状态转换非法 | 从 Paid 转到其他状态 |
| `E_UNAUTHORIZED` | `E_UNAUTHORIZED` | `ErrorCode.UNAUTHORIZED` | `5` | 权限不足 | 非 winner 调用 claim_payout |
| `E_DUPLICATE` | `E_DUPLICATE` | `ErrorCode.DUPLICATE` | `6` | 重复操作 | Worker 重复接单 |
| `E_COOLING` | `E_COOLING` | `ErrorCode.COOLING` | `7` | 冷静期未结束 | 冷静期内尝试领取 |
| `E_INVALID_AMOUNT` | `E_INVALID_AMOUNT` | `ErrorCode.INVALID_AMOUNT` | `8` | 金额非法 | amount = 0 |
| `E_DIGEST_MISMATCH` | `E_DIGEST_MISMATCH` | `ErrorCode.DIGEST_MISMATCH` | `9` | PR 摘要不匹配 | mark_merged 时验证失败 |
| `E_GH_RATE_LIMIT` | - | `ErrorCode.GH_RATE_LIMIT` | - | GitHub 速率限制 | （仅 MCP 工具） |
| `E_CHAIN_TX_FAILED` | - | `ErrorCode.CHAIN_TX_FAILED` | - | 链上交易失败 | （仅 MCP 工具） |
| `E_IDEMPOTENT_REJECTED` | - | `ErrorCode.IDEMPOTENT_REJECTED` | - | 幂等键冲突 | （仅 MCP 工具） |
| `E_INTERNAL` | - | `ErrorCode.INTERNAL` | - | 内部错误 | （仅 MCP 工具） |

#### Move 定义

```move
const E_NOT_FOUND: u64 = 1;
const E_EXISTS: u64 = 2;
const E_PRECONDITION: u64 = 3;
const E_INVALID_STATE: u64 = 4;
const E_UNAUTHORIZED: u64 = 5;
const E_DUPLICATE: u64 = 6;
const E_COOLING: u64 = 7;
const E_INVALID_AMOUNT: u64 = 8;
const E_DIGEST_MISMATCH: u64 = 9;
```

#### TypeScript 定义

```typescript
enum ErrorCode {
  NOT_FOUND = 'E_NOT_FOUND',
  EXISTS = 'E_EXISTS',
  PRECONDITION = 'E_PRECONDITION',
  INVALID_STATE = 'E_INVALID_STATE',
  UNAUTHORIZED = 'E_UNAUTHORIZED',
  DUPLICATE = 'E_DUPLICATE',
  COOLING = 'E_COOLING',
  INVALID_AMOUNT = 'E_INVALID_AMOUNT',
  DIGEST_MISMATCH = 'E_DIGEST_MISMATCH',
  GH_RATE_LIMIT = 'E_GH_RATE_LIMIT',
  CHAIN_TX_FAILED = 'E_CHAIN_TX_FAILED',
  IDEMPOTENT_REJECTED = 'E_IDEMPOTENT_REJECTED',
  INTERNAL = 'E_INTERNAL',
}
```

---

## 3. MCP 工具契约

### 3.1 Specify Tool I/O

#### Input

```typescript
interface SpecifyInput {
  feature_description: string;
  feature_id?: string | null;
  allow_overwrite?: boolean;
}
```

#### Output

```typescript
interface SpecifyOutput {
  success: boolean;
  feature_id: string;
  paths: {
    spec: string;
    dir: string;
  };
  error?: {
    code: ErrorCode;
    message: string;
  };
}
```

---

### 3.2 Plan Tool I/O

#### Input

```typescript
interface PlanInput {
  feature_id: string;
  tech_constraints?: string | null;
  allow_overwrite?: boolean;
}
```

#### Output

```typescript
interface PlanOutput {
  success: boolean;
  paths: {
    plan: string;
    research: string;
    data_model: string;
    contracts: string;
    quickstart: string;
  };
  error?: {
    code: ErrorCode;
    message: string;
  };
}
```

---

### 3.3 Tasks Tool I/O

#### Input

```typescript
interface TasksInput {
  feature_id: string;
  allow_overwrite?: boolean;
}
```

#### Output

```typescript
interface TasksOutput {
  success: boolean;
  path: string;
  error?: {
    code: ErrorCode;
    message: string;
  };
}
```

---

## 4. 事件定义

合约发出的事件，用于链下索引和状态同步。

### 4.1 BountyCreated

```move
#[event]
struct BountyCreated has drop, store {
    bounty_id: u64,
    sponsor: address,
    repo_url: String,
    issue_hash: vector<u8>,
    asset: Object<Metadata>,
    amount: u64,
}
```

```typescript
interface BountyCreatedEvent {
  bounty_id: string;
  sponsor: string;
  repo_url: string;
  issue_hash: string;
  asset: string;
  amount: string;
}
```

### 4.2 BountyAccepted

```move
#[event]
struct BountyAccepted has drop, store {
    bounty_id: u64,
    worker: address,
}
```

```typescript
interface BountyAcceptedEvent {
  bounty_id: string;
  worker: string;
}
```

### 4.3 PRSubmitted

```move
#[event]
struct PRSubmitted has drop, store {
    bounty_id: u64,
    worker: address,
    pr_url: String,
}
```

```typescript
interface PRSubmittedEvent {
  bounty_id: string;
  worker: string;
  pr_url: string;
}
```

### 4.4 Merged

```move
#[event]
struct Merged has drop, store {
    bounty_id: u64,
    pr_url: String,
    winner: address,
    merged_at: u64,
    cooling_until: u64,
}
```

```typescript
interface MergedEvent {
  bounty_id: string;
  pr_url: string;
  winner: string;
  merged_at: number;
  cooling_until: number;
}
```

### 4.5 Paid

```move
#[event]
struct Paid has drop, store {
    bounty_id: u64,
    winner: address,
    amount: u64,
}
```

```typescript
interface PaidEvent {
  bounty_id: string;
  winner: string;
  amount: string;
}
```

### 4.6 Cancelled

```move
#[event]
struct Cancelled has drop, store {
    bounty_id: u64,
}
```

```typescript
interface CancelledEvent {
  bounty_id: string;
}
```

---

## 5. 幂等键与标识符

### 5.1 幂等键

| 操作 | 幂等键 | 格式 | 用途 |
|------|--------|------|------|
| 创建赏金 | `issue_hash` | SHA256 hex (32 bytes) | 防止重复发布同一 Issue |
| Webhook 处理 | `${delivery_id}:${bounty_id}` | 字符串拼接 | 防止重复处理同一 PR 合并事件 |
| PR 验证 | `pr_digest` | `hash(bounty_id \|\| pr_url \|\| commit_sha)` | 确保 mark_merged 的 PR 是之前 submit_pr 的 |

### 5.2 标识符规范

| 名称 | 格式 | 示例 | 说明 |
|------|------|------|------|
| `bounty_id` | `u64` (Move) / `string` (TS) | `"123"` | 链上自增 ID |
| `feature_id` | `{num}-{slug}` | `"003-web-ai-agent"` | 特性标识 |
| `task_id` | `{owner}/{repo}#{issue_number}` | `"code3/spec-kit#123"` | 规范化任务标识 |
| `issue_hash` | SHA256 hex | `"a1b2c3..."` | Issue 元数据哈希 |

---

## 6. 时间与时间戳

### 6.1 时间表示

| 场景 | Move | TypeScript | JSON |
|------|------|------------|------|
| 合约内时间 | `u64` (Unix seconds) | `number` | `1704067200` |
| Issue 元数据 | - | `string` | `"2024-01-01T00:00:00Z"` (ISO8601) |
| 冷静期计算 | `merged_at + 604800` | `mergedAt + 7 * 24 * 3600` | - |

### 6.2 常量

```move
const COOLING_PERIOD_SECONDS: u64 = 604800;  // 7 days
```

```typescript
const COOLING_PERIOD_SECONDS = 7 * 24 * 60 * 60;  // 604800
```

---

## 7. 变更历史

### v1.0.0 (2025-09-30)
- 初始版本
- 定义核心领域模型：Bounty, IssueMetadata, FeatureMetadata
- 定义状态机：BountyStatus
- 统一错误码：E_NOT_FOUND ~ E_INTERNAL
- 定义 6 个事件类型
- 定义幂等键与标识符规范

---

## 附录：类型映射速查表

### Move ↔ TypeScript 类型映射

| Move | TypeScript | JSON | 说明 |
|------|------------|------|------|
| `u8` | `number` | `123` | 小整数 |
| `u64` | `string` | `"123"` | 大整数（避免精度丢失） |
| `address` | `string` | `"0x1..."` | Aptos 地址 |
| `String` | `string` | `"text"` | 字符串 |
| `vector<u8>` | `Uint8Array` | `"0xabcd"` (hex) | 字节数组 |
| `Option<T>` | `T \| null` | `value` or `null` | 可选值 |
| `Object<Metadata>` | `string` | `"USDT"` | FA 对象（用符号表示） |

### 布尔值表示

| Move | TypeScript | 说明 |
|------|------------|------|
| 无原生 bool（用 u8） | `boolean` | Move 用 `0`/`1`，TS 用 `false`/`true` |

---

**本文档是所有数据结构的权威定义。修改时请遵循更新流程。**
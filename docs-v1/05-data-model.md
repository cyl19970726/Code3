# 05 — 统一数据模型

> 本文定义 Code3 项目的核心数据结构、类型映射与状态机逻辑。
> 单一事实来源：[TRUTH.md](../../TRUTH.md) ADR-002/003/009（链上为真相，GitHub 为镜像，三大 MCP 架构）

---

## 1. 核心数据结构

### 1.1 Bounty（赏金任务）

#### Move 合约定义

**文件路径**: [Code3/task3/aptos/sources/bounty.move](../../task3/aptos/sources/bounty.move)

```move
struct Bounty has store {
    id: u64,
    sponsor: address,
    winner: Option<address>,
    repo_url: String,
    issue_hash: vector<u8>,
    pr_url: Option<String>,
    pr_digest: Option<vector<u8>>,
    asset: Object<Metadata>,       // Fungible Asset 元数据对象
    amount: u64,
    status: u8,                     // 0-6, 见 BountyStatus
    merged_at: Option<u64>,
    cooling_until: Option<u64>,
    created_at: u64,
}

// 状态常量
const STATUS_OPEN: u8 = 0;
const STATUS_STARTED: u8 = 1;
const STATUS_PR_SUBMITTED: u8 = 2;
const STATUS_MERGED: u8 = 3;
const STATUS_COOLING_DOWN: u8 = 4;
const STATUS_PAID: u8 = 5;
const STATUS_CANCELLED: u8 = 6;
```

#### TypeScript 类型定义

**文件路径**: [Code3/spec-mcp/aptos-mcp/src/types/bounty.ts](../../spec-mcp/aptos-mcp/src/types/bounty.ts)

```typescript
export interface Bounty {
  id: string;                    // u64 → string (避免 JS 精度丢失)
  sponsor: string;               // address → string (0x...)
  winner: string | null;         // Option<address>
  repo_url: string;              // String
  issue_hash: string;            // vector<u8> → hex string (0x...)
  pr_url: string | null;         // Option<String>
  pr_digest: string | null;      // Option<vector<u8>> → hex string
  asset: string;                 // Object<Metadata> → asset address (0x...)
  amount: string;                // u64 → string (避免精度丢失)
  status: BountyStatus;          // u8 → enum
  merged_at: number | null;      // Option<u64> → Unix timestamp (ms)
  cooling_until: number | null;  // Option<u64> → Unix timestamp (ms)
  created_at: number;            // u64 → Unix timestamp (ms)
}

export enum BountyStatus {
  Open = 0,
  Started = 1,
  PRSubmitted = 2,
  Merged = 3,
  CoolingDown = 4,
  Paid = 5,
  Cancelled = 6,
}
```

#### GitHub Issue 元数据（JSON）

**位置**: GitHub Issue 正文内的 JSON 代码块（三反引号 + `json` 标记，首行注释 `<!-- code3/v1 -->`）

**Schema 版本**: `code3/v1`

**生成工具**: `spec-kit-mcp.specify` + `github-mcp-server.create_issue` + `aptos-chain-mcp.create_bounty`

```json
{
  "schema": "code3/v1",
  "repo": "https://github.com/owner/repo",
  "issue_number": 123,
  "issue_hash": "0x1234abcd...",
  "feature_id": "003-web-ai-agent",
  "task_id": "owner/repo#123",
  "bounty": {
    "network": "testnet",
    "asset": "USDT",
    "amount": "10",
    "bounty_id": "42",
    "merged_at": null,
    "cooling_until": null
  },
  "spec_refs": ["specs/003-web-ai-agent/spec.md"],
  "labels": ["code3", "open"]
}
```

**幂等键**: `issue_hash = SHA256(canonical_json(repo + issue_number))`

---

### 1.2 类型对照表

| 字段 | Move 合约 | TypeScript | Frontend 展示 | GitHub Issue |
|------|-----------|-----------|--------------|--------------|
| `bounty_id` | `u64` | `string` | `"#42"` | `metadata.bounty.bounty_id` |
| `sponsor` | `address` | `string (0x...)` | `"0x1234...5678"` | - |
| `winner` | `Option<address>` | `string \| null` | `"0xabcd...ef01"` | - |
| `amount` | `u64` | `string` | `"10 USDT"` | `metadata.bounty.amount` |
| `issue_hash` | `vector<u8>` | `string (hex)` | - | SHA256 计算 |
| `status` | `u8 (0-6)` | `BountyStatus` | `"Open"` | `labels: ["code3", "open"]` |
| `merged_at` | `Option<u64>` | `number \| null` | `"2025-01-15 10:30"` | `metadata.bounty.merged_at` |
| `cooling_until` | `Option<u64>` | `number \| null` | `"3 days left"` | `metadata.bounty.cooling_until` |

---

## 2. 状态机详解

### 2.1 状态迁移图（参考 TRUTH.md ADR-002）

```
         create_bounty (Sponsor)
              ↓
           [Open] ───────────────────┐
              ↓                      │ cancel_bounty
        accept_bounty (Worker)       │ (Sponsor only)
              ↓                      ↓
         [Started] ──────────────> [Cancelled]
              ↓
        submit_pr (Worker)
              ↓
      [PRSubmitted]
              ↓
        mark_merged (Resolver/Sponsor)
              ↓
         [Merged]
              ↓
        (7 days wait)
              ↓
      [CoolingDown]
              ↓
       claim_payout (Winner only)
              ↓
          [Paid]
```

### 2.2 状态约束

| 状态 | 允许操作 | 权限要求 | 合约函数 |
|------|---------|---------|---------|
| **Open** | `accept_bounty` | 任意 Worker | `accept_bounty()` |
| **Open** | `cancel_bounty` | Sponsor only | `cancel_bounty()` |
| **Started** | `submit_pr` | Winner (接单者) | `submit_pr()` |
| **Started** | `cancel_bounty` | Sponsor only | `cancel_bounty()` |
| **PRSubmitted** | `mark_merged` | Resolver/Sponsor | `mark_merged()` |
| **Merged** | 自动进入 CoolingDown | 系统 | - |
| **CoolingDown** | `claim_payout` | Winner + 冷静期结束 | `claim_payout()` |

**关键约束**:
- `cancel_bounty` 只能在 `Open` 或 `Started` 状态调用
- `mark_merged` 要求 PR 已合并（由 Webhook 校验）
- `claim_payout` 要求 `block_timestamp >= cooling_until`
- 首个合并的 PR 对应的 Worker 成为 `winner`（多接单并发场景）

---

## 3. MCP 工具输入输出契约

### 3.1 spec-kit-mcp 工具

#### 3.1.1 `spec-kit-mcp.specify`

**文件路径**: [Code3/spec-mcp/spec-kit-mcp/src/tools/specify.ts](../../spec-mcp/spec-kit-mcp/src/tools/specify.ts)

```typescript
interface SpecifyInput {
  feature_description: string;   // 需求描述（技术无关）
  allow_overwrite?: boolean;     // 是否覆盖现有 spec.md
}

interface SpecifyOutput {
  feature_id: string;            // "003-web-ai-agent"
  spec_path: string;             // "specs/003-web-ai-agent/spec.md"
  content: string;               // spec.md 内容
}
```

#### 3.1.2 `spec-kit-mcp.plan`

**文件路径**: [Code3/spec-mcp/spec-kit-mcp/src/tools/plan.ts](../../spec-mcp/spec-kit-mcp/src/tools/plan.ts)

```typescript
interface PlanInput {
  spec_path: string;             // "specs/003-web-ai-agent/spec.md"
  allow_overwrite?: boolean;
}

interface PlanOutput {
  plan_path: string;             // "specs/003-web-ai-agent/plan.md"
  content: string;
}
```

#### 3.1.3 `spec-kit-mcp.tasks`

**文件路径**: [Code3/spec-mcp/spec-kit-mcp/src/tools/tasks.ts](../../spec-mcp/spec-kit-mcp/src/tools/tasks.ts)

```typescript
interface TasksInput {
  plan_path: string;             // "specs/003-web-ai-agent/plan.md"
  allow_overwrite?: boolean;
}

interface TasksOutput {
  tasks_path: string;            // "specs/003-web-ai-agent/tasks.md"
  content: string;
}
```

#### 3.1.4 `spec-kit-mcp.clarify` ✨

**文件路径**: [Code3/spec-mcp/spec-kit-mcp/src/tools/clarify.ts](../../spec-mcp/spec-kit-mcp/src/tools/clarify.ts)

```typescript
interface ClarifyInput {
  spec_path: string;             // "specs/003-web-ai-agent/spec.md"
  max_questions?: number;        // 默认 5
  interactive?: boolean;         // 默认 true（等待用户回答）
  categories?: string[];         // 可选筛选（11 类中选择）
}

interface ClarifyOutput {
  questions: Array<{
    category: "功能边界" | "数据模型" | "用户体验" | "质量属性" |
              "集成点" | "边界条件" | "术语定义" | "完成信号" |
              "非功能需求" | "技术约束" | "假设与风险";
    question: string;
    context: string;             // 引发问题的原始文本
    answer?: string;             // 用户回答（交互模式）
  }>;
  updated_spec_path?: string;    // 若自动补充，返回更新后的 spec.md 路径
}
```

**11 类检查**（对标 spec-kit `/clarify`）:
1. 功能边界（Scope）
2. 数据模型（Data Model）
3. 用户体验（UX）
4. 质量属性（Quality）
5. 集成点（Integration）
6. 边界条件（Edge Cases）
7. 术语定义（Terminology）
8. 完成信号（Done Criteria）
9. 非功能需求（Non-Functional）
10. 技术约束（Constraints）
11. 假设与风险（Assumptions）

#### 3.1.5 `spec-kit-mcp.analyze` ✨

**文件路径**: [Code3/spec-mcp/spec-kit-mcp/src/tools/analyze.ts](../../spec-mcp/spec-kit-mcp/src/tools/analyze.ts)

```typescript
interface AnalyzeInput {
  spec_path: string;
  plan_path?: string;            // 可选（若已生成）
  tasks_path?: string;           // 可选（若已生成）
  constitution_path?: string;    // 默认 ".specify/memory/constitution.md"
}

interface AnalyzeOutput {
  issues: Array<{
    category: "duplication" | "ambiguity" | "insufficiency" |
              "constitution" | "coverage" | "inconsistency";
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    location: string;            // 文件路径 + 行号
    description: string;
    suggestion: string;
  }>;
  constitution_violations: string[];  // CRITICAL 级别违规
  summary: {
    total_issues: number;
    critical_count: number;
    pass: boolean;               // 是否可继续执行（无 CRITICAL）
  };
}
```

**6 类检测** + Constitution Authority（对标 spec-kit `/analyze`）:
1. Duplication（重复）
2. Ambiguity（模糊）
3. Insufficiency（不足）
4. Constitution（Constitution 对齐）
5. Coverage（覆盖 gap）
6. Inconsistency（不一致）

#### 3.1.6 `spec-kit-mcp.implement` ✨

**文件路径**: [Code3/spec-mcp/spec-kit-mcp/src/tools/implement.ts](../../spec-mcp/spec-kit-mcp/src/tools/implement.ts)

```typescript
interface ImplementInput {
  task_id: string;               // 从 tasks.md 选择（如 "task-001"）
  tasks_path: string;            // "specs/003-web-ai-agent/tasks.md"
  strict_tdd?: boolean;          // 默认 true
  phase?: "all" | "setup" | "tests" | "core" | "integration" | "polish";
}

interface ImplementOutput {
  phase: string;                 // 当前阶段
  changes: Array<{
    file_path: string;
    action: "created" | "modified" | "deleted";
    diff: string;                // Git diff 格式
  }>;
  tests: {
    passed: number;
    failed: number;
    skipped: number;
    output: string;              // 测试输出
  };
  next_phase?: string;           // 若分阶段执行，返回下一阶段
}
```

**5 阶段执行**（对标 spec-kit `/implement`）:
1. **Setup** — 安装依赖、配置环境
2. **Tests (TDD - Red)** — 先写测试，必须失败
3. **Core (TDD - Green)** — 实现核心逻辑，测试通过
4. **Integration** — 集成测试（真实环境，避免 mock）
5. **Polish** — 重构、文档、Linter

#### 3.1.7 `spec-kit-mcp.constitution`

**文件路径**: [Code3/spec-mcp/spec-kit-mcp/src/tools/constitution.ts](../../spec-mcp/spec-kit-mcp/src/tools/constitution.ts)

```typescript
interface ConstitutionInput {
  action: "get" | "update";
  content?: string;              // 更新时提供
}

interface ConstitutionOutput {
  constitution_path: string;     // ".specify/memory/constitution.md"
  content: string;
}
```

---

### 3.2 aptos-chain-mcp 工具

#### 3.2.1 `aptos-chain-mcp.create_bounty`

**文件路径**: [Code3/spec-mcp/aptos-mcp/src/tools/create_bounty.ts](../../spec-mcp/aptos-mcp/src/tools/create_bounty.ts)

```typescript
interface CreateBountyInput {
  repo_url: string;
  issue_hash: string;            // hex string (0x...)
  asset: string;                 // "USDT"
  amount: string;                // "10"
}

interface CreateBountyOutput {
  bounty_id: string;
  tx_hash: string;
  status: "Open";
}
```

**合约调用**:
```move
public entry fun create_bounty<CoinType>(
    sponsor: &signer,
    repo_url: String,
    issue_hash: vector<u8>,
    amount: u64
) acquires BountyStore
```

#### 3.2.2 `aptos-chain-mcp.accept_bounty`

```typescript
interface AcceptBountyInput {
  bounty_id: string;
}

interface AcceptBountyOutput {
  bounty_id: string;
  tx_hash: string;
  winner: string;                // Worker 地址
  status: "Started";
}
```

#### 3.2.3 `aptos-chain-mcp.submit_pr`

```typescript
interface SubmitPRInput {
  bounty_id: string;
  pr_url: string;
}

interface SubmitPROutput {
  bounty_id: string;
  tx_hash: string;
  status: "PRSubmitted";
}
```

#### 3.2.4 `aptos-chain-mcp.mark_merged`

```typescript
interface MarkMergedInput {
  bounty_id: string;
  pr_url: string;
}

interface MarkMergedOutput {
  bounty_id: string;
  tx_hash: string;
  merged_at: number;
  cooling_until: number;         // merged_at + 7 days
  status: "CoolingDown";
}
```

#### 3.2.5 `aptos-chain-mcp.claim_payout`

```typescript
interface ClaimPayoutInput {
  bounty_id: string;
}

interface ClaimPayoutOutput {
  bounty_id: string;
  tx_hash: string;
  amount: string;
  status: "Paid";
}
```

#### 3.2.6 `aptos-chain-mcp.cancel_bounty`

```typescript
interface CancelBountyInput {
  bounty_id: string;
}

interface CancelBountyOutput {
  bounty_id: string;
  tx_hash: string;
  refund_amount: string;
  status: "Cancelled";
}
```

---

### 3.3 github-mcp-server 工具（外部官方）

Code3 使用官方 [github-mcp-server](https://github.com/github/github-mcp-server) 处理所有 GitHub 操作。

**常用工具**:
- `github-mcp-server.create_issue` — 创建 Issue（含 code3/v1 元数据）
- `github-mcp-server.update_issue` — 更新 Issue（回写 bounty_id）
- `github-mcp-server.fork` — Fork 仓库
- `github-mcp-server.create_pr` — 创建 PR
- `github-mcp-server.merge_pr` — 合并 PR
- `github-mcp-server.add_comment` — 添加评论

详细接口参考官方文档。

---

## 4. 事件定义（链上审计）

### 4.1 合约事件

**文件路径**: [Code3/task3/aptos/sources/bounty.move](../../task3/aptos/sources/bounty.move)

```move
struct BountyCreatedEvent has drop, store {
    bounty_id: u64,
    sponsor: address,
    repo_url: String,
    issue_hash: vector<u8>,
    amount: u64,
    asset: Object<Metadata>,
}

struct BountyAcceptedEvent has drop, store {
    bounty_id: u64,
    winner: address,
}

struct PRSubmittedEvent has drop, store {
    bounty_id: u64,
    pr_url: String,
}

struct BountyMergedEvent has drop, store {
    bounty_id: u64,
    merged_at: u64,
    cooling_until: u64,
}

struct BountyPaidEvent has drop, store {
    bounty_id: u64,
    winner: address,
    amount: u64,
}

struct BountyCancelledEvent has drop, store {
    bounty_id: u64,
    sponsor: address,
}
```

### 4.2 事件索引

**实现路径**: [Code3/task3/backend/src/indexer/events.ts](../../task3/backend/src/indexer/events.ts)

**索引策略**:
- 监听合约地址的所有事件（通过 Aptos Indexer API）
- 存储到本地数据库（SQLite/PostgreSQL）
- 提供查询接口给 Dashboard

---

## 5. 错误码定义

### 5.1 合约错误码

**文件路径**: [Code3/task3/aptos/sources/bounty.move](../../task3/aptos/sources/bounty.move)

```move
const E_BOUNTY_NOT_FOUND: u64 = 1;
const E_INVALID_STATUS: u64 = 2;
const E_NOT_SPONSOR: u64 = 3;
const E_NOT_WINNER: u64 = 4;
const E_COOLING_PERIOD_NOT_ENDED: u64 = 5;
const E_INSUFFICIENT_BALANCE: u64 = 6;
const E_ALREADY_ACCEPTED: u64 = 7;
const E_INVALID_ASSET: u64 = 8;
const E_DUPLICATE_PR: u64 = 9;
```

### 5.2 MCP 工具错误码

**文件路径**: [Code3/spec-mcp/aptos-mcp/src/errors.ts](../../spec-mcp/aptos-mcp/src/errors.ts)

```typescript
export enum ErrorCode {
  // GitHub 相关
  GITHUB_API_ERROR = "GITHUB_API_ERROR",
  GITHUB_RATE_LIMIT = "GITHUB_RATE_LIMIT",
  ISSUE_NOT_FOUND = "ISSUE_NOT_FOUND",
  PR_NOT_FOUND = "PR_NOT_FOUND",

  // Aptos 相关
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  INSUFFICIENT_GAS = "INSUFFICIENT_GAS",
  BOUNTY_NOT_FOUND = "BOUNTY_NOT_FOUND",
  INVALID_STATUS = "INVALID_STATUS",
  PERMISSION_DENIED = "PERMISSION_DENIED",

  // 业务逻辑
  DUPLICATE_ISSUE_HASH = "DUPLICATE_ISSUE_HASH",
  COOLING_PERIOD_NOT_ENDED = "COOLING_PERIOD_NOT_ENDED",
  ALREADY_ACCEPTED = "ALREADY_ACCEPTED",
}

export class Code3Error extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}
```

---

## 6. 常量定义

### 6.1 合约常量

```move
const COOLING_PERIOD_SECONDS: u64 = 604800;  // 7 days
const MAX_BOUNTY_AMOUNT: u64 = 1000000;      // 100 万 USDT (6 decimals)
const MIN_BOUNTY_AMOUNT: u64 = 1;            // 0.000001 USDT
```

### 6.2 TypeScript 常量

**文件路径**: [Code3/spec-mcp/aptos-mcp/src/constants.ts](../../spec-mcp/aptos-mcp/src/constants.ts)

```typescript
export const APTOS_TESTNET_URL = "https://fullnode.testnet.aptoslabs.com";
export const APTOS_MAINNET_URL = "https://fullnode.mainnet.aptoslabs.com";

export const USDT_TESTNET_ADDRESS = "0x...";  // Testnet USDT FA 地址
export const USDT_MAINNET_ADDRESS = "0x...";  // Mainnet USDT FA 地址

export const CONTRACT_ADDRESS_TESTNET = "0x...";
export const CONTRACT_ADDRESS_MAINNET = "0x...";

export const COOLING_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days
```

---

## 7. 幂等键设计

| 操作 | 幂等键 | 存储位置 | MCP 工具 |
|------|--------|---------|---------|
| 创建 Issue | `issue_hash` | 合约 | `spec-kit-mcp.specify` + `github-mcp-server.create_issue` |
| 创建赏金 | `issue_hash` | 合约 | `aptos-chain-mcp.create_bounty` |
| 接受赏金 | `bounty_id + winner` | 合约 | `aptos-chain-mcp.accept_bounty` |
| 提交 PR | `bounty_id + pr_url` | 合约 | `aptos-chain-mcp.submit_pr` |
| 标记合并 | `delivery_id` (Webhook) | Redis/SQLite | Webhook Backend → `aptos-chain-mcp.mark_merged` |
| 领取赏金 | `bounty_id + tx_hash` | 合约 | `aptos-chain-mcp.claim_payout` |

---

## 8. 参考

- 数据流详细说明：[01-datastream.md](./01-datastream.md)
- 系统架构：[02-architecture.md](./02-architecture.md)
- MCP 工具完整契约：[06-interfaces.md](./06-interfaces.md)
- 合约实现：[Code3/task3/aptos/sources/bounty.move](../../task3/aptos/sources/bounty.move)
- TRUTH.md ADR-002/003：[../../TRUTH.md](../../TRUTH.md)

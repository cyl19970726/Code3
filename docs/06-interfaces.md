# 06 — 接口与契约（MCP 工具 + 合约 + API）

> 本文定义 Code3 项目的所有对外接口：MCP 工具、Aptos 合约 Entry Functions、API 端点与配置规范。
> 参考：[TRUTH.md](../../TRUTH.md) ADR-009（三大 MCP 统一架构）、ADR-006（Aptos 集成）

---

## 1. MCP 工具接口

所有 MCP 工具的完整输入输出契约、错误码、使用示例详见 [05-data-model.md Section 3](./05-data-model.md#3-mcp-工具输入输出契约)。本节只列出工具清单与调用方式。

---

### 1.1 spec-kit-mcp（7 个工具）

**包名**: `@code3/spec-kit-mcp`
**文件路径**: [Code3/spec-mcp/spec-kit-mcp/](../../spec-mcp/spec-kit-mcp/)

所有工具的完整输入输出契约、错误码、使用示例详见 [05-data-model.md Section 3.1](./05-data-model.md#31-spec-kit-mcp-工具)。

**工具清单**:

1. **`specify`** — 生成 spec.md
2. **`plan`** — 生成 plan.md
3. **`tasks`** — 生成 tasks.md
4. **`clarify`** — 澄清规格（11 类检查）
5. **`analyze`** — 质量检查（6 类检测 + Constitution）
6. **`implement`** — TDD 执行（5 阶段）
7. **`constitution`** — 管理开发宪法

---

### 1.2 aptos-chain-mcp（11 个工具：6 写 + 5 读）

**包名**: `@code3/aptos-chain-mcp`
**文件路径**: [Code3/spec-mcp/aptos-mcp/](../../spec-mcp/aptos-mcp/)

所有工具的完整输入输出契约、错误码、使用示例详见 [05-data-model.md Section 3.2](./05-data-model.md#32-aptos-chain-mcp-工具)。

**写操作工具**（6 个）:

1. **`create_bounty`** — 创建链上赏金
2. **`accept_bounty`** — 接受赏金（Worker）
3. **`submit_pr`** — 链上记录 PR 提交
4. **`mark_merged`** — 标记 PR 合并（Resolver/Sponsor）
5. **`claim_payout`** — 领取赏金（Winner）
6. **`cancel_bounty`** — 取消赏金（Sponsor）

**读操作工具**（5 个，所有角色可用）:

7. **`get_bounty`** — 获取赏金详情（P0，测试验证必需）
8. **`get_bounty_by_issue_hash`** — 通过 issue_hash 查询赏金 ID（P0，幂等性检查）
9. **`list_bounties`** — 列出所有赏金 ID（P1，Dashboard）
10. **`get_bounties_by_sponsor`** — 查询我发布的赏金（P1）
11. **`get_bounties_by_winner`** — 查询我获得的赏金（P1）

---

### 1.3 github-mcp-server（外部官方）

**包名**: `github-mcp-server`（官方）
**文档**: https://github.com/github/github-mcp-server

Code3 使用官方 github-mcp-server 处理所有 GitHub 操作。

**常用工具**:
- `create_issue` — 创建 Issue（含 code3/v1 元数据）
- `update_issue` — 更新 Issue（回写 bounty_id）
- `fork` — Fork 仓库
- `create_pr` — 创建 PR
- `merge_pr` — 合并 PR
- `add_comment` — 添加评论
- `add_labels` — 添加标签

详细接口参考官方文档。

---

### 1.4 工具权限矩阵

| 工具 | Requester | Worker | Reviewer | 说明 |
|------|-----------|--------|----------|------|
| **spec-kit-mcp.specify** | ✅ | ✅ | ✅ | 所有角色都可创建 Spec |
| **spec-kit-mcp.plan** | ✅ | ✅ | ❌ | Requester 创建，Worker 生成 |
| **spec-kit-mcp.tasks** | ✅ | ✅ | ❌ | Requester 创建，Worker 生成 |
| **spec-kit-mcp.clarify** | ❌ | ✅ | ❌ | Worker 澄清需求 |
| **spec-kit-mcp.analyze** | ❌ | ✅ | ❌ | Worker 质量检查 |
| **spec-kit-mcp.implement** | ❌ | ✅ | ❌ | Worker 执行实现 |
| **spec-kit-mcp.constitution** | ✅ | ✅ | ✅ | 查看/更新开发宪法 |
| **github-mcp-server.create_issue** | ✅ | ❌ | ❌ | Requester 发布任务 |
| **github-mcp-server.fork** | ❌ | ✅ | ❌ | Worker Fork 仓库 |
| **github-mcp-server.create_pr** | ❌ | ✅ | ❌ | Worker 提交 PR |
| **github-mcp-server.merge_pr** | ❌ | ❌ | ✅ | Reviewer 合并 PR |
| **aptos-chain-mcp.create_bounty** | ✅ | ❌ | ❌ | Requester 创建赏金 |
| **aptos-chain-mcp.accept_bounty** | ❌ | ✅ | ❌ | Worker 接单 |
| **aptos-chain-mcp.submit_pr** | ❌ | ✅ | ❌ | Worker 记录 PR |
| **aptos-chain-mcp.mark_merged** | ❌ | ❌ | ✅ | Reviewer/Webhook 标记合并 |
| **aptos-chain-mcp.claim_payout** | ❌ | ✅ | ❌ | Worker 领取赏金 |
| **aptos-chain-mcp.cancel_bounty** | ✅ | ❌ | ✅ | Sponsor 取消赏金 |
| **aptos-chain-mcp.get_bounty** | ✅ | ✅ | ✅ | 所有角色都可查询赏金详情 |
| **aptos-chain-mcp.get_bounty_by_issue_hash** | ✅ | ✅ | ✅ | 所有角色都可检查幂等性 |
| **aptos-chain-mcp.list_bounties** | ✅ | ✅ | ✅ | 所有角色都可列出赏金 |
| **aptos-chain-mcp.get_bounties_by_sponsor** | ✅ | ✅ | ✅ | 所有角色都可查询特定 Sponsor |
| **aptos-chain-mcp.get_bounties_by_winner** | ✅ | ✅ | ✅ | 所有角色都可查询特定 Winner |

**配置指导**：
- Requester 在 AGENTS.md/CLAUDE.md 中只列出 ✅ 的工具
- Worker 在 AGENTS.md/CLAUDE.md 中列出所有 ✅ 的工具
- Reviewer 在 AGENTS.md/CLAUDE.md 中只列出 ✅ 的工具

---

## 2. Aptos 合约 Entry Functions

**文件路径**: [Code3/task3/aptos/sources/bounty.move](../../task3/aptos/sources/bounty.move)

### 2.1 `create_bounty`

```move
public entry fun create_bounty(
    sponsor: &signer,
    repo_url: String,
    issue_hash: vector<u8>,
    asset: Object<Metadata>,  // Fungible Asset 元数据对象
    amount: u64
) acquires BountyStore
```

**权限**: 任意地址
**前置条件**: `amount >= MIN_BOUNTY_AMOUNT && amount <= MAX_BOUNTY_AMOUNT`
**事件**: `BountyCreatedEvent`
**资产支持**: 支持任何 Fungible Asset（推荐使用 APT 进行测试）

**示例资产地址**：
- APT (AptosCoin): `0x1::aptos_coin::AptosCoin`
- 其他 FA: 任何符合 Fungible Asset 标准的资产

### 2.2 `accept_bounty`

```move
public entry fun accept_bounty(
    worker: &signer,
    bounty_id: u64
) acquires BountyStore
```

**权限**: 任意地址（自动成为 winner）
**前置条件**: `status == Open`
**事件**: `BountyAcceptedEvent`

### 2.3 `submit_pr`

```move
public entry fun submit_pr(
    worker: &signer,
    bounty_id: u64,
    pr_url: String
) acquires BountyStore
```

**权限**: `signer == winner`
**前置条件**: `status == Started`
**事件**: `PRSubmittedEvent`

### 2.4 `mark_merged`

```move
public entry fun mark_merged(
    resolver: &signer,
    bounty_id: u64,
    pr_url: String
) acquires BountyStore
```

**权限**: `signer == sponsor || signer == resolver`
**前置条件**: `status == PRSubmitted`
**事件**: `BountyMergedEvent`

### 2.5 `claim_payout`

```move
public entry fun claim_payout(
    worker: &signer,
    bounty_id: u64
) acquires BountyStore
```

**权限**: `signer == winner`
**前置条件**: `status == CoolingDown && block_timestamp >= cooling_until`
**事件**: `BountyPaidEvent`

### 2.6 `cancel_bounty`

```move
public entry fun cancel_bounty(
    sponsor_signer: &signer,
    bounty_id: u64
) acquires BountyStore
```

**权限**: `signer == sponsor`
**前置条件**: `status == Open || status == Started`
**事件**: `BountyCancelledEvent`

### 2.7 View Functions（只读查询）

**参考**: [TRUTH.md ADR-010](../../TRUTH.md)（View Functions & Read Operations）

View functions 用于链上状态查询，不修改状态，无需签名。所有 MCP 角色都可调用。

#### 2.7.1 `get_bounty`

```move
#[view]
public fun get_bounty(bounty_id: u64): (
    u64,              // id
    address,          // sponsor
    Option<address>,  // winner
    String,           // repo_url
    vector<u8>,       // issue_hash
    Option<String>,   // pr_url
    Object<Metadata>, // asset
    u64,              // amount
    u8,               // status
    Option<u64>,      // merged_at
    Option<u64>,      // cooling_until
    u64               // created_at
) acquires BountyStore
```

**用途**: 获取赏金详情（P0，测试验证必需）
**返回**: Bounty 完整信息（12 个字段）
**错误**: `E_BOUNTY_NOT_FOUND` (bounty_id 不存在)

#### 2.7.2 `get_bounty_by_issue_hash`

```move
#[view]
public fun get_bounty_by_issue_hash(issue_hash: vector<u8>): u64 acquires BountyStore
```

**用途**: 通过 issue_hash 查询赏金 ID（P0，幂等性检查）
**返回**: `bounty_id`（0 表示不存在）
**说明**: Move 不支持 Option 返回，使用 0 作为哨兵值

#### 2.7.3 `list_bounties`

```move
#[view]
public fun list_bounties(): vector<u64> acquires BountyStore
```

**用途**: 列出所有赏金 ID（P1，Dashboard）
**返回**: `vector<u64>`（赏金 ID 数组）
**说明**: 只返回 ID，调用 `get_bounty(id)` 获取详情

#### 2.7.4 `get_bounties_by_sponsor`

```move
#[view]
public fun get_bounties_by_sponsor(sponsor: address): vector<u64> acquires BountyStore
```

**用途**: 查询我发布的赏金（P1）
**返回**: `vector<u64>`（赏金 ID 数组）

#### 2.7.5 `get_bounties_by_winner`

```move
#[view]
public fun get_bounties_by_winner(winner: address): vector<u64> acquires BountyStore
```

**用途**: 查询我获得的赏金（P1）
**返回**: `vector<u64>`（赏金 ID 数组）

---

## 3. API 端点（Webhook 后端）

**实现路径**: [Code3/task3/backend/src/](../../task3/backend/src/)

### 3.1 `POST /webhook`

**职责**: 接收 GitHub Webhook（PR 合并事件）
**实现**: [src/webhook/github.ts](../../task3/backend/src/webhook/github.ts)

```typescript
// 请求
interface WebhookRequest {
  headers: {
    "X-GitHub-Event": "pull_request";
    "X-Hub-Signature-256": string;
    "X-GitHub-Delivery": string;  // 幂等键
  };
  body: {
    action: "closed";
    pull_request: {
      merged: true;
      html_url: string;
      number: number;
    };
    // ...
  };
}

// 响应
interface WebhookResponse {
  status: 200 | 400 | 401 | 500;
  body: {
    success: boolean;
    bounty_id?: string;
    tx_hash?: string;
    error?: string;
  };
}
```

**签名校验**:
```typescript
const signature = req.headers["x-hub-signature-256"];
const expectedSignature = `sha256=${crypto
  .createHmac("sha256", GITHUB_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest("hex")}`;
assert(signature === expectedSignature);
```

### 3.2 `GET /api/events`

**职责**: 查询链上事件（供 Dashboard 使用）
**实现**: [src/indexer/query.ts](../../task3/backend/src/indexer/query.ts)

```typescript
// 请求
interface EventsRequest {
  query: {
    bounty_id?: string;
    status?: string;
    limit?: number;              // 默认 20
    offset?: number;             // 默认 0
  };
}

// 响应
interface EventsResponse {
  events: Array<{
    type: "BountyCreated" | "BountyAccepted" | "PRSubmitted" |
          "BountyMerged" | "BountyPaid" | "BountyCancelled";
    bounty_id: string;
    timestamp: number;
    data: unknown;
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

---

## 4. 配置规范

### 4.1 环境变量

**参考文件**: [.env.example](../../.env.example)

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

### 4.2 MCP Server 配置（Codex/Claude）

#### Codex 配置（AGENTS.md）

**文件路径**: [.codex/AGENTS.md](../../.codex/AGENTS.md)

```markdown
## MCP Servers

1. **spec-kit-mcp**
   - 启动: `npx -y @code3/spec-kit-mcp`
   - 提供工具: specify, plan, tasks, clarify, analyze, implement, constitution

2. **aptos-chain-mcp**
   - 启动: `npx -y @code3/aptos-chain-mcp`
   - 提供工具: create_bounty, accept_bounty, submit_pr, mark_merged, claim_payout, cancel_bounty

3. **github-mcp-server**（官方）
   - 启动: `npx -y @modelcontextprotocol/server-github`
   - 提供工具: create_issue, fork, create_pr, merge_pr, add_comment, add_labels
```

#### Claude 配置（claude_desktop_config.json）

**文件路径**: `~/.claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "spec-kit-mcp": {
      "command": "npx",
      "args": ["-y", "@code3/spec-kit-mcp"],
      "env": {}
    },
    "aptos-chain-mcp": {
      "command": "npx",
      "args": ["-y", "@code3/aptos-chain-mcp"],
      "env": {
        "APTOS_API_KEY": "your_api_key",
        "APTOS_PRIVATE_KEY": "0x..."
      }
    },
    "github-mcp-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxx"
      }
    }
  }
}
```

---

## 5. 错误处理与重试策略

### 5.1 MCP 工具错误码统一定义

**文件路径**: [Code3/spec-mcp/aptos-mcp/src/errors.ts](../../spec-mcp/aptos-mcp/src/errors.ts)

```typescript
export enum ErrorCode {
  // GitHub 相关
  GITHUB_API_ERROR = "GITHUB_API_ERROR",
  GITHUB_RATE_LIMIT = "GITHUB_RATE_LIMIT",
  ISSUE_NOT_FOUND = "ISSUE_NOT_FOUND",
  PR_NOT_FOUND = "PR_NOT_FOUND",
  FORK_FAILED = "FORK_FAILED",

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
  SPEC_VALIDATION_FAILED = "SPEC_VALIDATION_FAILED",
  CONSTITUTION_VIOLATION = "CONSTITUTION_VIOLATION",
}

export class Code3Error extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "Code3Error";
  }
}
```

### 5.2 重试策略

**实现路径**: [Code3/spec-mcp/aptos-mcp/src/utils/retry.ts](../../spec-mcp/aptos-mcp/src/utils/retry.ts)

```typescript
interface RetryConfig {
  max_attempts: number;          // 最大重试次数
  backoff: "exponential" | "linear";
  initial_delay_ms: number;
  max_delay_ms: number;
}

const DEFAULT_RETRY_CONFIG: Record<ErrorCode, RetryConfig> = {
  GITHUB_RATE_LIMIT: {
    max_attempts: 5,
    backoff: "exponential",
    initial_delay_ms: 1000,
    max_delay_ms: 32000,
  },
  TRANSACTION_FAILED: {
    max_attempts: 3,
    backoff: "exponential",
    initial_delay_ms: 2000,
    max_delay_ms: 8000,
  },
  // ...
};
```

---

## 6. 参考

- 数据模型详细定义：[05-data-model.md](./05-data-model.md)
- 系统架构：[02-architecture.md](./02-architecture.md)
- 快速开始与使用示例：[04-quickstart.md](./04-quickstart.md)
- 安全策略（密钥管理）：[09-security.md](./09-security.md)
- TRUTH.md ADR-005/006：[../../TRUTH.md](../../TRUTH.md)

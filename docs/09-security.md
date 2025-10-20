# 09 — 安全策略与密钥管理

> 本文定义 Code3 项目的安全架构、密钥管理策略、权限边界与审计机制。
> 参考：[TRUTH.md](../../TRUTH.md) ADR-007（MVP 私钥签名，M4 钱包连接）

---

## 1. 安全原则

### 1.1 核心理念

- **链上为权威**：核心状态存储在 Aptos 合约，GitHub 仅作镜像
- **零密钥存储**：Dashboard 不保存任何私钥，仅展示数据
- **最小权限**：每个组件只拥有完成任务所需的最小权限
- **审计优先**：所有状态变更触发链上事件，可回溯审计

### 1.2 威胁模型

| 威胁 | 影响 | 缓解措施 |
|------|------|---------|
| GitHub Token 泄漏 | 恶意创建 Issue/PR | Token 最小权限（repo scope），定期轮换 |
| Worker 私钥泄漏 | 恶意接单/提交 PR | 私钥本机存储，不上传 GitHub，使用环境变量 |
| Resolver 私钥泄漏 | 恶意 mark_merged | 私钥加密存储（Kubernetes Secret），可选启用 |
| Webhook 伪造 | 虚假 PR 合并通知 | HMAC 签名校验（`GITHUB_WEBHOOK_SECRET`） |
| Sybil 攻击 | 同一 Worker 多次接单 | 合约限制：一个 bounty 只能被一个 address 接受 |
| 恶意取消 | Sponsor 在冷静期后取消 | 合约约束：`cancel_bounty` 仅允许在 Open/Started 状态 |

---

## 2. 密钥管理

### 2.1 密钥类型与用途

| 密钥类型 | 用途 | 存储位置 | 权限范围 | 轮换策略 |
|----------|------|---------|---------|---------|
| `GITHUB_TOKEN` | GitHub API 操作（Issue/PR/Fork） | 本机 `.env` / GitHub Secrets | `repo`, `workflow` | 3 个月 |
| `APTOS_PRIVATE_KEY` | Worker 自动化签名（accept/submit/claim） | 本机 `.env` | Worker 自身 | 6 个月 |
| `RESOLVER_PRIVATE_KEY` | Webhook 自动 mark_merged | 后端容器 Secret | Resolver 角色 | 6 个月 |
| `GITHUB_WEBHOOK_SECRET` | Webhook 签名校验 | 后端容器 Secret | - | 12 个月 |
| `APTOS_API_KEY` | Aptos 全节点 API 调用 | 本机 `.env` / Secret | 读取公开数据 | 不轮换 |
| `APTOS_GAS_STATION_API_KEY` | Gas Station 赞助交易费 | 本机 `.env` / Secret | Gas 赞助 | 不轮换 |

### 2.2 密钥生成

#### GitHub Token

```bash
# 1. 访问 https://github.com/settings/tokens/new
# 2. 选择 Scopes:
#    - repo (full control of private repositories)
#    - workflow (update GitHub Actions workflows)
# 3. 复制 Token: ghp_xxxxxxxxxxxxxxxxxxxx
# 4. 保存到 .env
echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx" >> .env
```

#### Aptos Private Key

```bash
# 方式 1: 使用 Aptos CLI 生成
aptos init --network testnet
# 输出: 0x... (Private Key)

# 方式 2: 使用 TypeScript 生成
import { Account } from "@aptos-labs/ts-sdk";
const account = Account.generate();
console.log(account.privateKey.toString());

# 保存到 .env
echo "APTOS_PRIVATE_KEY=0x..." >> .env
```

#### Webhook Secret

```bash
# 生成随机字符串
openssl rand -hex 32

# 保存到 .env 和 GitHub Webhook 配置
echo "GITHUB_WEBHOOK_SECRET=..." >> .env
```

### 2.3 密钥存储

#### 本机开发环境

**文件**: `.env.local`（加入 `.gitignore`）

```env
# ===== GitHub =====
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# ===== Aptos =====
APTOS_NETWORK=testnet
APTOS_API_KEY=your_aptos_api_key
APTOS_PRIVATE_KEY=0x...                           # Worker 私钥

# ===== Backend (可选) =====
RESOLVER_PRIVATE_KEY=0x...                        # Resolver 私钥
GITHUB_WEBHOOK_SECRET=...
```

**安全建议**:
- ✅ 使用 `.env.local`（不提交到 Git）
- ✅ 使用操作系统钥匙串（macOS Keychain / Linux Secret Service）
- ❌ 不要硬编码到代码中
- ❌ 不要提交到 GitHub

#### 生产环境（容器）

**方式 1: Kubernetes Secret**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: code3-backend-secrets
type: Opaque
stringData:
  GITHUB_WEBHOOK_SECRET: "..."
  RESOLVER_PRIVATE_KEY: "0x..."
  APTOS_API_KEY: "..."
```

**方式 2: Docker Secrets**

```bash
# 创建 Secret
echo "0x..." | docker secret create resolver_private_key -

# 在 docker-compose.yml 中引用
services:
  backend:
    secrets:
      - resolver_private_key
```

**方式 3: 环境变量（Railway / Vercel）**

- Railway: Dashboard → Environment Variables
- Vercel: Dashboard → Settings → Environment Variables

---

## 3. 权限边界

### 3.1 MCP 工具权限

| 工具 | 需要权限 | 最小 Scope |
|------|---------|-----------|
| `spec-kit-mcp.specify` | 无 | - |
| `spec-kit-mcp.publish_issue_with_metadata` | `GITHUB_TOKEN` | `repo` |
| `spec-kit-mcp.accept_task` | `APTOS_PRIVATE_KEY` | Worker 自身 |
| `spec-kit-mcp.fork_and_prepare` | `GITHUB_TOKEN` | `repo` |
| `spec-kit-mcp.open_pr` | `GITHUB_TOKEN` | `repo` |
| `spec-kit-mcp.submit_pr` | `APTOS_PRIVATE_KEY` | Worker 自身 |
| `spec-kit-mcp.claim_payout` | `APTOS_PRIVATE_KEY` | Worker 自身 |
| `aptos.create_bounty` | `APTOS_PRIVATE_KEY` | Sponsor 自身 |
| `aptos.mark_merged` | `RESOLVER_PRIVATE_KEY` | Resolver 角色 |
| `aptos.cancel_bounty` | `APTOS_PRIVATE_KEY` | Sponsor 自身 |

### 3.2 合约权限

**文件路径**: [Code3/task3/bounty-operator/aptos/contract/sources/bounty.move](../../task3/bounty-operator/aptos/contract/sources/bounty.move)

| 函数 | 权限要求 | 校验逻辑 |
|------|---------|---------|
| `create_bounty` | 任意地址 | `signer == sponsor` |
| `accept_bounty` | 任意地址 | `signer == winner` (自动赋值) |
| `submit_pr` | Winner only | `assert!(signer::address_of(worker) == bounty.winner)` |
| `mark_merged` | Resolver/Sponsor | `assert!(signer == resolver \|\| signer == sponsor)` |
| `claim_payout` | Winner only | `assert!(signer == winner && status == CoolingDown && now >= cooling_until)` |
| `cancel_bounty` | Sponsor only | `assert!(signer == sponsor && (status == Open \|\| Started))` |

### 3.3 Webhook 签名校验

**实现路径**: [Code3/task3/backend/src/webhook/verify.ts](../../task3/backend/src/webhook/verify.ts)

```typescript
import crypto from "crypto";

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

**使用**:
```typescript
// 在 Webhook 处理器中
const signature = req.headers["x-hub-signature-256"];
const payload = JSON.stringify(req.body);

if (!verifyWebhookSignature(payload, signature, GITHUB_WEBHOOK_SECRET)) {
  return res.status(401).json({ error: "Invalid signature" });
}
```

### 3.4 类型转换规范（Move ↔ TypeScript）

> 参考：[TRUTH.md](../../TRUTH.md) ADR-011（Contract/Client Type Consistency Mechanism）

#### 问题背景

Aptos Move 合约与 TypeScript 客户端之间存在类型系统差异，导致：
1. **类型转换错误**：JavaScript string 传递给需要 u64 number 的合约函数
2. **返回值解析错误**：合约返回 Move tuple（数组），客户端期望 JavaScript object
3. **Option<T> 处理错误**：Move 的 `Option<T>` 序列化为 `{vec: []}`，需要 unwrap 逻辑

**示例 Bug**（已修复）:
```typescript
// ❌ 错误：传递 string 给 u64 参数
await client.getBounty(bountyId);  // bountyId = "1"

// ✅ 正确：转换为 number
await client.getBounty(parseInt(bountyId, 10));  // bountyId = 1
```

#### Move ↔ TypeScript 类型映射表

| Move 类型 | 链上序列化格式 | TypeScript 类型 | 转换逻辑 | 示例 |
|----------|--------------|----------------|---------|------|
| `u64` | `"123"` (string) | `string` | 输入: `parseInt(val, 10)` | `parseInt(bountyId, 10)` |
| `address` | `"0xabc..."` | `string` | 直接使用 | `sponsor` |
| `vector<u8>` | `[1,2,3]` (array) | `Uint8Array` | `Array.from(bytes)` | `Array.from(issueHashBytes)` |
| `String` | `"text"` | `string` | 直接使用 | `repo_url` |
| `Option<T>` | `{vec: []}` 或 `{vec: [value]}` | `T \| null` | `unwrapOption(opt)` | `unwrapOption(winner)` |
| `Object<T>` | `{inner: "0x..."}` | `string` | `obj.inner` | `asset.inner` |
| `tuple` | `[a, b, c]` (array) | `[A, B, C]` | 数组解构 | `const [id, sponsor, ...] = result` |

#### 实现示例

**1. 输入参数转换（u64）**

```typescript
// spec-mcp/aptos-mcp/src/aptos/client.ts
async getBounty(bountyId: string): Promise<BountyInfo | null> {
  // ✅ 转换 string → number（u64）
  const result = await this.view<any>("get_bounty", [], [parseInt(bountyId, 10)]);
  // ...
}

async acceptBounty(bountyId: string): Promise<TransactionResult> {
  // ✅ 转换 string → number（u64）
  return this.submitTransaction("accept_bounty", [], [parseInt(bountyId, 10)]);
}
```

**2. 返回值解析（tuple → object）**

```typescript
// Move 合约返回 tuple（数组格式）
#[view]
public fun get_bounty(bounty_id: u64): (u64, address, Option<address>, ...) {
  (bounty.id, bounty.sponsor, bounty.winner, ...)
}

// TypeScript 客户端解析
async getBounty(bountyId: string): Promise<BountyInfo | null> {
  const result = await this.view<any>("get_bounty", [], [parseInt(bountyId, 10)]);

  // ✅ 检查数组格式（而非 object）
  if (!result || !Array.isArray(result) || result.length < 12) {
    return null;
  }

  // ✅ 数组解构
  const [
    id,
    sponsor,
    winner,          // Option<address>
    repo_url,
    issue_hash,
    pr_url,          // Option<String>
    asset,           // Object<Metadata>
    amount,
    status,
    merged_at,       // Option<u64>
    cooling_until,   // Option<u64>
    created_at,
  ] = result;

  // 返回 TypeScript object
  return {
    id: id?.toString() || bountyId,
    sponsor: sponsor || "",
    winner: unwrapOption(winner),
    repo_url: repo_url || "",
    issue_hash: issue_hash || "",
    pr_url: unwrapOption(pr_url),
    asset: asset?.inner || asset || "",
    amount: amount?.toString() || "0",
    status: status !== undefined ? status : 0,
    merged_at: unwrapOption(merged_at),
    cooling_until: unwrapOption(cooling_until),
    created_at: created_at?.toString() || "0",
  };
}
```

**3. Option<T> 处理**

```typescript
// 辅助函数：unwrap Move Option<T>
const unwrapOption = (opt: any) => {
  if (opt && typeof opt === 'object' && 'vec' in opt) {
    return opt.vec.length > 0 ? opt.vec[0] : null;
  }
  return opt || null;
};

// 使用示例
winner: unwrapOption(winner),        // Option<address> → string | null
pr_url: unwrapOption(pr_url),        // Option<String> → string | null
merged_at: unwrapOption(merged_at),  // Option<u64> → string | null
```

**4. Object<T> 处理**

```typescript
// Move 合约返回 Object<Metadata>
asset: Object<Metadata>

// 链上序列化为 {inner: "0x..."}
asset: {inner: "0xabc...def"}

// TypeScript 客户端提取 inner
asset: asset?.inner || asset || "",
```

#### 一致性测试

**测试文件**: [spec-mcp/aptos-mcp/tests/integration/abi-consistency.test.ts](../../spec-mcp/aptos-mcp/tests/integration/abi-consistency.test.ts)

**测试策略**:
1. **ABI 签名验证**：从链上获取 ABI，验证函数签名与客户端一致
2. **实际调用测试**：真实链上调用验证返回值解析
3. **类型转换测试**：验证所有 u64 参数正确转换

**示例测试**:
```typescript
describe("ABI Consistency Tests", () => {
  it("get_bounty should accept u64 and return tuple with 12 fields", () => {
    const func = abi.exposed_functions.find((f) => f.name === "get_bounty");
    expect(func!.params).toEqual(["u64"]);  // ✅ 验证参数类型
    expect(func!.return.length).toBe(12);    // ✅ 验证返回值字段数
  });

  it("should parse get_bounty return value correctly (array format)", async () => {
    const bounty = await client.getBounty("1");
    if (bounty) {
      expect(typeof bounty.id).toBe("string");      // ✅ 验证类型转换
      expect(typeof bounty.status).toBe("number");  // ✅ 验证类型转换
    }
  });
});
```

**运行测试**:
```bash
cd Code3/spec-mcp/aptos-mcp
pnpm test tests/integration/abi-consistency.test.ts
```

---

## 4. 审计与日志

### 4.1 链上审计（事件）

**文件路径**: [Code3/task3/bounty-operator/aptos/contract/sources/bounty.move](../../task3/bounty-operator/aptos/contract/sources/bounty.move)

| 事件 | 触发时机 | 字段 |
|------|---------|------|
| `BountyCreatedEvent` | 创建赏金 | `bounty_id`, `sponsor`, `repo_url`, `amount` |
| `BountyAcceptedEvent` | 接受赏金 | `bounty_id`, `winner` |
| `PRSubmittedEvent` | 提交 PR | `bounty_id`, `pr_url` |
| `BountyMergedEvent` | PR 合并 | `bounty_id`, `merged_at`, `cooling_until` |
| `BountyPaidEvent` | 赏金支付 | `bounty_id`, `winner`, `amount` |
| `BountyCancelledEvent` | 取消赏金 | `bounty_id`, `sponsor` |

**索引实现**: [Code3/task3/backend/src/indexer/events.ts](../../task3/backend/src/indexer/events.ts)

```typescript
// 监听合约事件
const events = await aptos.getAccountEventsByEventType({
  address: CONTRACT_ADDRESS,
  eventType: "0x...::code3_bounty::BountyCreatedEvent"
});

// 存储到数据库
for (const event of events) {
  await db.insert("events").values({
    event_type: "BountyCreated",
    bounty_id: event.data.bounty_id,
    timestamp: event.transaction_timestamp,
    data: event.data
  });
}
```

### 4.2 GitHub 审计（Issue 评论）

**自动评论**（经 `github-mcp-server`）:
- Worker 接单: "✅ Accepted by 0xabcd...ef01 (tx: 0x5678...)"
- PR 提交: "🔗 PR submitted: github.com/owner/repo/pull/456 (tx: 0x9abc...)"
- PR 合并: "🎉 Merged! Cooling period: 7 days (until 2025-01-24)"
- 赏金领取: "💰 Payout claimed: 10 USDT (tx: 0xdef0...)"

### 4.3 MCP 日志

**实现路径**: [Code3/spec-mcp/aptos/src/logger.ts](../../spec-mcp/aptos/src/logger.ts)

```typescript
export const logger = {
  info: (msg: string, meta?: object) => {
    console.log(JSON.stringify({ level: "info", message: msg, ...meta }));
  },
  error: (msg: string, error: Error, meta?: object) => {
    console.error(JSON.stringify({
      level: "error",
      message: msg,
      error: error.message,
      stack: error.stack,
      ...meta
    }));
  }
};
```

**日志级别**:
- `INFO`: 正常操作（工具调用、交易提交）
- `WARN`: 重试操作（GitHub 限流、交易失败）
- `ERROR`: 失败操作（签名错误、权限不足）

**敏感信息过滤**:
```typescript
// 不要记录私钥/Token
logger.info("Transaction submitted", {
  tx_hash: "0x...",
  // PRIVATE_KEY: "0x..."  // ❌ 不要记录
});
```

---

## 5. 攻击防护

### 5.1 Sybil 攻击

**威胁**: 同一 Worker 使用多个地址接单同一任务

**防护**:
- 合约约束：一个 `bounty_id` 只能被一个 `winner` 接受
- GitHub 约束：一个 Issue 只能有一个 `in-progress` 标签

### 5.2 Race Condition

**威胁**: 多个 Worker 同时接单

**防护**:
- 合约使用 Move 的 `acquires` 机制，确保原子性
- 先到先得：第一个成功提交 `accept_bounty` 交易的 Worker 成为 winner

### 5.3 Webhook Replay Attack

**威胁**: 攻击者重放 Webhook 请求

**防护**:
- 幂等键：`delivery_id`（GitHub 提供，每个事件唯一）
- 存储已处理的 `delivery_id`（Redis/SQLite）
- 重复请求返回 200（幂等跳过）

**实现路径**: [Code3/task3/backend/src/webhook/dedup.ts](../../task3/backend/src/webhook/dedup.ts)

```typescript
export async function checkDuplicate(delivery_id: string): Promise<boolean> {
  const exists = await redis.exists(`webhook:${delivery_id}`);
  if (exists) return true;

  await redis.set(`webhook:${delivery_id}`, "1", "EX", 86400);  // 24h TTL
  return false;
}
```

### 5.4 Reentrancy Attack（合约）

**威胁**: 恶意合约在 `claim_payout` 中调用回调，重复领取

**防护**:
- Move 语言特性：资源模型防止重入
- 状态先更新，再转账：
  ```move
  // 1. 更新状态
  bounty.status = STATUS_PAID;

  // 2. 转账
  primary_fungible_store::transfer(sponsor, winner, amount);
  ```

---

## 6. 密钥轮换

### 6.1 GitHub Token 轮换

**频率**: 3 个月

**步骤**:
1. 生成新 Token: https://github.com/settings/tokens/new
2. 更新 `.env` 中的 `GITHUB_TOKEN`
3. 重启 MCP 服务
4. 删除旧 Token

### 6.2 Aptos Private Key 轮换

**频率**: 6 个月（或泄漏时立即）

**步骤**:
1. 生成新地址: `aptos init --network testnet`
2. 转移资金到新地址
3. 更新 `.env` 中的 `APTOS_PRIVATE_KEY`
4. 重启 MCP 服务
5. 旧地址停用

### 6.3 Webhook Secret 轮换

**频率**: 12 个月

**步骤**:
1. 生成新 Secret: `openssl rand -hex 32`
2. 更新后端环境变量
3. 更新 GitHub Webhook 配置
4. 验证新 Webhook 生效
5. 删除旧 Secret

---

## 7. 应急响应

### 7.1 私钥泄漏

**Worker 私钥泄漏**:
1. 立即生成新地址
2. 转移所有资金到新地址
3. 更新 `.env`
4. 通知已接单的 Sponsor（如有）

**Resolver 私钥泄漏**:
1. 立即禁用 Webhook 自动 `mark_merged`
2. 生成新地址
3. 更新合约的 Resolver 角色
4. 更新后端环境变量

### 7.2 GitHub Token 泄漏

1. 立即撤销 Token: https://github.com/settings/tokens
2. 生成新 Token
3. 更新 `.env`
4. 检查是否有恶意操作（Issue/PR/Fork）

### 7.3 Webhook 攻击

1. 检查日志，确认攻击特征
2. 临时禁用 Webhook
3. 轮换 `GITHUB_WEBHOOK_SECRET`
4. 启用 Rate Limiting
5. 恢复 Webhook

---

## 8. 合规与隐私

### 8.1 数据收集

**链上数据**（公开）:
- Bounty ID, Amount, Status
- Sponsor/Winner 地址
- PR URL, Issue URL

**Dashboard 数据**（只读）:
- 从链上读取公开数据
- 不存储用户私钥/Token

**日志数据**（内部）:
- MCP 工具调用记录
- Webhook 请求记录
- 不包含私钥/Token

### 8.2 GDPR 合规（M4）

**用户权利**:
- 访问权: 用户可查询链上数据（公开）
- 删除权: 链上数据不可删除（区块链特性），但可请求删除 Dashboard 缓存

**实现**:
- Dashboard 提供 "Forget Me" 功能（清除本地缓存）
- 不存储个人身份信息（PII）

---

## 9. 安全检查清单

### 9.1 开发阶段

- [ ] 所有密钥通过环境变量注入
- [ ] `.env.local` 加入 `.gitignore`
- [ ] 不硬编码任何 Token/私钥
- [ ] 日志不包含敏感信息
- [ ] 使用 HTTPS（生产环境）

### 9.2 部署阶段

- [ ] 生产环境使用 Secret 管理（Kubernetes/Docker）
- [ ] Webhook 启用签名校验
- [ ] GitHub Token 最小权限（repo scope）
- [ ] 启用 Rate Limiting
- [ ] 配置 CORS（Dashboard API）

### 9.3 运维阶段

- [ ] 定期轮换密钥（3/6/12 个月）
- [ ] 监控异常交易（大额赏金、频繁取消）
- [ ] 定期审计链上事件
- [ ] 备份 Redis/数据库（Webhook 幂等键）

---

## 10. 参考

- 数据模型（敏感字段）：[05-data-model.md](./05-data-model.md)
- 系统架构（权限边界）：[02-architecture.md](./02-architecture.md)
- MCP 工具接口（权限要求）：[06-interfaces.md](./06-interfaces.md)
- Aptos Wallet Adapter（M4 前端钱包）：https://github.com/aptos-labs/aptos-wallet-adapter
- TRUTH.md ADR-007：[../../TRUTH.md](../../TRUTH.md)

# 08 — 完整工作流指南

> 本文描述 Code3 项目从需求发布到赏金结算的完整工作流，包括角色职责、操作步骤与最佳实践。
> 参考：[TRUTH.md](../../TRUTH.md) ADR-001（单 PR 结算）、ADR-003（链上为真相）、ADR-009（三大 MCP 统一架构）

---

## 1. 工作流概览

```
Requester → /specify → Spec.md
         → /publish_issue → GitHub Issue + Aptos Bounty (Open)
         ↓
Worker    → Monitor Tasks → /accept_task → Fork + Clone (Started)
         → /plan + /tasks → 生成三件套
         → /clarify (可选) → 澄清需求
         → /analyze → 质量检查
         → /implement → 5 阶段 TDD 执行
         → /open_pr → GitHub PR (PRSubmitted)
         ↓
Reviewer  → Code Review → Merge PR → Webhook → mark_merged (CoolingDown)
         ↓
Worker    → Wait 7 days → /claim_payout → Transfer USDT (Paid)
```

---

## 2. Requester 工作流（发布任务）

### 2.1 前置准备

**环境配置**:
1. 安装 Node.js >= 20, pnpm >= 8
2. 安装 MCP 服务：
   ```bash
   # spec-kit-mcp（工作流）
   npx -y @code3/spec-kit-mcp

   # aptos-chain-mcp（链上交互）
   npx -y @code3/aptos-chain-mcp

   # github-mcp-server（官方 GitHub 操作）
   npx -y @modelcontextprotocol/server-github
   ```
3. 配置环境变量：
   ```bash
   # .env
   GITHUB_TOKEN=ghp_xxx                    # repo scope
   APTOS_PRIVATE_KEY=0x...                 # 可选（自动签名）
   APTOS_API_KEY=xxx                       # Aptos Build API Key
   ```

### 2.2 步骤 1: 本地创建 Spec

**使用工具**: `spec-kit-mcp.specify`
**实现路径**: [Code3/spec-mcp/spec-kit-mcp/src/tools/specify.ts](../../spec-mcp/spec-kit-mcp/src/tools/specify.ts)

```typescript
// 在 Codex/Claude 中调用
await specKitMcp.specify({
  feature_description: `
实现用户认证系统：
- 支持邮箱 + 密码登录
- JWT Token 管理
- 密码加密存储
- 忘记密码功能
  `,
  allow_overwrite: false
});

// 输出
{
  feature_id: "003-auth",
  spec_path: "specs/003-auth/spec.md",
  content: "# Spec: User Authentication\n\n## 1. Overview\n..."
}
```

**产物**: `specs/003-auth/spec.md`

### 2.3 步骤 2: 发布到 GitHub + 创建链上赏金

**工具组合**:
1. `github-mcp-server.create_issue` — 创建 GitHub Issue（含元数据）
2. `aptos-chain-mcp.create_bounty` — 创建链上赏金
3. `github-mcp-server.update_issue` — 回写 bounty_id

```typescript
// 步骤 1: 创建 GitHub Issue
const issue = await githubMcp.create_issue({
  repo: "cyl19970726/Code3",
  title: "Feature: User Authentication",
  body: `
${spec_content}

\`\`\`json
{
  "schema": "code3/v1",
  "repo": "https://github.com/cyl19970726/Code3",
  "feature_id": "003-auth",
  "bounty": {
    "amount": "10",
    "asset": "USDT",
    "network": "testnet"
  }
}
\`\`\`
  `,
  labels: ["code3", "bounty", "open"]
});

// 步骤 2: 创建链上赏金
const bounty = await aptosMcp.create_bounty({
  repo_url: "https://github.com/cyl19970726/Code3",
  issue_hash: sha256(issue.url),
  asset: "USDT",
  amount: "10"
});

// 步骤 3: 回写 bounty_id
await githubMcp.update_issue({
  repo: "cyl19970726/Code3",
  issue_number: issue.number,
  body: issue.body.replace(
    '"bounty": {',
    `"bounty": {\n    "bounty_id": "${bounty.bounty_id}",`
  )
});
```

**产物**:
1. GitHub Issue: [cyl19970726/Code3#42](https://github.com/cyl19970726/Code3/issues/42)
2. 链上赏金: `bounty_id=1`, status=`Open`
3. Issue 元数据（JSON 代码块）:
   ```json
   {
     "schema": "code3/v1",
     "repo": "https://github.com/cyl19970726/Code3",
     "issue_number": 42,
     "bounty": {
       "bounty_id": "1",
       "amount": "10",
       "asset": "USDT"
     }
   }
   ```

### 2.4 步骤 3: 跟踪任务状态

**方式 1: Dashboard**
- 访问 https://code3-dashboard.vercel.app
- 查看任务列表，找到 Bounty #1
- 实时查看状态变更（Open → Started → PRSubmitted → ...）

**方式 2: GitHub Issue**
- 查看 Issue 评论（Worker 接单后会添加评论）
- 查看 PR 链接

**方式 3: 链上查询**
```typescript
// 通过 Aptos ts-sdk 查询
const bounty = await aptos.view({
  function: "0x...::code3_bounty::get_bounty",
  arguments: ["1"]
});
console.log(bounty.status);  // 0=Open, 1=Started, ...
```

### 2.5 步骤 4: 审核 PR

**验收依据**（参考 [TRUTH.md ADR-001](../../TRUTH.md)）:
1. **产物完整性**:
   - ✅ `plan.md`: 技术方案、数据模型、接口设计
   - ✅ `tasks.md`: 任务列表（带依赖关系）
   - ✅ 代码实现: 符合 Spec 要求
   - ✅ 测试: 单元测试 + 集成测试通过
   - ✅ `quickstart.md`: 快速开始文档
2. **质量标准**:
   - CI/CD 通过
   - 代码覆盖率 >= 80%
   - 符合 Constitution 约束（TDD、库优先、CLI 接口）
3. **文档一致性**:
   - Spec ↔ Plan ↔ Code 一致
   - API 文档与实现一致

**操作**:
```bash
# 1. Review PR on GitHub
# 2. 如果满足验收标准，点击 "Merge Pull Request"
# 3. Webhook 自动触发 mark_merged
```

### 2.6 步骤 5: 处理争议（可选）

**场景**: PR 合并后，发现严重问题（未满足 Spec、代码质量差）

**操作**（7 天冷静期内）:
1. 在 Issue 中提出争议（详细说明问题）
2. 调用 `aptos-chain-mcp.cancel_bounty({ bounty_id: "1" })`
3. 赏金退回 Sponsor

**约束**:
- 只能在 `CoolingDown` 状态（PR 合并后 7 天内）调用
- 需要提供合理理由（链下沟通）

---

## 3. Worker 工作流（接单 → 实现 → 领取）

### 3.1 前置准备

**环境配置**:
1. 安装 Node.js >= 20, pnpm >= 8
2. 安装 MCP 服务（同 Requester）：
   ```bash
   npx -y @code3/spec-kit-mcp
   npx -y @code3/aptos-chain-mcp
   npx -y @modelcontextprotocol/server-github
   ```
3. 配置环境变量：
   ```bash
   # .env
   GITHUB_TOKEN=ghp_xxx                    # repo scope
   APTOS_PRIVATE_KEY=0x...                 # Worker 私钥（自动签名）
   APTOS_API_KEY=xxx                       # Aptos Build API Key
   ```

### 3.2 步骤 1: 浏览任务

**方式 1: Dashboard**
- 访问 https://code3-dashboard.vercel.app
- 筛选 Status=Open, Amount >= 10
- 点击 "View Details" 查看 Spec

**方式 2: GitHub**
- 搜索 `is:issue is:open label:code3 label:open`

**选择策略**:
- **手动选择**: 阅读 Spec，评估工作量与报酬
- **自动选择**: 基于 Dashboard 显示的 amount/estimated_effort 指标

### 3.3 步骤 2: 接单

**工具组合**:
1. `aptos-chain-mcp.accept_bounty` — 链上接单
2. `github-mcp-server.add_labels` — 添加 in-progress 标签
3. `github-mcp-server.add_comment` — Issue 评论通知

```typescript
// 步骤 1: 链上接单
const result = await aptosMcp.accept_bounty({
  bounty_id: "1"
});

// 步骤 2: 添加 GitHub 标签
await githubMcp.add_labels({
  repo: "cyl19970726/Code3",
  issue_number: 42,
  labels: ["in-progress"]
});

// 步骤 3: 评论通知
await githubMcp.add_comment({
  repo: "cyl19970726/Code3",
  issue_number: 42,
  body: `✅ Accepted by ${result.winner}\nTransaction: ${result.tx_hash}`
});
```

**链上状态**: `Open → Started`

### 3.4 步骤 3: Fork + 生成文档

**工具组合**:
1. `github-mcp-server.fork` — Fork 仓库
2. `spec-kit-mcp.plan` — 生成 plan.md（若缺失）
3. `spec-kit-mcp.tasks` — 生成 tasks.md（若缺失）

```typescript
// 步骤 1: Fork 仓库
const fork = await githubMcp.fork({
  repo: "cyl19970726/Code3"
});

// 步骤 2: Clone 到本地
// (通过 git clone)

// 步骤 3: 检查并生成三件套
const plan = await specKitMcp.plan({
  feature_id: "003-auth",
  spec_path: "specs/003-auth/spec.md"
});

const tasks = await specKitMcp.tasks({
  feature_id: "003-auth",
  plan_path: "specs/003-auth/plan.md"
});
```

**产物**:
- Fork: `worker/Code3`
- 本地 Clone: `/Users/worker/Code3`
- 三件套: `spec.md`, `plan.md`, `tasks.md`

### 3.5 步骤 4: 澄清需求（可选但推荐）✨

**使用工具**: `spec-kit-mcp.clarify`
**实现路径**: [Code3/spec-mcp/spec-kit-mcp/src/tools/clarify.ts](../../spec-mcp/spec-kit-mcp/src/tools/clarify.ts)

```typescript
const clarifyResult = await specKitMcp.clarify({
  spec_path: "specs/003-auth/spec.md",
  max_questions: 5,
  interactive: true
});

// 输出
{
  questions: [
    {
      category: "数据模型",
      question: "用户表需要包含哪些字段？是否需要支持第三方登录（如 Google/GitHub）？",
      context: "Spec 中未明确说明用户数据模型",
      answer: "仅支持邮箱+密码，字段包含 id, email, hashed_password, created_at"
    },
    // ...
  ],
  updated_spec_path: "specs/003-auth/spec.md"  // 自动更新 Spec
}
```

**11 类检查**: 功能边界、数据模型、用户体验、质量属性、集成点、边界条件、术语定义、完成信号、非功能需求、技术约束、假设与风险

**最佳实践**: 在开始编码前先澄清，避免方向错误

### 3.6 步骤 5: 质量检查 ✨

**使用工具**: `spec-kit-mcp.analyze`
**实现路径**: [Code3/spec-mcp/spec-kit-mcp/src/tools/analyze.ts](../../spec-mcp/spec-kit-mcp/src/tools/analyze.ts)

```typescript
const analyzeResult = await specKitMcp.analyze({
  spec_path: "specs/003-auth/spec.md",
  plan_path: "specs/003-auth/plan.md",
  tasks_path: "specs/003-auth/tasks.md"
});

// 输出
{
  issues: [
    {
      category: "insufficiency",
      severity: "HIGH",
      location: "spec.md:12",
      description: "未说明密码加密算法（bcrypt / argon2）",
      suggestion: "补充说明使用 bcrypt (cost=12)"
    },
    {
      category: "constitution",
      severity: "CRITICAL",
      location: "plan.md:34",
      description: "计划中使用自建 JWT 库，违反 Constitution '库优先' 原则",
      suggestion: "使用 jsonwebtoken 库"
    }
  ],
  constitution_violations: [
    "plan.md:34 - 违反 '库优先' 原则"
  ],
  summary: {
    total_issues: 2,
    critical_count: 1,
    pass: false
  }
}
```

**6 类检测**: 重复、模糊、不足、Constitution 对齐、覆盖 gap、不一致

**Constitution Authority**: 若存在 CRITICAL 违规，`implement` 工具会拒绝执行

### 3.7 步骤 6: 执行实现 ✨

**使用工具**: `spec-kit-mcp.implement`
**实现路径**: [Code3/spec-mcp/spec-kit-mcp/src/tools/implement.ts](../../spec-mcp/spec-kit-mcp/src/tools/implement.ts)

```typescript
// 执行第一个任务
const implementResult = await specKitMcp.implement({
  task_id: "task-001",
  tasks_path: "specs/003-auth/tasks.md",
  strict_tdd: true,
  phase: "all"
});

// 输出
{
  phase: "all",
  changes: [
    { file_path: "src/auth/login.ts", action: "created", diff: "..." },
    { file_path: "tests/auth/login.test.ts", action: "created", diff: "..." }
  ],
  tests: {
    passed: 12,
    failed: 0,
    skipped: 0,
    output: "✅ All tests passed"
  },
  next_phase: null
}
```

**5 阶段执行**:
1. **Setup** — 安装依赖、配置环境
2. **Tests (Red)** — 先写测试，必须失败
3. **Core (Green)** — 实现核心逻辑，测试通过
4. **Integration** — 集成测试（真实环境）
5. **Polish** — 重构、文档、Linter

**Constitution 约束**:
- 测试优先（TDD）
- 库优先（避免重复造轮子）
- CLI 接口（可测试）
- 集成测试优先（避免过度 mock）

**迭代执行**: 按 `tasks.md` 顺序执行所有任务

### 3.8 步骤 7: 提交 PR

**工具组合**:
1. `github-mcp-server.create_pr` — 创建 PR
2. `aptos-chain-mcp.submit_pr` — 链上记录 PR

```typescript
// 1. 创建 GitHub PR
const pr = await githubMcp.create_pr({
  repo: "cyl19970726/Code3",
  branch: "feat/003-auth",
  title: "feat: implement user authentication system",
  body: `
## Summary
实现用户认证系统，支持邮箱+密码登录、JWT Token 管理。

## Checklist
- [x] plan.md（技术方案）
- [x] tasks.md（任务列表）
- [x] 代码实现（src/auth/）
- [x] 单元测试（tests/auth/）
- [x] 集成测试
- [x] quickstart.md（使用文档）

## Bounty
Closes #42
Bounty ID: 1
  `
});

// 输出
{
  pr_url: "https://github.com/cyl19970726/Code3/pull/456",
  pr_number: 456
}

// 2. 链上记录 PR 提交
const submitResult = await aptosMcp.submit_pr({
  bounty_id: "1",
  pr_url: pr.pr_url
});

// 输出
{
  bounty_id: "1",
  tx_hash: "0x9876...",
  status: "PRSubmitted"
}
```

**链上状态**: `Started → PRSubmitted`

### 3.9 步骤 8: 等待冷静期

**时间**: PR 合并后 7 天

**监控方式**:
1. **Dashboard**: 查看 Bounty #1 详情页，显示倒计时
2. **链上查询**:
   ```typescript
   const bounty = await aptos.view({
     function: "0x...::code3_bounty::get_bounty",
     arguments: ["1"]
   });
   console.log(bounty.cooling_until);  // Unix timestamp
   ```

### 3.10 步骤 9: 领取赏金

**使用工具**: `aptos-chain-mcp.claim_payout`
**实现路径**: [Code3/spec-mcp/aptos-mcp/src/tools/claim_payout.ts](../../spec-mcp/aptos-mcp/src/tools/claim_payout.ts)

```typescript
// 冷静期结束后调用
const claimResult = await aptosMcp.claim_payout({
  bounty_id: "1"
});

// 输出
{
  bounty_id: "1",
  tx_hash: "0xef01...",
  amount: "10",
  status: "Paid"
}
```

**链上状态**: `CoolingDown → Paid`, transfer 10 USDT to winner

---

## 4. Reviewer 工作流（审核 PR）

### 4.1 审核清单

**产物完整性**:
- [ ] `specs/NNN/plan.md` — 技术方案完整
- [ ] `specs/NNN/tasks.md` — 任务列表与依赖清晰
- [ ] 代码实现 — 符合 Spec 要求
- [ ] 测试 — 单元测试 + 集成测试通过，覆盖率 >= 80%
- [ ] `specs/NNN/quickstart.md` — 快速开始文档

**质量标准**:
- [ ] CI/CD 通过
- [ ] Linter 无警告
- [ ] 符合 Constitution 约束（TDD、库优先、CLI 接口）
- [ ] API 文档与实现一致

**文档一致性**:
- [ ] Spec ↔ Plan 一致
- [ ] Plan ↔ Code 一致
- [ ] Tasks ↔ Commits 对应

### 4.2 操作流程

```bash
# 1. 在 GitHub PR 页面点击 "Files changed"
# 2. Review 每个文件的变更
# 3. 添加评论（如有问题）
# 4. 若满足验收标准，点击 "Approve"
# 5. 点击 "Merge Pull Request"
```

**Webhook 自动触发**: PR 合并 → Webhook → `aptos-chain-mcp.mark_merged(bounty_id=1)` → status: `PRSubmitted → CoolingDown`

---

## 5. 异常流与回滚

### 5.1 场景 1: 接单后无法完成

**Worker 主动放弃**:
```typescript
// 联系 Sponsor，请求取消
// Sponsor 调用:
aptos-chain-mcp.cancel_bounty({ bounty_id: "1" });
// status: Started → Cancelled
// 赏金退回 Sponsor
```

### 5.2 场景 2: PR 合并后发现严重问题

**Sponsor 在冷静期内取消**:
```typescript
// 7 天内调用
aptos-chain-mcp.cancel_bounty({ bounty_id: "1" });
// status: CoolingDown → Cancelled
// 赏金退回 Sponsor
```

**约束**: 必须在 `cooling_until` 之前调用

### 5.3 场景 3: Webhook 失败

**手动触发 mark_merged**:
```typescript
// Resolver 或 Sponsor 调用
aptos-chain-mcp.mark_merged({
  bounty_id: "1",
  pr_url: "https://github.com/cyl19970726/Code3/pull/456"
});
```

**定时任务补偿**: Backend 每 15 分钟扫描 `PRSubmitted` 状态的赏金，检查对应 PR 是否已合并

---

## 6. 最佳实践

### 6.1 Requester

1. **清晰的 Spec**: 使用 `/clarify` 预先澄清可能的疑问
2. **合理定价**: 参考市场价格，确保吸引优质 Worker
3. **及时审核**: PR 提交后 3 天内完成审核
4. **明确验收标准**: 在 Spec 中写明质量要求（测试覆盖率、文档完整性）

### 6.2 Worker

1. **先澄清再动手**: 使用 `/clarify` 确保理解需求
2. **质量优先**: 使用 `/analyze` 检查 Constitution 合规性
3. **TDD 流程**: 严格按 5 阶段执行，确保测试覆盖
4. **完整产物**: 提交 PR 前确保三件套 + 测试 + 文档齐全
5. **沟通透明**: 若遇到阻塞，及时在 Issue 中沟通

### 6.3 Reviewer

1. **客观标准**: 按验收清单审核，避免主观判断
2. **及时反馈**: 发现问题立即评论，而非等到最后
3. **鼓励迭代**: 允许 Worker 根据反馈修改，而非直接拒绝

---

## 7. 工具链快速参考

| 角色 | 工具 | 用途 |
|------|------|------|
| Requester | `spec-kit-mcp.specify` | 本地创建 Spec |
| Requester | `github-mcp-server.create_issue` + `aptos-chain-mcp.create_bounty` | 发布 Issue + 创建链上赏金 |
| Worker | `aptos-chain-mcp.accept_bounty` | 接单 |
| Worker | `github-mcp-server.fork` + `spec-kit-mcp.plan/tasks` | Fork + 生成文档 |
| Worker | `spec-kit-mcp.clarify` ✨ | 澄清需求（11 类） |
| Worker | `spec-kit-mcp.analyze` ✨ | 质量检查（6 类 + Constitution） |
| Worker | `spec-kit-mcp.implement` ✨ | 执行任务（5 阶段 TDD） |
| Worker | `github-mcp-server.create_pr` | 创建 PR |
| Worker | `aptos-chain-mcp.submit_pr` | 链上记录 PR |
| Worker | `aptos-chain-mcp.claim_payout` | 领取赏金 |
| Sponsor | `aptos-chain-mcp.cancel_bounty` | 取消赏金 |
| Resolver | `aptos-chain-mcp.mark_merged` | 手动标记合并 |

---

## 8. 参考

- 数据流详细说明：[01-datastream.md](./01-datastream.md)
- MCP 工具完整接口：[06-interfaces.md](./06-interfaces.md)
- 快速开始与使用示例：[04-quickstart.md](./04-quickstart.md)
- 安全策略（密钥管理）：[09-security.md](./09-security.md)
- TRUTH.md ADR-001/003：[../../TRUTH.md](../../TRUTH.md)

/**
 * guide tool
 *
 * Provides getting started guides for Users and Workers
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

// User Guide Content
const USER_GUIDE = `# User Guide: Publishing Bounty Tasks

## Workflow

\`\`\`mermaid
graph TD
    A[User 有开发需求] --> B[1. spec-kit-mcp.plan]
    B --> C[生成初步计划]
    C --> D[2. spec-kit-mcp.clarify]
    D --> E[完善规格，生成 specs/00x/spec.md]
    E --> F[3. spec-kit-mcp-adapter.publish-bounty]
    F --> G[创建 GitHub Issue + 链上 bounty]

    G --> H[等待 Worker 完成]
    H --> I[Worker 提交 PR]
    I --> J[User 审核 PR on GitHub]
    J --> K[User merge PR on GitHub]
    K --> L[4. spec-kit-mcp-adapter.confirm-bounty]
    L --> M[链上确认任务完成]
    M --> N[Worker 可以 claim]
\`\`\`

## Tools

### spec-kit-mcp (规格创建)
1. **plan** - 生成初步计划
2. **clarify** - 完善规格，生成 specs/00x/spec.md

### spec-kit-mcp-adapter (悬赏发布)
3. **publish-bounty** - 发布 GitHub Issue + 锁定资金
4. **confirm-bounty** - 确认完成 (在 merge PR 后调用)


## Example

\`\`\`typescript
// 1. Generate spec (using spec-kit-mcp)
plan({ feature: "Add JWT authentication" })
clarify({ specId: "001", details: "Use bcrypt, support refresh tokens" })

// 2. Publish bounty
publishBounty({
  specPath: "specs/001/spec.md",
  repo: "org/repo",
  chain: "ethereum",
  amount: "100000000000000000",  // 0.1 ETH in Wei
  asset: "ETH",
  branch: "main"  // Optional: defaults to 'main'
})

// Output:
// ✅ Bounty published successfully!
// - Issue: https://github.com/org/repo/issues/42
// - Bounty ID: 1
// - Tx Hash: 0x...

// 3. Wait for Worker to complete & submit PR

// 4. Review & merge PR on GitHub

// 5. Confirm completion
confirmBounty({
  issueUrl: "https://github.com/org/repo/issues/42",
  chain: "ethereum"
})

// Worker will then claim the 0.1 ETH
\`\`\`
`;

// Worker Guide Content
const WORKER_GUIDE = `# Worker Guide: Completing Bounty Tasks

## Workflow

\`\`\`mermaid
graph TD
    A[Worker 看到 GitHub Issue] --> B[1. spec-kit-mcp-adapter.accept-bounty]
    B --> C[获取仓库信息 + 链上接受]
    C --> D[手动 git clone 仓库]
    D --> E[读取 repository.specPath]

    E --> F[2. spec-kit-mcp.plan]
    F --> G[生成实现计划]
    G --> H[3. spec-kit-mcp.tasks]
    H --> I[拆分任务清单]
    I --> J[4. spec-kit-mcp.analyze]
    J --> K[分析代码库]
    K --> L[5. spec-kit-mcp.implement]
    L --> M[实现功能]

    M --> N[6. git push worker branch]
    N --> O[7. spec-kit-mcp-adapter.submit-bounty]
    O --> P[提交 PR URL 到链上]

    P --> Q[等待 User merge + confirm]
    Q --> R[8. spec-kit-mcp-adapter.claim-bounty]
    R --> S[领取奖励]
\`\`\`

## Tools

### spec-kit-mcp-adapter (悬赏流程)
1. **accept-bounty** - 接受任务 + 获取仓库信息（Worker 需手动 clone）
2. **submit-bounty** - 提交 PR URL 到链上
3. **claim-bounty** - 领取奖励

### spec-kit-mcp (功能实现)
4. **spec-context** - 读取 spec.md 上下文（requirements, entities）
5. **plan-context** - 读取 plan.md 上下文（architecture, tech stack）
6. **tasks-context** - 读取 tasks.md 上下文（tasks, phases）
7. **plan** - 生成实现计划
8. **tasks** - 拆分任务清单
9. **analyze** - 分析代码库
10. **implement** - 实现功能

## Example

\`\`\`typescript
// 1. Accept bounty
acceptBounty({
  issueUrl: "https://github.com/org/repo/issues/42",
  chain: "ethereum"
})

// Output shows:
// ✅ Bounty accepted successfully!
// - Bounty ID: 1
// - Tx Hash: 0x...
//
// 📦 Repository Setup Instructions:
// git clone https://github.com/org/repo.git --branch main
// cd repo
// git checkout -b worker-bounty-1
// cat ./specs/001/spec.md
//
// 📁 Source branch: main
// 📄 Spec file: ./specs/001/spec.md

// 2. Clone repository (manually execute the commands from output)
// $ git clone https://github.com/org/repo.git --branch main
// $ cd repo
// $ git checkout -b worker-bounty-1

// 3. Read spec from repository
specContext({ specPath: "./repo/specs/001/spec.md" })

// 4-7. Implement using spec-kit-mcp
plan({ specPath: "./repo/specs/001/spec.md" })
planContext({ planPath: "./repo/specs/001/plan.md" })  // Read plan context
tasks({ planPath: "./repo/specs/001/plan.md" })
tasksContext({ tasksPath: "./repo/specs/001/tasks.md" })  // Read tasks context
analyze({ projectPath: "./repo", focus: "auth" })
implement({
  taskDescription: "Implement JWT auth",
  specPath: "./repo/specs/001/spec.md"
})

// 8. Commit and push (manually)
// $ git add . && git commit -m "feat: JWT auth"
// $ git push origin worker-bounty-1

// 9. Submit PR
submitBounty({
  issueUrl: "https://github.com/org/repo/issues/42",
  branchName: "worker-bounty-1",
  chain: "ethereum"
})

// Output shows PR URL that was auto-created

// 10. Wait for User to merge + confirm

// 11. Claim payment
claimBounty({
  issueUrl: "https://github.com/org/repo/issues/42",
  chain: "ethereum"
})
\`\`\`
`;

// Tool definition
export const guideTool: Tool = {
  name: 'guide',
  description: 'Get started guide for using spec-kit-mcp and spec-kit-mcp-adapter. Choose your role (user or worker) to get the appropriate workflow guide.',
  inputSchema: {
    type: 'object',
    properties: {
      role: {
        type: 'string',
        enum: ['user', 'worker'],
        description: 'Your role: "user" (task publisher/sponsor) or "worker" (task completer)'
      }
    },
    required: ['role']
  }
};

// Tool implementation
export async function guide(args: { role: 'user' | 'worker' }): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  const { role } = args;

  const guideContent = role === 'user' ? USER_GUIDE : WORKER_GUIDE;

  return {
    content: [
      {
        type: 'text',
        text: guideContent
      }
    ]
  };
}

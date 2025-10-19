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
// 1. Generate spec
plan({ feature: "Add JWT authentication" })
clarify({ specId: "001", details: "Use bcrypt, support refresh tokens" })

// 2. Publish bounty
publishBounty({
  specPath: "specs/001/spec.md",
  repo: "org/repo",
  chain: "ethereum-sepolia",
  amount: 0.1,  // 0.1 ETH
  title: "Implement JWT Auth"
})

// 3. Wait for Worker to complete & submit PR

// 4. Review & merge PR on GitHub

// 5. Confirm completion
confirmBounty({
  issueUrl: "https://github.com/org/repo/issues/42",
  chain: "ethereum-sepolia"
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
    B --> C[下载整个代码库]
    C --> D[读取 specs/00x/spec.md]

    D --> E[2. spec-kit-mcp.plan]
    E --> F[生成实现计划]
    F --> G[3. spec-kit-mcp.tasks]
    G --> H[拆分任务清单]
    H --> I[4. spec-kit-mcp.analyze]
    I --> J[分析代码库]
    J --> K[5. spec-kit-mcp.implement]
    K --> L[实现功能]

    L --> M[6. spec-kit-mcp-adapter.submit-bounty]
    M --> N[提交 PR URL 到链上]

    N --> O[等待 User merge + confirm]
    O --> P[7. spec-kit-mcp-adapter.claim-bounty]
    P --> Q[领取奖励]
\`\`\`

## Tools

### spec-kit-mcp-adapter (悬赏流程)
1. **accept-bounty** - 接受任务 + 下载代码库
2. **submit-bounty** - 提交 PR URL
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
  chain: "ethereum-sepolia",
  localDir: "./workspace/repo"
})

// 2. Read spec context (optional, to understand requirements)
specContext({ specPath: "./workspace/repo/specs/001/spec.md" })

// 3-6. Implement using spec-kit-mcp
plan({ specPath: "./workspace/repo/specs/001/spec.md" })
planContext({ planPath: "./workspace/repo/specs/001/plan.md" })  // Read plan context
tasks({ planPath: "./workspace/repo/specs/001/plan.md" })
tasksContext({ tasksPath: "./workspace/repo/specs/001/tasks.md" })  // Read tasks context
analyze({ projectPath: "./workspace/repo", focus: "auth" })
implement({
  taskDescription: "Implement JWT auth",
  specPath: "./workspace/repo/specs/001/spec.md"
})

// 7. Create PR manually (git)
// git checkout -b feat/jwt-auth
// git add . && git commit -m "feat: JWT auth"
// git push && gh pr create

// 8. Submit PR
submitBounty({
  issueUrl: "https://github.com/org/repo/issues/42",
  prUrl: "https://github.com/org/repo/pull/123",
  chain: "ethereum-sepolia"
})

// 9. Wait for User to merge + confirm

// 10. Claim payment
claimBounty({
  issueUrl: "https://github.com/org/repo/issues/42",
  chain: "ethereum-sepolia"
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

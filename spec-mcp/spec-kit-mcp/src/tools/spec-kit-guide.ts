/**
 * spec-kit-guide Tool
 * 提供 spec-kit-mcp 工作流指南
 * 确保 LLM 正确使用 MCP Prompts
 */
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const specKitGuideTool: Tool = {
  name: 'spec-kit-guide',
  description: `⭐ Call this tool FIRST to understand spec-kit-mcp workflow before any other operations.

Returns: Simplified workflow diagram + available Prompts/Tools + step-by-step guide.

CRITICAL: You MUST use MCP Prompts (specify, clarify, plan, tasks, analyze, implement) at each stage.
DO NOT manually generate content using Write/Bash tools - Prompts provide standardized instructions.

Always call this tool first when users request spec creation or feature development.`,
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
};

export async function handleSpecKitGuide(): Promise<any> {
  return {
    success: true,
    message: 'spec-kit-mcp workflow guide loaded - follow this workflow exactly',
    data: {
      // 简化工作流图
      workflowDiagram: getWorkflowDiagram(),

      // 可用的 Prompts（分类：主流程 + 维护）
      prompts: {
        workflow: [
          'specify',
          'clarify',
          'plan',
          'tasks',
          'analyze',
          'implement',
        ],
        maintenance: ['constitution'], // 只在用户明确要求时调用
      },

      // 可用的 Tools
      tools: ['init', 'spec-context', 'plan-context', 'tasks-context'],

      // 核心模式
      corePattern: 'Prompt → Context Tool → Prompt → Context Tool',

      // 快速说明
      quickStart: getQuickStart(),

      // 常见错误
      commonPitfalls: [
        '❌ Skipping Prompts - manually generating content with Write/Bash',
        '❌ Skipping clarify stage - missing interactive Q&A (5 questions)',
        '❌ Skipping analyze stage - missing quality checks (6 types)',
        '❌ Not validating with Context Tools after generation',
        '❌ Using Write tool directly instead of calling specify Prompt',
      ],

      // 质量标准
      qualityStandards: {
        'spec.md': '8,000-12,000 chars, 12-20 requirements, 4-6 entities',
        'plan.md': '7 tech decisions, data model (TypeScript), 5 phases',
        'tasks.md': '20+ tasks, 5 phases (Setup/Tests/Core/Integration/Polish)',
      },
    },
    nextSteps: [
      '0. Call init tool (projectPath) to create .specify/ structure',
      '   → Verify: ls -R .specify/ shows 4 scripts, 3 templates, 1 constitution',
      '',
      '1. Call specify Prompt (featureDescription) → generates spec.md',
      '   → LLM receives instructions → executes → writes spec.md',
      '',
      '2. Call spec-context tool (specPath) → verify spec.md',
      '   → Check: character count >= 8k, requirements: 12-20',
      '',
      '3. Call clarify Prompt (specPath) → ask 5 questions, update spec.md',
      '   → LLM scans 11 ambiguity types → asks user interactively → updates spec.md',
      '',
      '4. Call spec-context tool (specPath) → verify Clarifications section exists',
      '',
      '5. Call plan Prompt (specPath) → generates plan.md',
      '   → LLM reads spec.md, constitution.md, plan-template.md → generates plan.md',
      '',
      '6. Call plan-context tool (planPath) → verify plan.md',
      '   → Check: tech stack, data model, 5 phases',
      '',
      '7. Call tasks Prompt (planPath) → generates tasks.md',
      '   → LLM reads plan.md, tasks-template.md → generates tasks.md (20+ tasks)',
      '',
      '8. Call tasks-context tool (tasksPath) → verify tasks.md',
      '   → Check: total tasks >= 20, 5 phases',
      '',
      '9. Call analyze Prompt (specPath, planPath, tasksPath) → quality report',
      '   → LLM performs 6 quality checks → generates report → asks user to apply fixes',
      '',
      '10. Optional: Call implement Prompt (tasksPath) → TDD implementation',
      '    → LLM executes tasks using Red-Green-Refactor-Commit cycle',
      '',
      '═════════════════════════════════════════════════════════════',
      '⚠️  CRITICAL RULES:',
      '═════════════════════════════════════════════════════════════',
      '1. Always call Prompts - never manually generate content with Write/Bash',
      '2. Always validate with Context Tools after each generation stage',
      '3. Never skip clarify stage - it ensures requirement clarity',
      '4. Never skip analyze stage - it detects quality issues',
      '5. Follow the pattern: Prompt → Context Tool → Prompt → Context Tool',
      '',
      '═════════════════════════════════════════════════════════════',
      'ℹ️  SPECIAL CASES:',
      '═════════════════════════════════════════════════════════════',
      '• constitution Prompt: Only call when user explicitly requests to',
      '  update design principles (not part of regular workflow)',
      '• clarify and analyze stages: Optional in docs, but RECOMMENDED',
      '  for production-quality specs',
      '',
      '═════════════════════════════════════════════════════════════',
      '📊 QUALITY GATES:',
      '═════════════════════════════════════════════════════════════',
      '• spec.md: 8k-12k chars, 12-20 reqs, 4-6 entities, GIVEN-WHEN-THEN',
      '• plan.md: 7 tech decisions (with rationale), TypeScript data model',
      '• tasks.md: 20+ tasks, 5 phases, dependencies, acceptance criteria',
    ],
  };
}

function getWorkflowDiagram(): string {
  return `\`\`\`mermaid
flowchart LR
    Start([Start]) --> Init[init tool]
    Init --> Specify[specify prompt]
    Specify --> SpecCtx[spec-context tool]
    SpecCtx --> Clarify[clarify prompt]
    Clarify --> SpecCtx2[spec-context tool]
    SpecCtx2 --> Plan[plan prompt]
    Plan --> PlanCtx[plan-context tool]
    PlanCtx --> Tasks[tasks prompt]
    Tasks --> TasksCtx[tasks-context tool]
    TasksCtx --> Analyze[analyze prompt]
    Analyze --> AllCtx[spec/plan/tasks<br/>context tools]
    AllCtx --> Implement[implement prompt]
    Implement --> TasksCtx2[tasks-context tool]
    TasksCtx2 --> End([Complete])

    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style Specify fill:#e3f2fd
    style Clarify fill:#e3f2fd
    style Plan fill:#e3f2fd
    style Tasks fill:#e3f2fd
    style Analyze fill:#e3f2fd
    style Implement fill:#e3f2fd
    style SpecCtx fill:#fff9c4
    style SpecCtx2 fill:#fff9c4
    style PlanCtx fill:#fff9c4
    style TasksCtx fill:#fff9c4
    style AllCtx fill:#fff9c4
    style TasksCtx2 fill:#fff9c4
\`\`\`

**Pattern**: Prompt → Context Tool → Prompt → Context Tool

**Color Legend**:
- 🔵 Blue: MCP Prompts (specify, clarify, plan, tasks, analyze, implement)
- 🟡 Yellow: MCP Context Tools (spec-context, plan-context, tasks-context)
- 🟢 Green: Start/End points`;
}

function getQuickStart(): string {
  return `**spec-kit-mcp Quick Start**

1. **Initialize Project**
   \`\`\`bash
   mkdir my-project && cd my-project
   git init && git commit --allow-empty -m "Initial commit"
   \`\`\`

2. **Create .specify/ Structure**
   Call init tool with projectPath
   → Creates 4 scripts, 3 templates, 1 constitution

3. **Generate Specification**
   Call specify Prompt with featureDescription
   → Generates spec.md (8k-12k chars, 12-20 requirements)

4. **Clarify Requirements** (Interactive Q&A)
   Call clarify Prompt with specPath
   → Asks 5 questions, updates spec.md

5. **Generate Technical Design**
   Call plan Prompt with specPath
   → Generates plan.md (tech stack, data model, 5 phases)

6. **Generate Tasks**
   Call tasks Prompt with planPath
   → Generates tasks.md (20+ tasks, 5 phases)

7. **Quality Analysis** (Detect Issues)
   Call analyze Prompt with specPath, planPath, tasksPath
   → 6 quality checks, generates report, suggests fixes

8. **Implementation** (Optional)
   Call implement Prompt with tasksPath
   → TDD execution (Red-Green-Refactor-Commit)

**Remember**: Always call Prompts, then validate with Context Tools!`;
}

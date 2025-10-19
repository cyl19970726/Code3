# spec-kit-mcp Guide Tool Implementation Plan

> **Purpose**: Add a workflow guide tool to ensure LLMs correctly use spec-kit-mcp Prompts
> **Created**: 2025-10-06
> **Priority**: 🔴 **CRITICAL** (blocks production readiness)

---

## 1. Problem Statement

### 1.1 Root Cause (from E2E-01 Report)

**Critical Finding**: E2E-01 测试中，所有 MCP Prompts（specify, clarify, plan, tasks, analyze, implement）都未被调用。

**Why It Happened**:
1. ❌ LLM 不知道 spec-kit-mcp 提供了哪些 Prompts
2. ❌ LLM 不知道如何调用这些 Prompts
3. ❌ LLM 不知道正确的工作流顺序
4. ❌ 缺少"首次使用"的入口点（entry point）

**Result**:
- LLM 直接使用 Bash/Write/Read 工具手动生成内容
- **绕过了 spec-kit-mcp 的核心价值** — Prompts 引导 LLM 执行标准化流程

### 1.2 spec-workflow-mcp 的成功案例

参考 `spec-workflow-mcp/src/tools/spec-workflow-guide.ts`：

```typescript
export const specWorkflowGuideTool: Tool = {
  name: 'spec-workflow-guide',
  description: `Load essential spec workflow instructions...

  Call this tool FIRST when users request spec creation...
  Always load before any other spec tools to ensure proper workflow understanding.
  Its important that you follow this workflow exactly to avoid errors.`,
  // ...
};
```

**Key Success Factors**:
1. ✅ **Explicit Entry Point**: "Call this tool FIRST"
2. ✅ **Complete Workflow Guide**: Mermaid diagram + detailed steps
3. ✅ **Clear Instructions**: What to do at each phase
4. ✅ **Tool Integration**: References other tools (approvals, spec-status)
5. ✅ **Embedded in Tool Description**: Makes it discoverable

---

## 2. Solution: Two-Part Fix

### 2.1 Quick Fix: Improve MCP Server and Prompt Descriptions ⚡

**Priority**: 🔴 **CRITICAL** - Can be done immediately

**Problem**:
- MCP Server has no `description` field in its metadata
- Prompt descriptions don't emphasize workflow order
- LLMs don't know which Prompt to call first

**Solution**:

#### A. Add Server Description

**Current** (`src/server.ts`):
```typescript
const server = new Server(
  {
    name: "spec-kit-mcp",
    version: "0.2.0",
  },
  // ...
);
```

**Proposed** (check if Server supports `description`):
```typescript
const server = new Server(
  {
    name: "spec-kit-mcp",
    version: "0.2.0",
    description: `Pure MCP + LLM feature specification tool. Workflow: init → specify → clarify → plan → tasks → analyze → implement. Call specify Prompt first with featureDescription to start.`,
  },
  // ...
);
```

**Note**: Need to check MCP SDK documentation if `description` is supported in Server metadata.

#### B. Enhance Prompt Descriptions

**Current** (`src/prompts/specify.ts`):
```typescript
const prompt: Prompt = {
  name: 'specify',
  title: 'Create Feature Specification',
  description: 'Create or update the feature specification from a natural language feature description',
  // ...
};
```

**Proposed**:
```typescript
const prompt: Prompt = {
  name: 'specify',
  title: 'Create Feature Specification',
  description: `⭐ CALL THIS FIRST to start spec-kit-mcp workflow. Creates comprehensive feature specification (spec.md) from natural language description. Output: 8k-12k chars, 12-20 requirements, 4-6 entities. Next: call clarify Prompt.`,
  // ...
};
```

**Update all 7 Prompts**:
1. **specify**: "⭐ CALL THIS FIRST to start workflow. Creates spec.md. Next: clarify"
2. **clarify**: "⭐ CALL AFTER specify. Interactive Q&A to resolve ambiguities (5 questions). Updates spec.md. Next: plan"
3. **plan**: "⭐ CALL AFTER clarify. Generates technical design (plan.md). Next: tasks"
4. **tasks**: "⭐ CALL AFTER plan. Breaks plan into 20+ atomic tasks (tasks.md). Next: analyze"
5. **analyze**: "⭐ CALL AFTER tasks. Detects 6 quality issues, provides fixes. Updates docs. Next: implement"
6. **implement**: "⭐ CALL AFTER analyze (optional). TDD implementation following tasks.md"
7. **constitution**: "Update project constitution (constitution.md). Call only when explicitly requested"

#### C. Investigation: Check MCP SDK Support

Need to verify:
1. Does `@modelcontextprotocol/sdk` support `description` in Server constructor?
2. Are Prompt descriptions visible to LLMs in Claude Desktop?
3. Is there a `metadata` field we can use?

**Action**: Search MCP SDK documentation or TypeScript definitions.

---

### 2.2 Long-term Fix: Add `spec-kit-guide` Tool

**Tool Name**: `spec-kit-guide`

**Purpose**: Provide complete spec-kit-mcp workflow guide to ensure LLMs use Prompts correctly

**When to Call**:
- **FIRST** when user requests feature spec creation
- Before any other spec-kit-mcp operation
- When starting E2E tests

**What It Returns**:
1. Complete workflow diagram (Mermaid)
2. All 7 MCP Prompts explained (specify, clarify, plan, tasks, analyze, implement, constitution)
3. All 4 MCP Tools explained (init, spec-context, plan-context, tasks-context)
4. Step-by-step execution guide
5. Quality gates and validation criteria
6. Common pitfalls and how to avoid them

### 2.2 Tool Implementation

**File**: `spec-mcp/spec-kit-mcp/src/tools/spec-kit-guide.ts`

```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const specKitGuideTool: Tool = {
  name: 'spec-kit-guide',
  description: `Load essential spec-kit-mcp workflow instructions to guide feature development.

# Instructions
Call this tool FIRST when users request spec creation, feature development, or mention specifications.
This provides the complete workflow sequence (init → specify → clarify → plan → tasks → analyze → implement)
that must be followed using MCP Prompts. Always load before any other spec-kit-mcp tools to ensure proper
workflow understanding. Its important that you follow this workflow exactly to avoid errors.

CRITICAL: You must call MCP Prompts (specify, clarify, plan, tasks, analyze, implement) at each stage.
DO NOT manually generate content using Write/Bash tools - always use the Prompts to guide execution.`,
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export async function specKitGuideHandler(): Promise<any> {
  return {
    success: true,
    message: 'Complete spec-kit-mcp workflow guide loaded - follow this workflow exactly',
    data: {
      guide: getSpecKitWorkflowGuide(),
      availablePrompts: [
        'specify', 'clarify', 'plan', 'tasks', 'analyze', 'implement', 'constitution'
      ],
      availableTools: [
        'init', 'spec-context', 'plan-context', 'tasks-context'
      ]
    },
    nextSteps: [
      'Stage 0: Call init tool to create .specify/ structure',
      'Stage 1: Call specify Prompt with featureDescription',
      'Stage 2: Call clarify Prompt to resolve ambiguities (5 questions)',
      'Stage 3: Call plan Prompt to generate technical design',
      'Stage 4: Call tasks Prompt to break down into tasks',
      'Stage 5: Call analyze Prompt to detect quality issues',
      'Stage 6: Call implement Prompt to execute TDD implementation',
      'CRITICAL: Always use Prompts, never manually generate with Write/Bash'
    ]
  };
}

function getSpecKitWorkflowGuide(): string {
  return `# spec-kit-mcp Complete Workflow Guide

## Overview

spec-kit-mcp is a Pure MCP + LLM architecture tool that uses **7 MCP Prompts** and **4 MCP Tools**
to guide you through feature specification and implementation.

**CRITICAL**: You must call MCP Prompts at each stage. DO NOT manually generate content using
Write/Bash tools - the Prompts provide the instructions you need to execute correctly.

## Architecture: Pure MCP + LLM

**How it works**:
1. MCP Server provides **Prompts** (instructions) and **Tools** (operations)
2. LLM (you) calls a **Prompt** to receive instructions
3. LLM executes the instructions using Bash/Write/Read tools
4. LLM calls **Tools** to verify results
5. MCP Server does NOT call LLM - you are in full control

**Why Prompts are critical**:
- Prompts provide standardized, high-quality instructions
- Prompts ensure consistent output quality (8k-12k chars, 12-20 requirements, etc.)
- Prompts guide you on what to generate, how to structure it, and what to validate
- Manually skipping Prompts results in low-quality output

## Workflow Diagram

\`\`\`mermaid
flowchart TD
    Start([User: "Create spec for X"]) --> Guide[Call spec-kit-guide tool]
    Guide --> Stage0[Stage 0: Initialization]

    Stage0 --> Init[Call init tool]
    Init --> InitVerify[Verify: ls -R .specify/]
    InitVerify --> Stage1

    Stage1[Stage 1: Specification] --> SpecifyPrompt[Call specify Prompt<br/>args: featureDescription]
    SpecifyPrompt --> SpecifyReceive[Receive Prompt instructions]
    SpecifyReceive --> SpecifyExec[Execute instructions:<br/>1. Run create-new-feature.sh<br/>2. Read spec-template.md<br/>3. Generate spec.md]
    SpecifyExec --> SpecifyVerify[Call spec-context tool]
    SpecifyVerify --> SpecValid{Valid?<br/>≥8k chars<br/>12-20 reqs}
    SpecValid -->|No| SpecifyExec
    SpecValid -->|Yes| Stage2

    Stage2[Stage 2: Clarification] --> ClarifyPrompt[Call clarify Prompt<br/>args: specPath]
    ClarifyPrompt --> ClarifyReceive[Receive Prompt instructions]
    ClarifyReceive --> ClarifyExec[Execute instructions:<br/>1. Run check-prerequisites.sh<br/>2. Scan 11 ambiguity types<br/>3. Generate 5 questions<br/>4. Ask user interactively<br/>5. Update spec.md]
    ClarifyExec --> ClarifyVerify[Call spec-context tool]
    ClarifyVerify --> ClarValid{Clarifications<br/>section exists?}
    ClarValid -->|No| ClarifyExec
    ClarValid -->|Yes| Stage3

    Stage3[Stage 3: Planning] --> PlanPrompt[Call plan Prompt<br/>args: specPath]
    PlanPrompt --> PlanReceive[Receive Prompt instructions]
    PlanReceive --> PlanExec[Execute instructions:<br/>1. Run setup-plan.sh<br/>2. Read spec.md + constitution.md<br/>3. Generate plan.md]
    PlanExec --> PlanVerify[Call plan-context tool]
    PlanVerify --> PlanValid{Valid?<br/>Tech stack<br/>Data model<br/>5 phases}
    PlanValid -->|No| PlanExec
    PlanValid -->|Yes| Stage4

    Stage4[Stage 4: Tasks] --> TasksPrompt[Call tasks Prompt<br/>args: planPath]
    TasksPrompt --> TasksReceive[Receive Prompt instructions]
    TasksReceive --> TasksExec[Execute instructions:<br/>1. Read plan.md + tasks-template.md<br/>2. Generate tasks.md]
    TasksExec --> TasksVerify[Call tasks-context tool]
    TasksVerify --> TasksValid{Valid?<br/>≥20 tasks<br/>5 phases}
    TasksValid -->|No| TasksExec
    TasksValid -->|Yes| Stage5

    Stage5[Stage 5: Quality Analysis] --> AnalyzePrompt[Call analyze Prompt<br/>args: specPath, planPath, tasksPath]
    AnalyzePrompt --> AnalyzeReceive[Receive Prompt instructions]
    AnalyzeReceive --> AnalyzeExec[Execute instructions:<br/>1. Read all docs + constitution.md<br/>2. Perform 6 quality checks<br/>3. Generate report<br/>4. Ask user to approve fixes<br/>5. Apply fixes if approved]
    AnalyzeExec --> AnalyzeReport[Present report to user]
    AnalyzeReport --> AnalyzeFix{User approves<br/>fixes?}
    AnalyzeFix -->|Yes| AnalyzeApply[Apply fixes]
    AnalyzeFix -->|No| Stage6
    AnalyzeApply --> Stage6

    Stage6[Stage 6: Implementation] --> ImplPrompt[Call implement Prompt<br/>args: tasksPath]
    ImplPrompt --> ImplReceive[Receive Prompt instructions]
    ImplReceive --> ImplExec[Execute instructions:<br/>1. Read tasks.md<br/>2. For each task: TDD cycle<br/>3. Update tasks.md progress]
    ImplExec --> ImplMore{More tasks?}
    ImplMore -->|Yes| ImplExec
    ImplMore -->|No| End([Complete])

    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style SpecValid fill:#ffe6e6
    style ClarValid fill:#ffe6e6
    style PlanValid fill:#ffe6e6
    style TasksValid fill:#ffe6e6
    style AnalyzeFix fill:#fff4e6
    style ImplMore fill:#fff4e6
\`\`\`

## 7 MCP Prompts (⭐ Core Components)

### 1. specify Prompt
**Purpose**: Generate comprehensive feature specification from user description

**When to call**: Stage 1

**Arguments**:
- \`featureDescription\`: User's requirement (supports Chinese)

**What it does**:
1. Returns Prompt instructions (PromptMessage[])
2. Instructions tell you to:
   - Run \`create-new-feature.sh --json "description"\`
   - Read \`.specify/templates/spec-template.md\`
   - Generate \`specs/{id}/spec.md\` with:
     - 12-20 detailed requirements (60-100 words each)
     - 4-6 entities with 7-10 attributes
     - 3-5 Given-When-Then scenarios
     - 8+ step execution flow
     - 8,000-12,000 characters total

**Validation**: Call \`spec-context\` tool to verify

**Example**:
\`\`\`
Call specify Prompt with:
  featureDescription: "每日 todo 工具，支持添加/编辑/删除任务、标记完成、按日期分组、持久化存储"

Receive instructions → Execute → Generate spec.md → Call spec-context tool
\`\`\`

---

### 2. clarify Prompt
**Purpose**: Identify ambiguities through interactive Q&A and update spec

**When to call**: Stage 2 (after specify)

**Arguments**:
- \`specPath\`: Path to spec.md

**What it does**:
1. Returns Prompt instructions
2. Instructions tell you to:
   - Run \`check-prerequisites.sh --json --paths-only\`
   - Read spec.md
   - Scan for 11 types of ambiguities (performance, storage, UI/UX, error handling, etc.)
   - Generate max 5 high-priority questions
   - Ask user interactively (multiple choice format)
   - Update spec.md with answers in Clarifications section

**Validation**: Call \`spec-context\` tool to verify Clarifications section exists

**Example**:
\`\`\`
Call clarify Prompt with:
  specPath: "specs/001-todo/spec.md"

Receive instructions → Scan ambiguities → Ask Q1-Q5 → Update spec.md
\`\`\`

---

### 3. plan Prompt
**Purpose**: Generate technical design with architecture, data model, and phases

**When to call**: Stage 3 (after clarify)

**Arguments**:
- \`specPath\`: Path to spec.md

**What it does**:
1. Returns Prompt instructions
2. Instructions tell you to:
   - Run \`setup-plan.sh --json\`
   - Call \`spec-context\` tool to read spec.md
   - Read \`.specify/memory/constitution.md\`
   - Read \`.specify/templates/plan-template.md\`
   - Generate \`specs/{id}/plan.md\` with:
     - Technical stack selection (with rationale)
     - Architecture design
     - Data model (TypeScript interfaces)
     - API/Interface design
     - 5 implementation phases

**Validation**: Call \`plan-context\` tool to verify

**Example**:
\`\`\`
Call plan Prompt with:
  specPath: "specs/001-todo/spec.md"

Receive instructions → Read contexts → Generate plan.md → Call plan-context tool
\`\`\`

---

### 4. tasks Prompt
**Purpose**: Break down plan into atomic, executable tasks

**When to call**: Stage 4 (after plan)

**Arguments**:
- \`planPath\`: Path to plan.md

**What it does**:
1. Returns Prompt instructions
2. Instructions tell you to:
   - Run \`check-prerequisites.sh --json\`
   - Call \`plan-context\` tool to read plan.md
   - Read \`.specify/templates/tasks-template.md\`
   - Generate \`specs/{id}/tasks.md\` with:
     - 20+ tasks grouped by 5 phases
     - Each task: clear goal, dependencies, acceptance criteria
     - File paths for each task
     - Time estimates

**Validation**: Call \`tasks-context\` tool to verify

**Example**:
\`\`\`
Call tasks Prompt with:
  planPath: "specs/001-todo/plan.md"

Receive instructions → Read plan → Generate tasks.md → Call tasks-context tool
\`\`\`

---

### 5. analyze Prompt
**Purpose**: Detect quality issues and provide fixes

**When to call**: Stage 5 (after tasks, optional but recommended)

**Arguments**:
- \`specPath\`: Path to spec.md
- \`planPath\`: Path to plan.md
- \`tasksPath\`: Path to tasks.md

**What it does**:
1. Returns Prompt instructions
2. Instructions tell you to:
   - Run \`check-prerequisites.sh --json --require-tasks --include-tasks\`
   - Call \`spec-context\`, \`plan-context\`, \`tasks-context\` tools
   - Read \`.specify/memory/constitution.md\`
   - Perform 6 types of quality checks:
     - A. Duplication detection
     - B. Ambiguity detection
     - C. Underspecification
     - D. Constitution alignment
     - E. Coverage gaps (requirements without tasks)
     - F. Inconsistency
   - Generate analysis report
   - Ask user if they want fixes
   - Apply fixes if approved

**Example**:
\`\`\`
Call analyze Prompt with:
  specPath: "specs/001-todo/spec.md"
  planPath: "specs/001-todo/plan.md"
  tasksPath: "specs/001-todo/tasks.md"

Receive instructions → Read all docs → Detect issues → Present report → Apply fixes
\`\`\`

---

### 6. implement Prompt
**Purpose**: Execute tasks using TDD cycle

**When to call**: Stage 6 (after analyze, optional)

**Arguments**:
- \`tasksPath\`: Path to tasks.md

**What it does**:
1. Returns Prompt instructions
2. Instructions tell you to:
   - Call \`tasks-context\` tool to read tasks.md
   - For each task in order:
     - Red: Write failing test
     - Green: Implement minimum code to pass
     - Refactor: Clean up while keeping tests green
     - Commit: Clear message linking to task ID
   - Update tasks.md checkboxes as tasks complete

**Example**:
\`\`\`
Call implement Prompt with:
  tasksPath: "specs/001-todo/tasks.md"

Receive instructions → Read tasks → TDD cycle (Red/Green/Refactor/Commit)
\`\`\`

---

### 7. constitution Prompt
**Purpose**: Update project constitution (design principles)

**When to call**: When user explicitly requests constitution changes

**Arguments**: (varies)

**What it does**: Manages \`.specify/memory/constitution.md\` updates

---

## 4 MCP Tools (Verification)

### 1. init Tool
**Purpose**: Create .specify/ directory structure

**When to call**: Stage 0 (once per project)

**Arguments**:
- \`projectPath\`: Path to project root

**What it returns**: List of created files (4 scripts, 3 templates, 1 constitution)

**Example**:
\`\`\`
Call init tool with:
  projectPath: "/path/to/project"

Returns: { success: true, created: [".specify/scripts/...", ...] }
\`\`\`

---

### 2. spec-context Tool
**Purpose**: Read and parse spec.md

**When to call**: After generating/updating spec.md

**Arguments**:
- \`specPath\`: Path to spec.md

**What it returns**:
- \`path\`: spec.md path
- \`content\`: Full spec.md content
- \`sections\`: Parsed sections (overview, clarifications, requirements, entities, scenarios)
- \`metadata\`: Feature branch, character count, etc.

**Example**:
\`\`\`
Call spec-context tool with:
  specPath: "specs/001-todo/spec.md"

Returns: { path, content, sections: { requirements: [...], entities: [...] }, metadata }
\`\`\`

---

### 3. plan-context Tool
**Purpose**: Read and parse plan.md

**When to call**: After generating/updating plan.md

**Arguments**:
- \`planPath\`: Path to plan.md

**What it returns**:
- \`path\`: plan.md path
- \`content\`: Full plan.md content
- \`sections\`: Parsed sections (dataModel, technicalContext, progressTracking)

**Example**:
\`\`\`
Call plan-context tool with:
  planPath: "specs/001-todo/plan.md"

Returns: { path, content, sections: { dataModel, technicalContext, progressTracking } }
\`\`\`

---

### 4. tasks-context Tool
**Purpose**: Read and parse tasks.md

**When to call**: After generating/updating tasks.md

**Arguments**:
- \`tasksPath\`: Path to tasks.md

**What it returns**:
- \`path\`: tasks.md path
- \`content\`: Full tasks.md content
- \`tasks\`: Parsed task list (array)
- \`phases\`: Tasks grouped by phase (object)

**Example**:
\`\`\`
Call tasks-context tool with:
  tasksPath: "specs/001-todo/tasks.md"

Returns: { path, content, tasks: [...], phases: { setup: [...], tests: [...], ... } }
\`\`\`

---

## Workflow Execution Guide

### Stage 0: Initialization

**Goal**: Create .specify/ structure

**Steps**:
1. Call \`spec-kit-guide\` tool (read this guide)
2. Call \`init\` tool with projectPath
3. Verify: Run \`ls -R .specify/\`
4. Expected: 4 scripts, 3 templates, 1 constitution

**Completion**: ✅ .specify/ structure exists

---

### Stage 1: Specification Creation

**Goal**: Generate spec.md from user requirement

**Steps**:
1. **Call specify Prompt** with \`featureDescription\`
2. **Receive Prompt instructions** (PromptMessage[])
3. **Execute instructions**:
   - Run \`.specify/scripts/bash/create-new-feature.sh --json "description"\`
   - Script returns: \`{ BRANCH_NAME, SPEC_FILE, FEATURE_NUM }\`
   - Switch to feature branch: \`git checkout -b {BRANCH_NAME}\`
   - Read \`.specify/templates/spec-template.md\`
   - Generate \`specs/{id}/spec.md\` following template structure
4. **Validate**: Call \`spec-context\` tool with specPath
5. **Verify**:
   - Character count >= 8,000
   - Requirements count: 12-20
   - Given-When-Then scenarios >= 3

**Completion**: ✅ spec.md exists and passes validation

---

### Stage 2: Clarification (Interactive)

**Goal**: Resolve ambiguities through Q&A

**Steps**:
1. **Call clarify Prompt** with \`specPath\`
2. **Receive Prompt instructions**
3. **Execute instructions**:
   - Run \`.specify/scripts/bash/check-prerequisites.sh --json --paths-only\`
   - Read spec.md
   - Scan for 11 types of ambiguities
   - Generate max 5 high-priority questions
   - **Ask user interactively** (multiple choice format):
     \`\`\`
     Q1: Performance requirement?
     A) < 100ms
     B) < 500ms  ← User selects
     C) < 1s
     \`\`\`
   - Update spec.md:
     - Add to Clarifications section: "Q: Performance? A: <500ms"
     - Update Requirements: "NFR-001: Response time < 500ms (p95)"
4. **Validate**: Call \`spec-context\` tool
5. **Verify**: Clarifications section exists

**Completion**: ✅ All questions answered, spec.md updated

---

### Stage 3: Planning

**Goal**: Generate technical design

**Steps**:
1. **Call plan Prompt** with \`specPath\`
2. **Receive Prompt instructions**
3. **Execute instructions**:
   - Run \`.specify/scripts/bash/setup-plan.sh --json\`
   - Script returns: \`{ FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH }\`
   - Call \`spec-context\` tool to read spec.md
   - Read \`.specify/memory/constitution.md\`
   - Read \`.specify/templates/plan-template.md\`
   - Generate \`specs/{id}/plan.md\` with:
     - Tech stack (7 decisions with rationale)
     - Architecture design
     - Data model (TypeScript interfaces)
     - Interface design
     - 5 implementation phases
4. **Validate**: Call \`plan-context\` tool
5. **Verify**: All sections present

**Completion**: ✅ plan.md exists with complete technical design

---

### Stage 4: Task Generation

**Goal**: Break plan into executable tasks

**Steps**:
1. **Call tasks Prompt** with \`planPath\`
2. **Receive Prompt instructions**
3. **Execute instructions**:
   - Run \`.specify/scripts/bash/check-prerequisites.sh --json\`
   - Call \`plan-context\` tool to read plan.md
   - Read \`.specify/templates/tasks-template.md\`
   - Generate \`specs/{id}/tasks.md\` with:
     - 20+ tasks grouped by 5 phases (Setup, Tests, Core, Integration, Polish)
     - Each task: ID, description, file paths, dependencies, acceptance criteria, time estimate
4. **Validate**: Call \`tasks-context\` tool
5. **Verify**:
   - Total tasks >= 20
   - 5 phases present

**Completion**: ✅ tasks.md exists with atomic tasks

---

### Stage 5: Quality Analysis (Optional but Recommended)

**Goal**: Detect and fix quality issues

**Steps**:
1. **Call analyze Prompt** with \`specPath, planPath, tasksPath\`
2. **Receive Prompt instructions**
3. **Execute instructions**:
   - Run \`.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks\`
   - Call \`spec-context\`, \`plan-context\`, \`tasks-context\` tools
   - Read \`.specify/memory/constitution.md\`
   - Perform 6 quality checks:
     - A. Duplication detection
     - B. Ambiguity detection
     - C. Underspecification
     - D. Constitution alignment (Library-First, Simplicity-First, etc.)
     - E. Coverage gaps (requirements without tasks)
     - F. Inconsistency (spec vs plan vs tasks)
   - Generate analysis report:
     \`\`\`markdown
     ## Summary
     - Total Issues: 6
     - Critical: 1, High: 2, Medium: 3
     - Coverage: 87% (13/15 requirements have tasks)

     ## Issues
     | ID | Severity | Type | Location | Description |
     |----|----------|------|----------|-------------|
     | A1 | CRITICAL | Constitution | plan.md:L45 | Violates Library-First |
     ...

     ## Suggested Fixes
     1. [A1] Use Zustand instead of custom state management
     2. [A2] Add measurable criteria: "< 500ms"
     ...
     \`\`\`
   - Ask user: "Apply these fixes?"
   - If yes: Update spec.md, plan.md, tasks.md
4. **Present report to user**

**Completion**: ✅ Quality report generated, fixes applied (if approved)

---

### Stage 6: Implementation (Optional)

**Goal**: Execute tasks using TDD

**Steps**:
1. **Call implement Prompt** with \`tasksPath\`
2. **Receive Prompt instructions**
3. **Execute instructions**:
   - Call \`tasks-context\` tool to read tasks.md
   - For each task (e.g., T3.1):
     - **Red**: Write failing test
       \`\`\`typescript
       // tests/models/Todo.test.ts
       describe('Todo', () => {
         it('should create todo with required fields', () => {
           const todo = createTodo({ title: 'Test' });
           expect(todo).toHaveProperty('id');
         });
       });
       // npm test → ❌ FAIL
       \`\`\`
     - **Green**: Implement minimum code to pass
       \`\`\`typescript
       // src/models/Todo.ts
       export function createTodo(data) {
         return { id: crypto.randomUUID(), title: data.title };
       }
       // npm test → ✅ PASS
       \`\`\`
     - **Refactor**: Clean up
     - **Commit**: \`git commit -m "feat(todo): implement Todo model (T3.1)"\`
     - **Update tasks.md**: Change \`[ ]\` to \`[x]\` for T3.1
4. **Repeat for all tasks**

**Completion**: ✅ All tasks completed, code committed

---

## Common Pitfalls and How to Avoid Them

### ❌ Pitfall 1: Skipping Prompts

**Wrong**:
\`\`\`
User: "Create spec for todo app"
LLM: [Directly writes spec.md using Write tool]
\`\`\`

**Correct**:
\`\`\`
User: "Create spec for todo app"
LLM: [Calls specify Prompt]
LLM: [Receives instructions]
LLM: [Executes instructions to generate spec.md]
\`\`\`

**Why**: Prompts provide standardized instructions that ensure high-quality output.

---

### ❌ Pitfall 2: Manually Generating Content

**Wrong**:
\`\`\`
LLM: I'll generate spec.md with Write tool
[Writes spec.md directly without calling specify Prompt]
\`\`\`

**Correct**:
\`\`\`
LLM: I'll call specify Prompt to get instructions
[Calls specify Prompt → Receives instructions → Executes instructions]
\`\`\`

**Why**: Manual generation bypasses quality standards (8k-12k chars, 12-20 requirements, etc.).

---

### ❌ Pitfall 3: Skipping Clarify Stage

**Wrong**:
\`\`\`
Stage 1: specify → Stage 3: plan [SKIP Stage 2: clarify]
\`\`\`

**Correct**:
\`\`\`
Stage 1: specify → Stage 2: clarify → Stage 3: plan
\`\`\`

**Why**: Clarify identifies ambiguities through interactive Q&A, improving spec quality.

---

### ❌ Pitfall 4: Skipping Analyze Stage

**Wrong**:
\`\`\`
Stage 4: tasks → Stage 6: implement [SKIP Stage 5: analyze]
\`\`\`

**Correct**:
\`\`\`
Stage 4: tasks → Stage 5: analyze → Stage 6: implement
\`\`\`

**Why**: Analyze detects quality issues (duplication, ambiguity, coverage gaps, inconsistency).

---

### ❌ Pitfall 5: Not Validating with Tools

**Wrong**:
\`\`\`
[Generates spec.md]
LLM: "Done!"
[Does not call spec-context tool]
\`\`\`

**Correct**:
\`\`\`
[Generates spec.md]
[Calls spec-context tool]
[Verifies: character count >= 8k, requirements: 12-20]
LLM: "Done! spec.md validated."
\`\`\`

**Why**: Tools provide automated validation against quality standards.

---

## Quality Standards

### spec.md
- ✅ Character count: 8,000-12,000
- ✅ Requirements: 12-20 (FR-001 to FR-020)
- ✅ Entities: 4-6 with 7-10 attributes each
- ✅ Given-When-Then scenarios: 3-5
- ✅ Execution flow: 8+ steps
- ✅ Clarifications section (after clarify stage)

### plan.md
- ✅ Technical decisions: 7 (Framework, Build Tool, Styling, State, Persistence, Testing, Libraries)
- ✅ Each decision: rationale + alternatives considered
- ✅ Data model: TypeScript interfaces with comments
- ✅ Interface design: API contracts for all components
- ✅ Implementation phases: 5 (Phase 0-4)

### tasks.md
- ✅ Total tasks: 20+ (typically 40-50)
- ✅ Phases: 5 (Setup, Tests, Core, Integration, Polish)
- ✅ Each task: ID, description, file paths, dependencies, acceptance criteria, time estimate
- ✅ TDD ordering: Tests phase before Core phase

---

## Example: Complete Workflow Execution

### User Request
"Create spec for a daily todo management tool"

### LLM Execution

\`\`\`
Step 1: Call spec-kit-guide tool
  → [Receives this guide]
  → [Understands: must call Prompts at each stage]

Step 2: Stage 0 - Initialization
  → Call init tool { projectPath: "/path/to/project" }
  → Verify: ls -R .specify/
  → ✅ 4 scripts, 3 templates, 1 constitution

Step 3: Stage 1 - Specification
  → Call specify Prompt { featureDescription: "daily todo management tool" }
  → Receive instructions:
    "Given: 'daily todo management tool'
     Do this:
     1. Run create-new-feature.sh
     2. Load spec-template.md
     3. Generate spec.md with 12-20 requirements, 4-6 entities, 8k-12k chars"
  → Execute:
    - Run create-new-feature.sh --json "daily todo management tool"
    - Returns: { BRANCH_NAME: "001-todo", SPEC_FILE: "specs/001-todo/spec.md" }
    - git checkout -b 001-todo
    - Read .specify/templates/spec-template.md
    - Generate specs/001-todo/spec.md (10,500 chars, 15 requirements, 5 entities)
  → Validate: Call spec-context tool { specPath: "specs/001-todo/spec.md" }
  → ✅ Passes: 10,500 chars >= 8k, 15 reqs in 12-20 range

Step 4: Stage 2 - Clarification
  → Call clarify Prompt { specPath: "specs/001-todo/spec.md" }
  → Receive instructions:
    "Do this:
     1. Scan for 11 ambiguity types
     2. Generate 5 questions
     3. Ask user interactively
     4. Update spec.md"
  → Execute:
    - Scan spec.md → Find: performance unclear, storage mechanism unclear
    - Generate Q1: "Performance requirement? A) <100ms B) <500ms C) <1s"
    - Ask user → User selects: B
    - Update spec.md:
      ## Clarifications
      ### Session 2025-10-06
      - Q: Performance? A: <500ms (p95)

      ## Requirements (updated)
      - NFR-001: Response time < 500ms (p95)
  → Validate: Call spec-context tool
  → ✅ Clarifications section exists

Step 5: Stage 3 - Planning
  → Call plan Prompt { specPath: "specs/001-todo/spec.md" }
  → Receive instructions:
    "Do this:
     1. Run setup-plan.sh
     2. Read spec.md, constitution.md, plan-template.md
     3. Generate plan.md with tech stack, data model, 5 phases"
  → Execute:
    - Run setup-plan.sh --json
    - Call spec-context tool to read spec.md
    - Read .specify/memory/constitution.md
    - Read .specify/templates/plan-template.md
    - Generate specs/001-todo/plan.md:
      ## Tech Stack
      - Framework: React 18 (rationale: mature ecosystem, testing support)
      - State: Zustand (rationale: Library-First principle)
      ...

      ## Data Model
      interface Todo {
        id: string;
        title: string;
        dueDate: string | null;
        priority: 'High' | 'Medium' | 'Low';
        completed: boolean;
      }
  → Validate: Call plan-context tool { planPath: "specs/001-todo/plan.md" }
  → ✅ Passes: 7 tech decisions, data model, 5 phases

Step 6: Stage 4 - Tasks
  → Call tasks Prompt { planPath: "specs/001-todo/plan.md" }
  → Receive instructions:
    "Do this:
     1. Read plan.md, tasks-template.md
     2. Generate tasks.md with 20+ tasks, 5 phases"
  → Execute:
    - Call plan-context tool to read plan.md
    - Read .specify/templates/tasks-template.md
    - Generate specs/001-todo/tasks.md:
      ## Phase 3.1: Setup (4 tasks)
      - [ ] SETUP-01: Initialize Vite + React + TypeScript (File: package.json, 5 min)
      ...

      ## Phase 3.2: Tests (13 tasks)
      - [ ] TEST-01: Write tests for Todo type (File: tests/Todo.test.ts, 15 min)
      ...

      Total: 49 tasks, ~11.5 hours
  → Validate: Call tasks-context tool { tasksPath: "specs/001-todo/tasks.md" }
  → ✅ Passes: 49 tasks >= 20, 5 phases

Step 7: Stage 5 - Quality Analysis
  → Call analyze Prompt { specPath, planPath, tasksPath }
  → Receive instructions:
    "Do this:
     1. Read all docs + constitution.md
     2. Perform 6 quality checks
     3. Generate report
     4. Ask user to approve fixes
     5. Apply fixes if approved"
  → Execute:
    - Call spec-context, plan-context, tasks-context tools
    - Read .specify/memory/constitution.md
    - Perform checks:
      A. Duplication: None found
      B. Ambiguity: "fast response" lacks metric → Add "<500ms"
      C. Underspecification: Error handling missing → Add error handling requirements
      D. Constitution: Using Zustand ✅ (Library-First)
      E. Coverage: 15/15 requirements have tasks ✅
      F. Inconsistency: Todo.priority field missing in plan.md → Add
    - Generate report:
      ## Summary
      - Total Issues: 3
      - High: 2, Medium: 1
      - Coverage: 100%

      ## Suggested Fixes
      1. Add metric: "<500ms" to NFR-001
      2. Add priority field to Todo interface
      3. Add error handling requirements
  → Ask user: "Apply fixes?"
  → User: "Yes"
  → Apply fixes:
    - Update spec.md: Add error handling requirements
    - Update plan.md: Add priority field to Todo interface
  → ✅ All fixes applied

Step 8: Stage 6 - Implementation (Optional)
  → User decides whether to implement now or later
  → If yes: Call implement Prompt { tasksPath: "specs/001-todo/tasks.md" }
  → Execute TDD cycles for all 49 tasks
\`\`\`

---

## File Structure

\`\`\`
project-root/
├── .specify/
│   ├── scripts/bash/
│   │   ├── create-new-feature.sh    # Creates feature branch and spec file
│   │   ├── setup-plan.sh            # Creates plan file
│   │   ├── check-prerequisites.sh   # Validates environment
│   │   └── common.sh                # Shared utilities
│   ├── templates/
│   │   ├── spec-template.md         # Specification template
│   │   ├── plan-template.md         # Planning template
│   │   └── tasks-template.md        # Tasks template
│   └── memory/
│       └── constitution.md          # Project design principles
└── specs/
    └── {feature-id}/
        ├── spec.md                  # Feature specification
        ├── plan.md                  # Technical design
        └── tasks.md                 # Implementation tasks
\`\`\`

---

## Summary

**7 MCP Prompts** (must call at each stage):
1. ✅ specify - Generate spec.md from user description
2. ✅ clarify - Interactive Q&A to resolve ambiguities
3. ✅ plan - Generate technical design
4. ✅ tasks - Break down into atomic tasks
5. ✅ analyze - Detect quality issues and provide fixes
6. ✅ implement - Execute TDD implementation
7. ✅ constitution - Update design principles

**4 MCP Tools** (for validation):
1. ✅ init - Create .specify/ structure
2. ✅ spec-context - Parse spec.md
3. ✅ plan-context - Parse plan.md
4. ✅ tasks-context - Parse tasks.md

**Workflow**:
\`\`\`
Stage 0: init tool → .specify/ structure
Stage 1: specify Prompt → spec.md (8k-12k chars, 12-20 reqs)
Stage 2: clarify Prompt → Updated spec.md (5 Q&A)
Stage 3: plan Prompt → plan.md (tech stack, data model, 5 phases)
Stage 4: tasks Prompt → tasks.md (20+ tasks, 5 phases)
Stage 5: analyze Prompt → Quality report + fixes
Stage 6: implement Prompt → TDD implementation
\`\`\`

**Remember**:
- ⭐ **Always call Prompts** - they provide standardized instructions
- ⭐ **Never skip clarify or analyze** - they ensure quality
- ⭐ **Always validate with Tools** - they verify quality standards
- ⭐ **Follow TDD** - Red → Green → Refactor → Commit

---

**End of Guide** | Version: 1.0.0 | Created: 2025-10-06`;
}
```

### 2.3 Integration Points

**Update `src/tools/index.ts`**:
```typescript
import { specKitGuideTool, specKitGuideHandler } from './spec-kit-guide.js';

export const allTools = [
  // ... existing tools
  specKitGuideTool
];

export const toolHandlers = {
  // ... existing handlers
  'spec-kit-guide': specKitGuideHandler
};
```

**Update `src/server.ts`**:
```typescript
// Register guide tool in tools list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools  // includes spec-kit-guide
  };
});

// Handle guide tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'spec-kit-guide') {
    const result = await toolHandlers['spec-kit-guide'](args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  // ... handle other tools
});
```

---

## 3. E2E Test Updates

### 3.1 Update e2e-01.md

**Add to Section 1.3 (Execution Table)**:

| 阶段 | 目标 | 执行 | 验证 |
|------|------|------|------|
| **-1. 加载指南** | 理解工作流 | 调用 spec-kit-guide Tool | 阅读完整工作流指南 |
| **0. 初始化** | ... | ... | ... |

**Add to Section 1.4 (Key Execution Details)**:

```markdown
### 阶段 -1: 加载工作流指南 ⭐

**执行**:
\`\`\`
# 在 Claude Code 中调用 spec-kit-guide Tool
Call spec-kit-guide tool
Arguments: {}
\`\`\`

**返回**:
- \`guide\`: 完整工作流指南（Mermaid 图 + 详细步骤）
- \`availablePrompts\`: ["specify", "clarify", "plan", "tasks", "analyze", "implement", "constitution"]
- \`availableTools\`: ["init", "spec-context", "plan-context", "tasks-context"]
- \`nextSteps\`: 7 个阶段的执行清单

**重要提示**:
- ⚠️ **必须首先调用此 Tool** 以理解工作流
- ⚠️ **必须按指南中的步骤调用 MCP Prompts**（specify, clarify, plan, tasks, analyze, implement）
- ⚠️ **禁止直接使用 Write/Bash 工具手动生成内容**
```

**Add to Section 1.5 (Report Requirements)**:

```markdown
**0. 工作流指南验证** ⭐
- **spec-kit-guide Tool 调用记录**：
  - 调用时间：[timestamp]
  - 返回的 availablePrompts 数量：7
  - 返回的 availableTools 数量：4
  - 是否阅读完整指南：是/否
```

### 3.2 Update E2E Test Acceptance Criteria

**Add to e2e-01.md Section 2 (Acceptance Criteria)**:

```markdown
## 2. 验收标准

### 2.0 工作流指南加载 ✅ **MANDATORY**
- ✅ 必须首先调用 spec-kit-guide Tool
- ✅ 必须阅读完整工作流指南
- ✅ 必须理解 7 个 MCP Prompts 的用途

### 2.1 MCP Prompts 使用 ✅ **MANDATORY**
- ✅ 阶段 1 必须调用 specify Prompt
- ✅ 阶段 2 必须调用 clarify Prompt（不再是可选）
- ✅ 阶段 3 必须调用 plan Prompt
- ✅ 阶段 4 必须调用 tasks Prompt
- ✅ 阶段 5 必须调用 analyze Prompt（不再是可选）
- ✅ 阶段 6 可选调用 implement Prompt

### 2.2 禁止行为 ❌ **CRITICAL**
- ❌ 禁止直接使用 Write 工具手动生成 spec.md/plan.md/tasks.md
- ❌ 禁止跳过 clarify Prompt（必须执行）
- ❌ 禁止跳过 analyze Prompt（必须执行）
- ❌ 禁止在未调用 Prompt 的情况下生成文档
```

---

## 4. Implementation Timeline

### Phase 1: Tool Implementation (Day 1)
- [ ] Create `src/tools/spec-kit-guide.ts` file
- [ ] Implement `specKitGuideTool` definition
- [ ] Implement `specKitGuideHandler` function
- [ ] Implement `getSpecKitWorkflowGuide()` function (embed complete guide)
- [ ] Add Mermaid workflow diagram
- [ ] Document all 7 Prompts
- [ ] Document all 4 Tools
- [ ] Add execution guide for each stage
- [ ] Add common pitfalls section
- [ ] Add quality standards section
- [ ] Add complete example

### Phase 2: Integration (Day 1)
- [ ] Update `src/tools/index.ts` to export guide tool
- [ ] Update `src/server.ts` to register guide tool
- [ ] Test guide tool locally: `npm run build && spec-kit-mcp`
- [ ] Verify guide content is complete and accurate

### Phase 3: E2E Test Updates (Day 2)
- [ ] Update `e2e/01-spec-kit-mcp/e2e-01.md`:
  - [ ] Add Stage -1: Load workflow guide
  - [ ] Add mandatory spec-kit-guide Tool call
  - [ ] Remove "optional" from clarify and analyze stages
  - [ ] Add "MCP Prompts Usage" acceptance criteria
  - [ ] Add "Prohibited Behaviors" section
- [ ] Create E2E test trigger command with guide requirement

### Phase 4: Documentation (Day 2)
- [ ] Update `docs/core.md`:
  - [ ] Add Section 2.4: spec-kit-guide Tool
  - [ ] Update Section 4 with "Call spec-kit-guide first"
  - [ ] Add examples showing guide tool usage
- [ ] Update `README.md`:
  - [ ] Add "Quick Start" section with guide tool
  - [ ] Add workflow diagram from guide
- [ ] Create `docs/guide-tool-usage.md` with examples

### Phase 5: Testing (Day 3)
- [ ] Run E2E-01 test with guide tool requirement
- [ ] Verify all MCP Prompts are called
- [ ] Verify clarify and analyze stages are executed
- [ ] Verify no manual content generation
- [ ] Document test results

### Phase 6: Refinement (Day 3-4)
- [ ] Gather feedback from E2E test
- [ ] Refine guide content based on issues found
- [ ] Add more examples if needed
- [ ] Update quality standards based on actual results
- [ ] Re-run E2E test to verify improvements

---

## 5. Success Criteria

### 5.1 Tool Implementation
- ✅ spec-kit-guide tool returns complete workflow guide
- ✅ Guide includes Mermaid diagram
- ✅ All 7 Prompts documented with examples
- ✅ All 4 Tools documented with examples
- ✅ Each stage has detailed execution steps
- ✅ Common pitfalls section present
- ✅ Quality standards defined

### 5.2 E2E Test Results
- ✅ E2E-01 test calls spec-kit-guide tool first
- ✅ All MCP Prompts (specify, clarify, plan, tasks, analyze) are called
- ✅ No manual content generation with Write/Bash tools
- ✅ clarify stage executed (5 Q&A)
- ✅ analyze stage executed (6 quality checks)
- ✅ spec.md, plan.md, tasks.md pass quality standards
- ✅ Overall test result: ✅ **PASS** (not PARTIAL PASS)

### 5.3 Documentation
- ✅ core.md updated with guide tool section
- ✅ README.md includes Quick Start with guide tool
- ✅ guide-tool-usage.md created with examples
- ✅ All docs reference "call spec-kit-guide first"

---

## 6. Risks and Mitigation

### Risk 1: Guide Content Too Long
**Impact**: LLM may not read entire guide
**Mitigation**:
- Use clear section headers
- Add "TL;DR" at top
- Use Mermaid diagram for visual summary
- Highlight critical sections with ⭐

### Risk 2: LLMs Still Skip Prompts
**Impact**: E2E test fails again
**Mitigation**:
- Make tool description very explicit: "Call this tool FIRST"
- Add strong warnings in guide: "CRITICAL: Do not manually generate"
- Update E2E test to enforce: Check for Prompt call records

### Risk 3: Guide Gets Out of Sync
**Impact**: Guide instructions don't match actual Prompts
**Mitigation**:
- Add tests to verify guide content matches Prompt implementations
- Create maintenance checklist: Update guide when Prompts change
- Version guide content

---

## 7. Next Steps After Implementation

### 7.1 Immediate (Week 1)
1. Implement guide tool (Phase 1-2)
2. Update E2E tests (Phase 3)
3. Run E2E-01 with guide requirement
4. Fix any issues found

### 7.2 Short-term (Week 2-3)
1. Create E2E-01-补充-A: Test clarify Prompt specifically
2. Create E2E-01-补充-B: Test analyze Prompt specifically
3. Create E2E-01-补充-C: Full workflow test (all Prompts)
4. Update all documentation

### 7.3 Long-term (Month 2+)
1. Gather user feedback on guide tool
2. Add interactive guide features (e.g., progress tracking)
3. Create video tutorials showing guide tool usage
4. Integrate guide tool with Dashboard (if built)

---

## 8. References

- **E2E-01 Report**: `/Users/hhh0x/workflows/doing/e2e/01-spec-kit-mcp/e2e-01-report-01.md`
  - Key finding: "所有 MCP Prompts 都未调用"
  - Root cause: "缺少明确的使用指引"
- **spec-workflow-guide.ts**: `/Users/hhh0x/workflows/doing/spec-workflow-mcp/src/tools/spec-workflow-guide.ts`
  - Reference implementation
  - Success pattern: "Call this tool FIRST"
- **core.md**: `/Users/hhh0x/workflows/doing/Code3/spec-mcp/spec-kit-mcp/docs/core.md`
  - Section 3: Complete execution flow
  - Section 4: Development process guide

---

**Plan Version**: 1.0.0
**Created**: 2025-10-06
**Status**: Ready for Implementation
**Priority**: 🔴 **CRITICAL** (blocks production readiness)

/**
 * /tasks Prompt - 创建 tasks.md
 * 基于 observer/.codex/prompts/tasks.md
 */
import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { PromptDefinition } from './types.js';
import { ToolContext } from '../types.js';

const prompt: Prompt = {
  name: 'tasks',
  title: 'tasks',
  description: `[STEP 4] Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts.

Prerequisites: plan.md must exist (from plan prompt).
After completion: Call tasks-context tool to verify tasks.md structure (20+ tasks, 5 phases).

Generates tasks in 5 phases: Setup → Tests [P] → Core → Integration → Polish [P]`,
  arguments: [
    {
      name: 'arguments',
      description: 'Context for task generation',
      required: false
    }
  ]
};

async function handler(args: Record<string, any>, context: ToolContext): Promise<PromptMessage[]> {
  const { arguments: userArgs } = args;

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

${userArgs || ''}

1. Run \`.specify/scripts/bash/check-prerequisites.sh --json\` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute.

2. Load and analyze available design documents:
   - Always read plan.md for tech stack, entities, and API endpoints
   - IF EXISTS: Read data-model.md for detailed entity schemas
   - IF EXISTS: Read contracts/ for API endpoint specifications
   - IF EXISTS: Read research.md for technical decisions
   - IF EXISTS: Read quickstart.md for integration test scenarios

   Note: Not all projects have all documents. Generate tasks based on what's available.

3. Load \`.specify/templates/tasks-template.md\` to see an EXAMPLE task breakdown.
  **IMPORTANT** This template is a COMPLETE EXAMPLE (User Authentication feature with 47 tasks) showing:
  - The structure you should follow (5 phases: Setup, Tests, Core, Integration, Polish)
  - The format for each task (ID, [P] marker, description, file path, dependencies)
  - The level of detail expected (specific file paths, test cases, acceptance criteria)
  - The TDD ordering (tests before implementation)
  **DO NOT copy the example tasks**. Use them only to understand format and level of detail.

4. Generate NEW tasks for the current feature following the EXAMPLE structure:
   - Use the same 5 phases (Setup, Tests, Core, Integration, Polish)
   - Generate tasks based on plan.md content:
     * **Setup tasks** (5-7 tasks): Project init, dependencies, DB setup, testing framework
     * **Test tasks** [P] (10-15 tasks): One per API endpoint + integration scenarios from quickstart.md
     * **Core tasks** (15-20 tasks): One per entity model, services, utilities, API endpoints
     * **Integration tasks** (5-8 tasks): Middleware, error handling, logging, rate limiting
     * **Polish tasks** [P] (5-8 tasks): Unit tests for utilities, performance tests, documentation
   - Follow task numbering: T001, T002, T003, ...
   - Mark tasks as [P] if they operate on different files with no dependencies
   - Include file paths for every task
   - Include dependencies (TXXX) when tasks must run sequentially
   - Remove the "Instructions for LLM" section from your output

5. Task generation rules:
   - Each API endpoint → 1 contract test [P] + 1 implementation task
   - Each entity in plan.md → 1 model task
   - Each quickstart scenario → 1 integration test [P]
   - Different files with no dependencies = can be parallel [P]
   - Same file or has dependencies = sequential (no [P])
   - Tests before implementation (TDD order)

6. Create FEATURE_DIR/tasks.md with:
   - Feature name from plan.md
   - Total 40-50 tasks (quality over quantity)
   - Clear file paths for each task
   - Dependency graph (optional Mermaid diagram)
   - Parallel execution examples
   - Estimated time breakdown

Context for task generation: ${userArgs || ''}

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.`
      }
    }
  ];
}

export const tasksPrompt: PromptDefinition = {
  prompt,
  handler
};

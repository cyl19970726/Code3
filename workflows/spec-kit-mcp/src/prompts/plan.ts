/**
 * /plan Prompt - 创建 plan.md 和设计文档
 * 基于 observer/.codex/prompts/plan.md
 */
import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { PromptDefinition } from './types.js';
import { ToolContext } from '../types.js';

const prompt: Prompt = {
  name: 'plan',
  title: 'plan',
  description: `[STEP 3] Execute the implementation planning workflow using the plan template to generate plan.md with tech stack, data model, and execution phases.

Prerequisites: spec.md must exist (from specify prompt). Recommended to run clarify prompt first.
After completion: Call plan-context tool to verify plan.md structure (7 tech decisions, data model, 5 phases).

Generates: plan.md, research.md, data-model.md, contracts/, quickstart.md`,
  arguments: [
    {
      name: 'arguments',
      description: 'Implementation details and technical constraints',
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

Given the implementation details provided as an argument, do this:

1. Run \`.specify/scripts/bash/setup-plan.sh --json\` from the repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH. All future file paths must be absolute.
   - BEFORE proceeding, inspect FEATURE_SPEC for a \`## Clarifications\` section with at least one \`Session\` subheading. If missing or clearly ambiguous areas remain (vague adjectives, unresolved critical choices), PAUSE and instruct the user to run \`/clarify\` first to reduce rework. Only continue if: (a) Clarifications exist OR (b) an explicit user override is provided (e.g., "proceed without clarification"). Do not attempt to fabricate clarifications yourself.

2. Read and analyze the feature specification to understand:
   - The feature requirements and user stories
   - Functional and non-functional requirements
   - Success criteria and acceptance criteria
   - Any technical constraints or dependencies mentioned
   - Key entities from spec.md (these must match in plan.md)

3. Read the constitution at \`.specify/memory/constitution.md\` to understand constitutional requirements.

4. Load \`.specify/templates/plan-template.md\` to see an EXAMPLE implementation plan.
  **IMPORTANT** This template is a COMPLETE EXAMPLE (User Authentication feature) showing:
  - The structure you should follow (Technical Context, 7 tech decisions, data model, API contracts)
  - The level of detail expected (Decision + Rationale + Alternatives for each decision)
  - Constitution Check format (simplified, no complex logic)
  **DO NOT copy the example content**. Use it only to understand structure and format.

5. Write a NEW implementation plan to IMPL_PLAN following the EXAMPLE structure:
  - Read spec.md thoroughly to understand requirements
  - Write Technical Context with specific versions (Node.js 20+, PostgreSQL 15+, etc.)
  - Generate 7 tech decisions:
    * Each must have: Decision, Rationale, Alternatives (at least 2-3)
    * Cover: tech stack, data storage, external services, security, performance, error handling, deployment
  - List entities with data types (must match spec.md Key Entities section)
  - List API endpoints needed for the feature
  - List test scenarios (from spec.md or quickstart requirements)
  - Incorporate user-provided details: ${userArgs || ''}
  - Remove the "Instructions for LLM" section from your output
  - Update Progress Tracking sections

6. Optionally generate supporting artifacts (if needed):
  - research.md (tech stack analysis, security considerations)
  - data-model.md (TypeScript interfaces + Prisma schema)
  - contracts/ (OpenAPI specs for each endpoint)
  - quickstart.md (integration test scenarios)

7. Verify plan quality:
  - 7 tech decisions with rationale and alternatives
  - Entities match spec.md
  - Constitution Check completed (PASS/FAIL status)
  - All required sections present

8. Report results with branch name, file paths, and generated artifacts.

Use absolute paths with the repository root for all file operations to avoid path issues.`
      }
    }
  ];
}

export const planPrompt: PromptDefinition = {
  prompt,
  handler
};

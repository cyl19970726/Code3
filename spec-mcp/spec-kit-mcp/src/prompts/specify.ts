/**
 * /specify Prompt - 创建 spec.md
 * 基于 observer/.codex/prompts/specify.md
 */
import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { PromptDefinition } from './types.js';
import { ToolContext } from '../types.js';

const prompt: Prompt = {
  name: 'specify',
  title: 'specify',
  description: `[STEP 1] Create or update the feature specification from a natural language feature description.

Prerequisites: Call init tool first to create .specify/ structure.
After completion: Call spec-context tool to verify spec.md quality (8k-12k chars, 12-20 requirements).

This is the first step in the spec-kit workflow. Always start here when creating new features.`,
  arguments: [
    {
      name: 'featureDescription',
      description: 'Natural language feature description (the text after /specify command)',
      required: true
    }
  ]
};

async function handler(args: Record<string, any>, context: ToolContext): Promise<PromptMessage[]> {
  const { featureDescription } = args;

  if (!featureDescription) {
    throw new Error('featureDescription is required');
  }

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

${featureDescription}

The text the user typed after \`/specify\` in the triggering message **is** the feature description. Assume you always have it available in this conversation even if the text appears literally below. Do not ask the user to repeat it unless they provided an empty command.

Given that feature description, do this:

1. Run the script \`.specify/scripts/bash/create-new-feature.sh --json "${featureDescription}"\` from repo root and parse its JSON output for BRANCH_NAME and SPEC_FILE. All file paths must be absolute.
  **IMPORTANT** You must only ever run this script once. The JSON is provided in the terminal as output - always refer to it to get the actual content you're looking for.

2. Load \`.specify/templates/spec-template.md\` to see an EXAMPLE specification.
  **IMPORTANT** This template is a COMPLETE EXAMPLE (User Authentication feature) showing:
  - The structure you should follow (section headings, format)
  - The level of detail expected (15 requirements, 8 scenarios, 4 entities)
  - The quality standards (GIVEN-WHEN-THEN format, specific requirements)
  **DO NOT copy the example content**. Use it only to understand structure and format.

3. Write a NEW specification to SPEC_FILE following the EXAMPLE structure:
  - Use the same section headings (## User Scenarios & Testing, ## Requirements, etc.)
  - Follow the same format for requirements (FR-1, FR-2, NFR-1, NFR-2)
  - Follow the same format for scenarios (numbered, GIVEN-WHEN-THEN)
  - Follow the same format for entities (Name: attributes with types)
  - Replace ALL example content with content derived from the feature description
  - Remove the "Instructions for LLM" section from your output
  - Aim for similar quality: 12-20 functional requirements, 3-8 scenarios, 4-6 entities

4. Report completion with branch name, spec file path, and readiness for the next phase.

Note: The script creates and checks out the new branch and initializes the spec file before writing.`
      }
    }
  ];
}

export const specifyPrompt: PromptDefinition = {
  prompt,
  handler
};

/**
 * spec-context Tool - 读取并解析 spec.md
 * 提供给 LLM 使用，获取 spec 上下文
 */
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const specContextTool: Tool = {
  name: 'spec-context',
  description: 'Read and parse spec.md to get specification context',
  inputSchema: {
    type: 'object',
    properties: {
      specPath: {
        type: 'string',
        description: 'Path to spec.md file (absolute or relative to project root)',
      },
    },
    required: ['specPath'],
  },
};

export interface SpecContext {
  path: string;
  content: string;
  sections: {
    overview?: string;
    clarifications?: string;
    userScenarios?: string;
    requirements?: string;
    reviewChecklist?: string;
    executionStatus?: string;
  };
  metadata: {
    featureBranch?: string;
    created?: string;
    status?: string;
    input?: string;
  };
}

export async function handleSpecContext(args: Record<string, any>): Promise<SpecContext> {
  const { specPath } = args;

  if (!specPath) {
    throw new Error('specPath is required');
  }

  const absolutePath = resolve(process.cwd(), specPath);

  try {
    const content = readFileSync(absolutePath, 'utf-8');

    // Parse sections (simple extraction based on headings)
    const sections: SpecContext['sections'] = {};
    const metadata: SpecContext['metadata'] = {};

    // Extract metadata from header
    const metadataMatch = content.match(/\*\*Feature Branch\*\*:\s*`([^`]+)`/);
    if (metadataMatch) metadata.featureBranch = metadataMatch[1];

    const createdMatch = content.match(/\*\*Created\*\*:\s*([^\n]+)/);
    if (createdMatch) metadata.created = createdMatch[1];

    const statusMatch = content.match(/\*\*Status\*\*:\s*([^\n]+)/);
    if (statusMatch) metadata.status = statusMatch[1];

    const inputMatch = content.match(/\*\*Input\*\*:\s*"([^"]+)"/);
    if (inputMatch) metadata.input = inputMatch[1];

    // Extract sections
    const overviewMatch = content.match(/## Execution Flow \(main\)([\s\S]*?)(?=\n##|$)/);
    if (overviewMatch) sections.overview = overviewMatch[1].trim();

    const clarificationsMatch = content.match(/## Clarifications([\s\S]*?)(?=\n##|$)/);
    if (clarificationsMatch) sections.clarifications = clarificationsMatch[1].trim();

    const userScenariosMatch = content.match(/## User Scenarios & Testing([\s\S]*?)(?=\n##|$)/);
    if (userScenariosMatch) sections.userScenarios = userScenariosMatch[1].trim();

    const requirementsMatch = content.match(/## Requirements([\s\S]*?)(?=\n##|$)/);
    if (requirementsMatch) sections.requirements = requirementsMatch[1].trim();

    const reviewMatch = content.match(/## Review & Acceptance Checklist([\s\S]*?)(?=\n##|$)/);
    if (reviewMatch) sections.reviewChecklist = reviewMatch[1].trim();

    const executionMatch = content.match(/## Execution Status([\s\S]*?)(?=\n##|$)/);
    if (executionMatch) sections.executionStatus = executionMatch[1].trim();

    return {
      path: absolutePath,
      content,
      sections,
      metadata,
    };
  } catch (error: any) {
    throw new Error(`Failed to read spec file: ${error.message}`);
  }
}

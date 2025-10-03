/**
 * plan-context Tool - 读取并解析 plan.md
 * 提供给 LLM 使用，获取 plan 上下文
 */
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const planContextTool: Tool = {
  name: 'plan-context',
  description: 'Read and parse plan.md to get implementation plan context',
  inputSchema: {
    type: 'object',
    properties: {
      planPath: {
        type: 'string',
        description: 'Path to plan.md file (absolute or relative to project root)',
      },
    },
    required: ['planPath'],
  },
};

export interface PlanContext {
  path: string;
  content: string;
  sections: {
    overview?: string;
    architecture?: string;
    dataModel?: string;
    technicalContext?: string;
    phases?: string;
    progressTracking?: string;
  };
}

export async function handlePlanContext(args: Record<string, any>): Promise<PlanContext> {
  const { planPath } = args;

  if (!planPath) {
    throw new Error('planPath is required');
  }

  const absolutePath = resolve(process.cwd(), planPath);

  try {
    const content = readFileSync(absolutePath, 'utf-8');

    // Parse sections
    const sections: PlanContext['sections'] = {};

    const overviewMatch = content.match(/## Overview([\s\S]*?)(?=\n##|$)/);
    if (overviewMatch) sections.overview = overviewMatch[1].trim();

    const architectureMatch = content.match(/## Architecture([\s\S]*?)(?=\n##|$)/);
    if (architectureMatch) sections.architecture = architectureMatch[1].trim();

    const dataModelMatch = content.match(/## Data Model([\s\S]*?)(?=\n##|$)/);
    if (dataModelMatch) sections.dataModel = dataModelMatch[1].trim();

    const technicalMatch = content.match(/## Technical Context([\s\S]*?)(?=\n##|$)/);
    if (technicalMatch) sections.technicalContext = technicalMatch[1].trim();

    const phasesMatch = content.match(/## Phases([\s\S]*?)(?=\n##|$)/);
    if (phasesMatch) sections.phases = phasesMatch[1].trim();

    const progressMatch = content.match(/## Progress Tracking([\s\S]*?)(?=\n##|$)/);
    if (progressMatch) sections.progressTracking = progressMatch[1].trim();

    return {
      path: absolutePath,
      content,
      sections,
    };
  } catch (error: any) {
    throw new Error(`Failed to read plan file: ${error.message}`);
  }
}

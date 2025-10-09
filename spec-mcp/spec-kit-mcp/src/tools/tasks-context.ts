/**
 * tasks-context Tool - 读取并解析 tasks.md
 * 提供给 LLM 使用，获取 tasks 上下文
 */
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const tasksContextTool: Tool = {
  name: 'tasks-context',
  description: `Read and parse tasks.md to get tasks context. Use this tool to verify tasks.md quality after calling tasks prompt or track implementation progress during implement prompt.

Quality standards to check:
- Total tasks: 20+ tasks minimum
- Phases: 5 phases (Setup, Tests, Core, Integration, Polish)
- Parallel markers: [P] for tasks that can run concurrently
- Dependencies: Clear dependency order
- Acceptance criteria: Each task has testable outcomes

Returns: Full content, parsed tasks with IDs/descriptions/completion status, grouped by phase.`,
  inputSchema: {
    type: 'object',
    properties: {
      tasksPath: {
        type: 'string',
        description: 'Path to tasks.md file (absolute or relative to project root)',
      },
    },
    required: ['tasksPath'],
  },
};

export interface TaskItem {
  id: string;
  description: string;
  phase?: string;
  isParallel: boolean;
  filePaths?: string[];
  completed: boolean;
}

export interface TasksContext {
  path: string;
  content: string;
  tasks: TaskItem[];
  phases: {
    setup?: TaskItem[];
    tests?: TaskItem[];
    core?: TaskItem[];
    integration?: TaskItem[];
    polish?: TaskItem[];
  };
}

export async function handleTasksContext(args: Record<string, any>): Promise<TasksContext> {
  const { tasksPath } = args;

  if (!tasksPath) {
    throw new Error('tasksPath is required');
  }

  const absolutePath = resolve(process.cwd(), tasksPath);

  try {
    const content = readFileSync(absolutePath, 'utf-8');

    // Parse tasks (simple extraction)
    const tasks: TaskItem[] = [];
    const phases: TasksContext['phases'] = {};

    // Extract tasks from numbered list
    const taskPattern = /^-\s+\[([x ])\]\s+\*\*(T\d+)\*\*:\s+(.+?)(?:\s+\[P\])?$/gm;
    let match;

    while ((match = taskPattern.exec(content)) !== null) {
      const completed = match[1] === 'x';
      const id = match[2];
      const description = match[3].trim();
      const isParallel = content.includes(`${id}`) && content.includes('[P]');

      tasks.push({
        id,
        description,
        isParallel,
        completed,
      });
    }

    // Group by phase (simplified - you can enhance this based on headings)
    phases.setup = tasks.filter((t) => t.description.toLowerCase().includes('setup'));
    phases.tests = tasks.filter((t) => t.description.toLowerCase().includes('test'));
    phases.core = tasks.filter(
      (t) =>
        !t.description.toLowerCase().includes('setup') &&
        !t.description.toLowerCase().includes('test') &&
        !t.description.toLowerCase().includes('integration') &&
        !t.description.toLowerCase().includes('polish')
    );
    phases.integration = tasks.filter((t) => t.description.toLowerCase().includes('integration'));
    phases.polish = tasks.filter((t) => t.description.toLowerCase().includes('polish'));

    return {
      path: absolutePath,
      content,
      tasks,
      phases,
    };
  } catch (error: any) {
    throw new Error(`Failed to read tasks file: ${error.message}`);
  }
}

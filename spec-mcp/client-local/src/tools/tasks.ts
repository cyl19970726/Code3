/**
 * spec_mcp.tasks tool implementation
 *
 * Creates tasks.md with TDD ordering, parallel/dependency annotations
 * Based on spec-kit/scripts/bash/check-task-prerequisites.sh logic
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { TasksInput, TasksOutput } from '../types/contracts.js';
import { ErrorCode } from '../types/contracts.js';
import { getFeatureMetadata, featureExists } from '../utils/feature.js';
import { loadTemplate, processTemplate } from '../utils/templates.js';

/**
 * Check prerequisites for tasks generation
 * Based on check-task-prerequisites.sh
 */
async function checkTaskPrerequisites(
  featureDir: string
): Promise<{ ok: boolean; missing: string[] }> {
  const required = ['research.md', 'data-model.md', 'quickstart.md'];
  const missing: string[] = [];

  for (const file of required) {
    const path = join(featureDir, file);
    try {
      await fs.access(path);
    } catch {
      missing.push(file);
    }
  }

  // Also check contracts directory
  const contractsDir = join(featureDir, 'contracts');
  try {
    await fs.access(contractsDir);
  } catch {
    missing.push('contracts/');
  }

  return {
    ok: missing.length === 0,
    missing,
  };
}

/**
 * Check if tasks.md already exists
 */
async function checkTasksExists(featureDir: string): Promise<boolean> {
  const tasksPath = join(featureDir, 'tasks.md');
  try {
    await fs.access(tasksPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute the tasks tool
 */
export async function tasks(
  input: TasksInput,
  workspaceRoot?: string
): Promise<TasksOutput> {
  try {
    // Check if feature exists
    const exists = await featureExists(input.feature_id, workspaceRoot);
    if (!exists) {
      return {
        success: false,
        path: '',
        error: {
          code: ErrorCode.NOT_FOUND,
          message: `Feature ${input.feature_id} not found. Run /specify first.`,
        },
      };
    }

    // Get feature metadata
    const metadata = await getFeatureMetadata(input.feature_id, workspaceRoot);

    // Check prerequisites
    const prereqs = await checkTaskPrerequisites(metadata.dir_path);
    if (!prereqs.ok) {
      return {
        success: false,
        path: '',
        error: {
          code: ErrorCode.PRECONDITION,
          message: `Missing prerequisites: ${prereqs.missing.join(', ')}. Complete /plan phase first.`,
        },
      };
    }

    // Check if tasks.md already exists
    const tasksExists = await checkTasksExists(metadata.dir_path);
    if (tasksExists && !input.allow_overwrite) {
      return {
        success: false,
        path: '',
        error: {
          code: ErrorCode.EXISTS,
          message: `tasks.md already exists for feature ${input.feature_id}. Set allow_overwrite=true to overwrite.`,
        },
      };
    }

    // Load tasks template
    const tasksTemplate = await loadTemplate('tasks-template.md');

    // Process variables
    const tasksContent = processTemplate(tasksTemplate, {
      FEATURE_ID: input.feature_id,
      DATE: new Date().toISOString().split('T')[0],
    });

    // Write tasks.md
    const tasksPath = join(metadata.dir_path, 'tasks.md');
    await fs.writeFile(tasksPath, tasksContent, 'utf-8');

    return {
      success: true,
      path: tasksPath,
    };
  } catch (error) {
    return {
      success: false,
      path: '',
      error: {
        code: ErrorCode.INTERNAL,
        message: `Failed to create tasks: ${(error as Error).message}`,
      },
    };
  }
}
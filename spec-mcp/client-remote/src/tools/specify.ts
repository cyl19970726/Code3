/**
 * spec_mcp.specify tool (remote variant)
 *
 * This is identical to client-local version to allow
 * creating specs locally before remote publishing.
 * Avoids requiring both client-local and client-remote to be installed.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { SpecifyInput, SpecifyOutput } from '../types/contracts.js';
import { ErrorCode } from '../types/contracts.js';

/**
 * Get specs directory
 */
function getSpecsDir(workspaceRoot?: string): string {
  const root = workspaceRoot || process.cwd();
  return join(root, 'specs');
}

/**
 * Convert description to slug
 */
function toSlug(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Get next feature number
 */
async function getNextFeatureNumber(specsDir: string): Promise<number> {
  try {
    const entries = await fs.readdir(specsDir, { withFileTypes: true });
    let maxNum = 0;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const match = entry.name.match(/^(\d{3})-/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }

    return maxNum + 1;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 1;
    }
    throw error;
  }
}

/**
 * Generate feature ID
 */
function generateFeatureId(num: number, slug: string): string {
  const paddedNum = String(num).padStart(3, '0');
  return `${paddedNum}-${slug}`;
}

/**
 * Check if feature exists
 */
async function featureExists(featureId: string, workspaceRoot?: string): Promise<boolean> {
  const specsDir = getSpecsDir(workspaceRoot);
  const dirPath = join(specsDir, featureId);
  try {
    await fs.access(dirPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Simple spec template (inline to avoid dependency on templates directory)
 */
function getSpecTemplate(featureId: string, description: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `# Spec: ${featureId}

**Created**: ${date}
**Status**: Draft

## Overview

${description}

## Requirements

### Functional Requirements

1.

### Non-Functional Requirements

1.

## User Scenarios

### Scenario 1:

**Actor**:
**Goal**:
**Steps**:
1.
2.
3.

## Clarifications

-

## Out of Scope

-

## Success Criteria

-
`;
}

/**
 * Execute specify tool
 */
export async function specify(
  input: SpecifyInput,
  workspaceRoot?: string
): Promise<SpecifyOutput> {
  try {
    // Determine feature ID
    let featureId: string;
    if (input.feature_id) {
      featureId = input.feature_id;
    } else {
      const specsDir = getSpecsDir(workspaceRoot);
      const slug = toSlug(input.feature_description);
      const num = await getNextFeatureNumber(specsDir);
      featureId = generateFeatureId(num, slug);
    }

    // Check if exists
    const exists = await featureExists(featureId, workspaceRoot);
    if (exists && !input.allow_overwrite) {
      return {
        success: false,
        feature_id: featureId,
        paths: {
          spec: '',
          dir: '',
        },
        error: {
          code: ErrorCode.EXISTS,
          message: `Feature ${featureId} already exists. Set allow_overwrite=true to overwrite.`,
        },
      };
    }

    // Create directory
    const specsDir = getSpecsDir(workspaceRoot);
    const dirPath = join(specsDir, featureId);
    await fs.mkdir(dirPath, { recursive: true });

    // Write spec.md
    const specContent = getSpecTemplate(featureId, input.feature_description);
    const specPath = join(dirPath, 'spec.md');
    await fs.writeFile(specPath, specContent, 'utf-8');

    return {
      success: true,
      feature_id: featureId,
      paths: {
        spec: specPath,
        dir: dirPath,
      },
    };
  } catch (error) {
    return {
      success: false,
      feature_id: input.feature_id || '',
      paths: {
        spec: '',
        dir: '',
      },
      error: {
        code: ErrorCode.INTERNAL,
        message: `Failed to create feature: ${(error as Error).message}`,
      },
    };
  }
}
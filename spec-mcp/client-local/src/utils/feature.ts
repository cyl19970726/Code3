/**
 * Feature path and numbering utilities
 *
 * Implements the logic from spec-kit/scripts/bash/common.sh and create-new-feature.sh
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import type { FeatureMetadata } from '../types/contracts.js';

/**
 * Get the specs directory path (defaults to ./specs relative to workspace root)
 */
export function getSpecsDir(workspaceRoot?: string): string {
  const root = workspaceRoot || process.cwd();
  return join(root, 'specs');
}

/**
 * Convert a description to a slug
 */
export function toSlug(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Get the next feature number by scanning existing specs
 */
export async function getNextFeatureNumber(specsDir: string): Promise<number> {
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
    // If specs dir doesn't exist, start with 1
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 1;
    }
    throw error;
  }
}

/**
 * Generate a feature ID from number and slug
 */
export function generateFeatureId(num: number, slug: string): string {
  const paddedNum = String(num).padStart(3, '0');
  return `${paddedNum}-${slug}`;
}

/**
 * Parse a feature ID into components
 */
export function parseFeatureId(featureId: string): { num: number; slug: string } | null {
  const match = featureId.match(/^(\d{3})-(.+)$/);
  if (!match) {
    return null;
  }
  return {
    num: parseInt(match[1], 10),
    slug: match[2],
  };
}

/**
 * Get feature metadata from feature ID
 */
export async function getFeatureMetadata(
  featureId: string,
  workspaceRoot?: string
): Promise<FeatureMetadata> {
  const parsed = parseFeatureId(featureId);
  if (!parsed) {
    throw new Error(`Invalid feature ID format: ${featureId}`);
  }

  const specsDir = getSpecsDir(workspaceRoot);
  const dirPath = join(specsDir, featureId);

  return {
    feature_id: featureId,
    feature_num: parsed.num,
    slug: parsed.slug,
    branch_name: `feat/${featureId}`,
    dir_path: dirPath,
  };
}

/**
 * Check if a feature directory exists
 */
export async function featureExists(featureId: string, workspaceRoot?: string): Promise<boolean> {
  const metadata = await getFeatureMetadata(featureId, workspaceRoot);
  try {
    await fs.access(metadata.dir_path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create feature directory
 */
export async function createFeatureDir(featureId: string, workspaceRoot?: string): Promise<string> {
  const metadata = await getFeatureMetadata(featureId, workspaceRoot);
  await fs.mkdir(metadata.dir_path, { recursive: true });
  return metadata.dir_path;
}

/**
 * Generate a new feature ID
 */
export async function generateNewFeatureId(
  description: string,
  workspaceRoot?: string
): Promise<string> {
  const specsDir = getSpecsDir(workspaceRoot);
  const slug = toSlug(description);
  const num = await getNextFeatureNumber(specsDir);
  return generateFeatureId(num, slug);
}
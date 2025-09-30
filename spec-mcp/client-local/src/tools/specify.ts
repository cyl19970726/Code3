/**
 * spec_mcp.specify tool implementation
 *
 * Creates a new feature specification following spec-kit conventions.
 * Based on spec-kit/scripts/bash/create-new-feature.sh
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { SpecifyInput, SpecifyOutput } from '../types/contracts.js';
import { ErrorCode } from '../types/contracts.js';
import {
  generateNewFeatureId,
  featureExists,
  createFeatureDir,
  getFeatureMetadata,
} from '../utils/feature.js';
import { loadTemplate, processTemplate } from '../utils/templates.js';

/**
 * Execute the specify tool
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
      featureId = await generateNewFeatureId(input.feature_description, workspaceRoot);
    }

    // Check if feature already exists
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

    // Get feature metadata
    const metadata = await getFeatureMetadata(featureId, workspaceRoot);

    // Create feature directory (transactional approach)
    try {
      await createFeatureDir(featureId, workspaceRoot);

      // Load and process spec template
      const specTemplate = await loadTemplate('spec-template.md');
      const specContent = processTemplate(specTemplate, {
        FEATURE_ID: featureId,
        FEATURE_DESCRIPTION: input.feature_description,
        DATE: new Date().toISOString().split('T')[0],
      });

      // Write spec.md
      const specPath = join(metadata.dir_path, 'spec.md');
      await fs.writeFile(specPath, specContent, 'utf-8');

      // Success
      return {
        success: true,
        feature_id: featureId,
        paths: {
          spec: specPath,
          dir: metadata.dir_path,
        },
      };
    } catch (writeError) {
      // Rollback: try to remove the directory if we created it
      try {
        await fs.rm(metadata.dir_path, { recursive: true, force: true });
      } catch {
        // Ignore rollback errors
      }

      return {
        success: false,
        feature_id: featureId,
        paths: {
          spec: '',
          dir: '',
        },
        error: {
          code: ErrorCode.INTERNAL,
          message: `Failed to write spec: ${(writeError as Error).message}`,
        },
      };
    }
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
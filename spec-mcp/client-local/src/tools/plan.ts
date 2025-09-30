/**
 * spec_mcp.plan tool implementation
 *
 * Creates plan artifacts (plan.md, research.md, data-model.md, contracts/, quickstart.md)
 * Based on spec-kit/scripts/bash/setup-plan.sh
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { PlanInput, PlanOutput } from '../types/contracts.js';
import { ErrorCode } from '../types/contracts.js';
import { getFeatureMetadata, featureExists } from '../utils/feature.js';
import { loadTemplate, processTemplate } from '../utils/templates.js';

/**
 * Check if spec.md exists for the feature
 */
async function checkSpecExists(featureDir: string): Promise<boolean> {
  const specPath = join(featureDir, 'spec.md');
  try {
    await fs.access(specPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if any plan artifact already exists
 */
async function checkPlanArtifactsExist(featureDir: string): Promise<string[]> {
  const artifacts = ['plan.md', 'research.md', 'data-model.md', 'quickstart.md'];
  const existing: string[] = [];

  for (const artifact of artifacts) {
    const path = join(featureDir, artifact);
    try {
      await fs.access(path);
      existing.push(artifact);
    } catch {
      // Doesn't exist, that's fine
    }
  }

  return existing;
}

/**
 * Execute the plan tool
 */
export async function plan(
  input: PlanInput,
  workspaceRoot?: string
): Promise<PlanOutput> {
  try {
    // Check if feature exists
    const exists = await featureExists(input.feature_id, workspaceRoot);
    if (!exists) {
      return {
        success: false,
        paths: {
          plan: '',
          research: '',
          data_model: '',
          contracts: '',
          quickstart: '',
        },
        error: {
          code: ErrorCode.NOT_FOUND,
          message: `Feature ${input.feature_id} not found. Run /specify first.`,
        },
      };
    }

    // Get feature metadata
    const metadata = await getFeatureMetadata(input.feature_id, workspaceRoot);

    // Check if spec.md exists (precondition)
    const hasSpec = await checkSpecExists(metadata.dir_path);
    if (!hasSpec) {
      return {
        success: false,
        paths: {
          plan: '',
          research: '',
          data_model: '',
          contracts: '',
          quickstart: '',
        },
        error: {
          code: ErrorCode.PRECONDITION,
          message: `spec.md not found for feature ${input.feature_id}. Run /specify first.`,
        },
      };
    }

    // Check if artifacts already exist
    const existing = await checkPlanArtifactsExist(metadata.dir_path);
    if (existing.length > 0 && !input.allow_overwrite) {
      return {
        success: false,
        paths: {
          plan: '',
          research: '',
          data_model: '',
          contracts: '',
          quickstart: '',
        },
        error: {
          code: ErrorCode.EXISTS,
          message: `Plan artifacts already exist: ${existing.join(', ')}. Set allow_overwrite=true to overwrite.`,
        },
      };
    }

    // Load plan template
    const planTemplate = await loadTemplate('plan-template.md');

    // Process variables
    const techConstraints = input.tech_constraints || 'No specific constraints provided';
    const planContent = processTemplate(planTemplate, {
      FEATURE_ID: input.feature_id,
      TECH_CONSTRAINTS: techConstraints,
      DATE: new Date().toISOString().split('T')[0],
    });

    // Create contracts directory
    const contractsDir = join(metadata.dir_path, 'contracts');
    await fs.mkdir(contractsDir, { recursive: true });

    // Write plan artifacts
    const planPath = join(metadata.dir_path, 'plan.md');
    const researchPath = join(metadata.dir_path, 'research.md');
    const dataModelPath = join(metadata.dir_path, 'data-model.md');
    const quickstartPath = join(metadata.dir_path, 'quickstart.md');

    await fs.writeFile(planPath, planContent, 'utf-8');

    // Create placeholder stubs for Phase 0/1 outputs
    await fs.writeFile(
      researchPath,
      `# Research — ${input.feature_id}\n\n[To be completed during Phase 0]\n`,
      'utf-8'
    );

    await fs.writeFile(
      dataModelPath,
      `# Data Model — ${input.feature_id}\n\n[To be completed during Phase 1]\n`,
      'utf-8'
    );

    await fs.writeFile(
      quickstartPath,
      `# Quick Start — ${input.feature_id}\n\n[To be completed during Phase 1]\n`,
      'utf-8'
    );

    // Create a README in contracts directory
    await fs.writeFile(
      join(contractsDir, 'README.md'),
      `# Contracts — ${input.feature_id}\n\n[To be completed during Phase 1]\n`,
      'utf-8'
    );

    return {
      success: true,
      paths: {
        plan: planPath,
        research: researchPath,
        data_model: dataModelPath,
        contracts: contractsDir,
        quickstart: quickstartPath,
      },
    };
  } catch (error) {
    return {
      success: false,
      paths: {
        plan: '',
        research: '',
        data_model: '',
        contracts: '',
        quickstart: '',
      },
      error: {
        code: ErrorCode.INTERNAL,
        message: `Failed to create plan: ${(error as Error).message}`,
      },
    };
  }
}
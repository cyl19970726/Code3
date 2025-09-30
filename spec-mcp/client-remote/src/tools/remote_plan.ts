/**
 * spec_mcp.remote_plan tool
 *
 * Generates plan artifacts remotely and optionally posts to Issue
 * Based on Code3/docs/07-mcp-tools-spec.md
 */

import type { RemotePlanInput, RemotePlanOutput } from '../types/contracts.js';
import { ErrorCode } from '../types/contracts.js';

/**
 * Generate plan artifacts
 * NOTE: This is a simplified version that generates basic templates
 * In production, this would call an AI model to generate comprehensive plans
 */
function generatePlanArtifacts(featureId: string): Record<string, string> {
  const date = new Date().toISOString().split('T')[0];

  const plan = `# Plan: ${featureId}

**Created**: ${date}
**Status**: Draft

## Phase 0: Research

[Research findings to be added]

## Phase 1: Implementation

[Implementation plan to be added]

## Constitution Check

- [ ] Simplicity
- [ ] Testability
- [ ] Observability
- [ ] Versioning
`;

  const research = `# Research: ${featureId}

**Created**: ${date}

## Findings

[Research findings]

## Related Work

[Related projects/libraries]

## Technical Constraints

[Constraints and limitations]
`;

  const dataModel = `# Data Model: ${featureId}

**Created**: ${date}

## Entities

[Entity definitions]

## Relationships

[Relationships between entities]
`;

  const quickstart = `# Quickstart: ${featureId}

**Created**: ${date}

## Installation

\`\`\`bash
# Installation commands
\`\`\`

## Usage

\`\`\`bash
# Usage examples
\`\`\`

## Verification

\`\`\`bash
# Verification steps
\`\`\`
`;

  return {
    'plan.md': plan,
    'research.md': research,
    'data-model.md': dataModel,
    'quickstart.md': quickstart,
  };
}

/**
 * Post artifacts to GitHub Issue as comment
 * NOTE: Requires github-mcp-server integration
 */
async function postArtifactsToIssue(
  issueUrl: string,
  artifacts: Record<string, string>
): Promise<void> {
  // TODO: Implement actual MCP call to github-mcp-server
  throw new Error(
    'GitHub comment posting not yet implemented. ' +
      'This requires github-mcp-server integration.'
  );

  // Expected pattern:
  // const comment = formatArtifactsAsComment(artifacts);
  // await mcpClient.callTool('github_create_comment', {
  //   issue_url: issueUrl,
  //   body: comment,
  // });
}

/**
 * Execute remote_plan tool
 */
export async function remotePlan(
  input: RemotePlanInput
): Promise<RemotePlanOutput> {
  try {
    // Generate plan artifacts
    const artifacts = generatePlanArtifacts(input.feature_id);

    // Try to post to Issue
    let posted = false;
    try {
      await postArtifactsToIssue(input.issue_url, artifacts);
      posted = true;
    } catch (error) {
      // Non-fatal: artifacts still returned to caller
      console.warn(`Failed to post artifacts to Issue: ${(error as Error).message}`);
    }

    return {
      success: true,
      artifacts,
      posted,
    };
  } catch (error) {
    return {
      success: false,
      artifacts: {},
      posted: false,
      error: {
        code: ErrorCode.INTERNAL,
        message: `Failed to generate plan: ${(error as Error).message}`,
      },
    };
  }
}
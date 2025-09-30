/**
 * spec_mcp.publish_issue_with_metadata tool
 *
 * Publishes a feature spec as GitHub Issue with embedded code3/v1 metadata
 * and creates corresponding Aptos bounty.
 *
 * Based on Code3/docs/07-mcp-tools-spec.md and 14-data-model.md
 */

import { promises as fs } from 'fs';
import type {
  PublishIssueInput,
  PublishIssueOutput,
  IssueMetadata,
} from '../types/contracts.js';
import { ErrorCode } from '../types/contracts.js';
import { calculateIssueHash, generateTaskId } from '../utils/hash.js';

/**
 * Create Issue metadata object (before hash calculation)
 */
function createIssueMetadata(
  input: PublishIssueInput,
  issueNumber: number
): Omit<IssueMetadata, 'issue_hash'> {
  const repoUrl = `https://github.com/${input.repo}`;
  const taskId = generateTaskId(input.repo, issueNumber);

  return {
    schema: 'code3/v1',
    repo: repoUrl,
    issue_number: issueNumber,
    feature_id: input.feature_id,
    task_id: taskId,
    bounty: {
      network: input.network,
      asset: input.asset,
      amount: input.amount,
      bounty_id: null,
      merged_at: null,
      cooling_until: null,
    },
    spec_refs: [input.spec_path],
    labels: input.labels || ['code3', 'open'],
  };
}

/**
 * Format Issue body with spec content and metadata
 */
async function formatIssueBody(
  specPath: string,
  metadata: IssueMetadata
): Promise<string> {
  try {
    const specContent = await fs.readFile(specPath, 'utf-8');

    return `# ${metadata.feature_id}

${specContent}

---

## Task Metadata

\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`

**Bounty**: ${metadata.bounty.amount} ${metadata.bounty.asset} on ${metadata.bounty.network}
**Task ID**: \`${metadata.task_id}\`
**Labels**: ${metadata.labels.join(', ')}
`;
  } catch (error) {
    throw new Error(`Failed to read spec file: ${(error as Error).message}`);
  }
}

/**
 * Call github-mcp-server to create Issue
 *
 * NOTE: This is a placeholder that expects github-mcp-server to be available
 * as an MCP tool. In actual implementation, this would use the MCP SDK
 * to call the github tool.
 */
async function createGitHubIssue(
  repo: string,
  title: string,
  body: string,
  labels: string[],
  assignees: string[]
): Promise<{ url: string; number: number }> {
  // TODO: Implement actual MCP call to github-mcp-server
  // For now, return mock data for development
  throw new Error(
    'GitHub MCP integration not yet implemented. ' +
      'This requires github-mcp-server to be installed and configured. ' +
      'See Code3/docs/12-security-and-secrets.md for setup.'
  );

  // Expected call pattern:
  // const result = await mcpClient.callTool('github_create_issue', {
  //   repo,
  //   title,
  //   body,
  //   labels,
  //   assignees,
  // });
  // return { url: result.html_url, number: result.number };
}

/**
 * Call aptos-chain-mcp to create bounty
 *
 * NOTE: This is a placeholder that expects aptos-chain-mcp to be available
 */
async function createAptosBounty(
  repoUrl: string,
  issueHash: string,
  asset: string,
  amount: string,
  network: string
): Promise<{ bounty_id: string }> {
  // TODO: Implement actual MCP call to aptos-chain-mcp
  throw new Error(
    'Aptos MCP integration not yet implemented. ' +
      'This requires aptos-chain-mcp to be installed and configured. ' +
      'See Code3/docs/09-api-and-config.md for setup.'
  );

  // Expected call pattern:
  // const result = await mcpClient.callTool('aptos_create_bounty', {
  //   repo_url: repoUrl,
  //   issue_hash: issueHash,
  //   asset,
  //   amount,
  //   network,
  // });
  // return { bounty_id: result.bounty_id };
}

/**
 * Update Issue with bounty_id (call github-mcp-server again)
 */
async function updateIssueWithBountyId(
  repo: string,
  issueNumber: number,
  bountyId: string,
  metadata: IssueMetadata
): Promise<void> {
  // TODO: Implement actual MCP call to update Issue body
  // This would replace the metadata JSON block with updated bounty_id
  throw new Error('GitHub Issue update not yet implemented');
}

/**
 * Execute publish tool
 */
export async function publishIssueWithMetadata(
  input: PublishIssueInput,
  workspaceRoot?: string
): Promise<PublishIssueOutput> {
  try {
    // Step 1: Create initial metadata (without issue_hash yet)
    // We'll get issue_number from GitHub first
    const title = `[Code3] ${input.feature_id}`;

    // Step 2: Create GitHub Issue
    let issueUrl: string;
    let issueNumber: number;
    try {
      const issue = await createGitHubIssue(
        input.repo,
        title,
        'Creating Issue...', // Temporary body
        input.labels || ['code3', 'open'],
        input.assignees || []
      );
      issueUrl = issue.url;
      issueNumber = issue.number;
    } catch (error) {
      return {
        success: false,
        issue: {
          url: '',
          number: 0,
          issue_hash: '',
        },
        bounty: {
          bounty_id: '',
        },
        error: {
          code: ErrorCode.GH_RATE_LIMIT,
          message: `Failed to create GitHub Issue: ${(error as Error).message}`,
        },
      };
    }

    // Step 3: Create metadata with issue_number
    const metadataWithoutHash = createIssueMetadata(input, issueNumber);

    // Step 4: Calculate issue_hash from canonical JSON
    const issueHash = calculateIssueHash(metadataWithoutHash);
    const metadata: IssueMetadata = {
      ...metadataWithoutHash,
      issue_hash: issueHash,
    };

    // Step 5: Format Issue body with spec content and metadata
    const body = await formatIssueBody(input.spec_path, metadata);

    // Step 6: Update Issue with final body
    // (In practice, we might create with final body directly if we can predict issue_number)
    // For now, we'll skip the update and note this in the error

    // Step 7: Create Aptos bounty
    let bountyId: string;
    try {
      const bounty = await createAptosBounty(
        metadata.repo,
        metadata.issue_hash,
        input.asset,
        input.amount,
        input.network
      );
      bountyId = bounty.bounty_id;
    } catch (error) {
      return {
        success: false,
        issue: {
          url: issueUrl,
          number: issueNumber,
          issue_hash: issueHash,
        },
        bounty: {
          bounty_id: '',
        },
        error: {
          code: ErrorCode.CHAIN_TX_FAILED,
          message: `Issue created but bounty creation failed: ${(error as Error).message}`,
        },
      };
    }

    // Step 8: Update Issue metadata with bounty_id
    metadata.bounty.bounty_id = bountyId;
    try {
      await updateIssueWithBountyId(input.repo, issueNumber, bountyId, metadata);
    } catch (error) {
      // Non-fatal: bounty is created, just metadata not updated
      console.warn(`Failed to update Issue with bounty_id: ${(error as Error).message}`);
    }

    // Success
    return {
      success: true,
      issue: {
        url: issueUrl,
        number: issueNumber,
        issue_hash: issueHash,
      },
      bounty: {
        bounty_id: bountyId,
      },
    };
  } catch (error) {
    return {
      success: false,
      issue: {
        url: '',
        number: 0,
        issue_hash: '',
      },
      bounty: {
        bounty_id: '',
      },
      error: {
        code: ErrorCode.INTERNAL,
        message: `Failed to publish issue: ${(error as Error).message}`,
      },
    };
  }
}
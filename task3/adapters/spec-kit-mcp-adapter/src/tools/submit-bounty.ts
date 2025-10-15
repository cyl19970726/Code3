/**
 * MCP Tool: submit-bounty (提交 PR)
 *
 * Functionality:
 * 1. Create GitHub Pull Request
 * 2. Submit PR info on-chain
 * 3. Return PR URL
 *
 * State validation:
 * - Bounty status must be Accepted
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SpecKitDataOperator } from '../data-operator.js';
import { AptosBountyOperator } from '@code3-team/bounty-operator-aptos';
import { ConcreteTask3Operator } from '@code3-team/orchestration';
import { Network } from '@aptos-labs/ts-sdk';

const SubmitBountySchema = z.object({
  issueUrl: z.string().describe('GitHub Issue URL'),
  branchName: z.string().describe('Git branch name with changes'),
  summary: z.string().optional().describe('PR summary (optional)'),
  filesChanged: z.array(z.string()).optional().describe('List of changed files (optional)'),
  testing: z.string().optional().describe('Testing notes (optional)'),
  moduleAddress: z.string().describe('Module address for bounty contract')
});

export async function submitBounty(
  args: z.infer<typeof SubmitBountySchema>,
  config: {
    githubToken: string;
    aptosPrivateKey: string;
    localSpecsDir: string;
    repo: string;
  }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // 1. Create operators
    const dataOperator = new SpecKitDataOperator({
      githubToken: config.githubToken,
      repo: config.repo,
      localSpecsDir: config.localSpecsDir
    });

    const bountyOperator = new AptosBountyOperator({
      privateKey: config.aptosPrivateKey,
      network: Network.TESTNET,
      moduleAddress: args.moduleAddress
    });

    // 2. Create Task3Operator instance and call submitFlow
    const task3Operator = new ConcreteTask3Operator();
    const result = await task3Operator.submitFlow({
      dataOperator,
      bountyOperator,
      taskUrl: args.issueUrl,
      submissionData: {
        branchName: args.branchName,
        summary: args.summary,
        filesChanged: args.filesChanged,
        testing: args.testing
      }
    });

    // 3. Return result
    const message = `✅ PR submitted successfully!\n\n- PR: ${result.submissionUrl}\n- Tx Hash: ${result.txHash}\n\nWaiting for PR review and merge.`;

    return {
      content: [{ type: 'text', text: message }]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to submit PR: ${error.message}\n\nStack: ${error.stack}`
        }
      ]
    };
  }
}

export const submitBountyTool: Tool = {
  name: 'submit-bounty',
  description: `Submit a PR for a spec-kit bounty.

This tool:
1. Creates GitHub Pull Request
2. Submits PR info on-chain
3. Returns PR URL

State validation: Bounty must be in Accepted status.`,
  inputSchema: {
    type: 'object',
    properties: {
      issueUrl: {
        type: 'string',
        description: 'GitHub Issue URL'
      },
      branchName: {
        type: 'string',
        description: 'Git branch name with changes'
      },
      summary: {
        type: 'string',
        description: 'PR summary (optional)'
      },
      filesChanged: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of changed files (optional)'
      },
      testing: {
        type: 'string',
        description: 'Testing notes (optional)'
      },
      moduleAddress: {
        type: 'string',
        description: 'Module address for bounty contract'
      }
    },
    required: ['issueUrl', 'branchName', 'moduleAddress']
  }
};

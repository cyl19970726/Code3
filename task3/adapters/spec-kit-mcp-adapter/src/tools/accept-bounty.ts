/**
 * MCP Tool: accept-bounty (接单)
 *
 * Functionality:
 * 1. Download spec.md from GitHub Issue to local
 * 2. Accept bounty on-chain
 * 3. Return local path and bountyId
 *
 * State validation:
 * - Bounty status must be Open
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SpecKitDataOperator } from '../data-operator.js';
import { AptosBountyOperator } from '@code3-team/bounty-operator-aptos';
import { ConcreteTask3Operator } from '@code3-team/orchestration';
import { Network } from '@aptos-labs/ts-sdk';

const AcceptBountySchema = z.object({
  issueUrl: z.string().describe('GitHub Issue URL'),
  moduleAddress: z.string().describe('Module address for bounty contract')
});

export async function acceptBounty(
  args: z.infer<typeof AcceptBountySchema>,
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

    // 2. Create Task3Operator instance and call acceptFlow
    const task3Operator = new ConcreteTask3Operator();
    const result = await task3Operator.acceptFlow({
      dataOperator,
      bountyOperator,
      taskUrl: args.issueUrl
    });

    // 3. Return result
    const message = `✅ Bounty accepted successfully!\n\n- Bounty ID: ${result.bountyId}\n- Local Path: ${result.localPath}\n- Tx Hash: ${result.txHash}\n\nYou can now start working on the spec.`;

    return {
      content: [{ type: 'text', text: message }]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to accept bounty: ${error.message}\n\nStack: ${error.stack}`
        }
      ]
    };
  }
}

export const acceptBountyTool: Tool = {
  name: 'accept-bounty',
  description: `Accept a spec-kit bounty from GitHub Issue.

This tool:
1. Downloads spec.md from Issue to local directory
2. Accepts the bounty on-chain
3. Returns local path and bounty ID

State validation: Bounty must be in Open status.`,
  inputSchema: {
    type: 'object',
    properties: {
      issueUrl: {
        type: 'string',
        description: 'GitHub Issue URL (e.g., "https://github.com/owner/repo/issues/123")'
      },
      moduleAddress: {
        type: 'string',
        description: 'Module address for bounty contract'
      }
    },
    required: ['issueUrl', 'moduleAddress']
  }
};

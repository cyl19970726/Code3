/**
 * MCP Tool: confirm-bounty (确认提交)
 *
 * Functionality:
 * 1. Verify PR submission exists
 * 2. Confirm bounty on-chain (User confirms Worker's submission)
 * 3. Enter 7-day cooling period
 * 4. Return txHash and coolingUntil timestamp
 *
 * State validation:
 * - Bounty status must be Submitted
 *
 * Role: User (confirms Worker's submission)
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SpecKitDataOperator } from '../data-operator.js';
import { AptosBountyOperator } from '@code3-team/bounty-operator-aptos';
import { ConcreteTask3Operator } from '@code3-team/orchestration';
import { Network } from '@aptos-labs/ts-sdk';

const ConfirmBountySchema = z.object({
  issueUrl: z.string().describe('GitHub Issue URL'),
  moduleAddress: z.string().describe('Module address for bounty contract')
});

export async function confirmBounty(
  args: z.infer<typeof ConfirmBountySchema>,
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

    // 2. Create Task3Operator instance and call confirmFlow
    const task3Operator = new ConcreteTask3Operator();
    const result = await task3Operator.confirmFlow({
      dataOperator,
      bountyOperator,
      taskUrl: args.issueUrl
    });

    // 3. Return result
    const coolingEndDate = new Date(result.coolingUntil * 1000).toISOString();
    const message = `✅ Bounty confirmed successfully!\n\n- Tx Hash: ${result.txHash}\n- Confirmed At: ${new Date(result.confirmedAt * 1000).toISOString()}\n- Cooling Period Ends: ${coolingEndDate}\n\nThe worker can claim the bounty after the cooling period ends.`;

    return {
      content: [{ type: 'text', text: message }]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to confirm bounty: ${error.message}\n\nStack: ${error.stack}`
        }
      ]
    };
  }
}

export const confirmBountyTool: Tool = {
  name: 'confirm-bounty',
  description: `Confirm a submitted PR for a spec-kit bounty (User role).

This tool:
1. Verifies PR submission exists
2. Confirms bounty on-chain (transitions Submitted → Confirmed)
3. Starts 7-day cooling period
4. Returns tx hash and cooling period end time

State validation:
- Bounty must be in Submitted status

Role: Executed by User to confirm Worker's submission`,
  inputSchema: {
    type: 'object',
    properties: {
      issueUrl: {
        type: 'string',
        description: 'GitHub Issue URL'
      },
      moduleAddress: {
        type: 'string',
        description: 'Module address for bounty contract'
      }
    },
    required: ['issueUrl', 'moduleAddress']
  }
};

/**
 * MCP Tool: claim-bounty (领取奖金)
 *
 * Functionality:
 * 1. Verify PR is merged (from on-chain status)
 * 2. Verify cooling period has ended
 * 3. Claim payout on-chain
 * 4. Return txHash and amount
 *
 * State validation:
 * - Bounty status must be Confirmed
 * - Cooling period must have ended
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SpecKitDataOperator } from '../data-operator.js';
import { AptosBountyOperator } from '@code3-team/bounty-operator-aptos';
import { ConcreteTask3Operator } from '@code3-team/orchestration';
import { Network } from '@aptos-labs/ts-sdk';

const ClaimBountySchema = z.object({
  issueUrl: z.string().describe('GitHub Issue URL'),
  moduleAddress: z.string().describe('Module address for bounty contract')
});

export async function claimBounty(
  args: z.infer<typeof ClaimBountySchema>,
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

    // 2. Create Task3Operator instance and call claimFlow
    const task3Operator = new ConcreteTask3Operator();
    const result = await task3Operator.claimFlow({
      dataOperator,
      bountyOperator,
      taskUrl: args.issueUrl
    });

    // 3. Return result
    const message = `✅ Bounty claimed successfully!\n\n- Amount: ${result.amount} ${result.asset}\n- Tx Hash: ${result.txHash}\n\nCongratulations! 🎉`;

    return {
      content: [{ type: 'text', text: message }]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to claim bounty: ${error.message}\n\nStack: ${error.stack}`
        }
      ]
    };
  }
}

export const claimBountyTool: Tool = {
  name: 'claim-bounty',
  description: `Claim payout for a completed spec-kit bounty.

This tool:
1. Verifies PR is merged (from on-chain status)
2. Verifies cooling period has ended
3. Claims payout on-chain
4. Returns tx hash and amount

State validation:
- Bounty must be in Confirmed status
- Cooling period must have ended`,
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

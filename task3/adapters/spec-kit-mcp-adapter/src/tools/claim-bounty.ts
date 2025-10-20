/**
 * MCP Tool: claim-bounty (领取奖金)
 *
 * Functionality:
 * 1. Verify PR is merged (from on-chain status)
 * 2. Verify cooling period has ended (if applicable)
 * 3. Claim payout on-chain
 * 4. Return txHash and amount
 *
 * State validation:
 * - Bounty status must be Confirmed
 * - Cooling period must have ended (if applicable on the chain)
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AptosBountyOperator } from '@code3-team/bounty-operator-aptos';
import { EthereumBountyOperator } from '@code3-team/bounty-operator-ethereum';
import { BountyOperator, BountyStatus } from '@code3-team/bounty-operator';
import { Network } from '@aptos-labs/ts-sdk';
import { getEthereumConfig, getAptosConfig } from '../chain-config.js';

const ClaimBountySchema = z.object({
  bountyId: z.string().describe('Bounty ID (from accept-bounty or publish-bounty)'),
  chain: z.enum(['aptos', 'ethereum']).default('ethereum').describe('Target blockchain (ethereum=Sepolia testnet, aptos=Aptos testnet)')
});

export async function claimBounty(
  args: z.infer<typeof ClaimBountySchema>,
  config: {
    githubToken: string;
    aptosPrivateKey?: string;
    ethereumPrivateKey?: string;
    localSpecsDir: string;
    repo: string;
  }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // 1. Create BountyOperator based on chain
    let bountyOperator: BountyOperator;
    let chainConfig;

    if (args.chain === 'ethereum') {
      if (!config.ethereumPrivateKey) {
        throw new Error('ETHEREUM_PRIVATE_KEY is required for Ethereum chain');
      }

      chainConfig = getEthereumConfig();
      bountyOperator = new EthereumBountyOperator({
        rpcUrl: chainConfig.rpcUrl,
        privateKey: config.ethereumPrivateKey,
        contractAddress: chainConfig.contractAddress
      });
    } else {
      // Aptos
      if (!config.aptosPrivateKey) {
        throw new Error('APTOS_PRIVATE_KEY is required for Aptos chain');
      }

      chainConfig = getAptosConfig();
      bountyOperator = new AptosBountyOperator({
        privateKey: config.aptosPrivateKey,
        network: Network.TESTNET,
        moduleAddress: chainConfig.contractAddress
      });
    }

    // 2. Validate bounty status (must be Confirmed)
    const bounty = await bountyOperator.getBounty({ bountyId: args.bountyId });
    if (bounty.status !== BountyStatus.Confirmed) {
      throw new Error(
        `Bounty status validation failed: expected Confirmed, got ${bounty.status}`
      );
    }

    // 3. Claim payout on-chain
    const claimResult = await bountyOperator.claimPayout({
      bountyId: args.bountyId
    });

    // 4. Return result
    const message = `✅ Payout claimed successfully!\n\n- Bounty ID: ${args.bountyId}\n- Amount: ${bounty.amount} ${bounty.asset}\n- Tx Hash: ${claimResult.txHash}\n- Chain: ${args.chain} (${chainConfig.network})\n\nCongratulations! 🎉`;

    return {
      content: [{ type: 'text', text: message }]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to claim payout: ${error.message}\n\nStack: ${error.stack}`
        }
      ]
    };
  }
}

export const claimBountyTool: Tool = {
  name: 'claim-bounty',
  description: `Claim payout for a completed spec-kit bounty (Worker role).

This tool:
1. Validates bounty status on-chain (must be Confirmed)
2. Claims payout on-chain
3. Returns tx hash and amount

State validation:
- Bounty must be in Confirmed status

Role: Executed by Worker to claim earned bounty`,
  inputSchema: {
    type: 'object',
    properties: {
      bountyId: {
        type: 'string',
        description: 'Bounty ID (from accept-bounty output)'
      },
      chain: {
        type: 'string',
        enum: ['aptos', 'ethereum'],
        default: 'ethereum',
        description: 'Target blockchain (ethereum=Sepolia testnet, aptos=Aptos testnet)'
      }
    },
    required: ['bountyId', 'chain']
  }
};

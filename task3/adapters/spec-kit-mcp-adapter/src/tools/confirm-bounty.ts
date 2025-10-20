/**
 * MCP Tool: confirm-bounty (确认提交)
 *
 * Functionality:
 * 1. Verify PR submission exists
 * 2. Confirm bounty on-chain (User confirms Worker's submission)
 * 3. Enter cooling period
 * 4. Return txHash and coolingUntil timestamp (if applicable)
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
import { EthereumBountyOperator } from '@code3-team/bounty-operator-ethereum';
import { BountyOperator, BountyStatus } from '@code3-team/bounty-operator';
import { Network } from '@aptos-labs/ts-sdk';
import { getEthereumConfig, getAptosConfig } from '../chain-config.js';

const ConfirmBountySchema = z.object({
  bountyId: z.string().describe('Bounty ID (from accept-bounty or publish-bounty)'),
  issueUrl: z.string().optional().describe('GitHub Issue URL (optional, for updating metadata)'),
  chain: z.enum(['aptos', 'ethereum']).default('ethereum').describe('Target blockchain (ethereum=Sepolia testnet, aptos=Aptos testnet)')
});

export async function confirmBounty(
  args: z.infer<typeof ConfirmBountySchema>,
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

    // 2. Validate bounty status (must be Submitted)
    const bounty = await bountyOperator.getBounty({ bountyId: args.bountyId });
    if (bounty.status !== BountyStatus.Submitted) {
      throw new Error(
        `Bounty status validation failed: expected Submitted, got ${bounty.status}`
      );
    }

    // 3. Confirm bounty on-chain
    const confirmedAt = Math.floor(Date.now() / 1000);
    const confirmResult = await bountyOperator.confirmBounty({
      bountyId: args.bountyId,
      confirmedAt
    });

    // 4. Update Issue metadata if issueUrl provided
    if (args.issueUrl) {
      const [owner, repo] = args.issueUrl.match(/github\.com\/([^/]+\/[^/]+)/)![1].split('/');
      const dataOperator = new SpecKitDataOperator({
        githubToken: config.githubToken,
        repo: `${owner}/${repo}`,
        localSpecsDir: config.localSpecsDir
      });

      const metadata = await dataOperator.getTaskMetadata({ taskUrl: args.issueUrl });
      await dataOperator.updateTaskMetadata({
        taskUrl: args.issueUrl,
        metadata: {
          bounty: {
            ...metadata.bounty,
            confirmedAt: confirmResult.confirmedAt
          }
        }
      });
    }

    // 5. Return result
    let message = `✅ Bounty confirmed successfully!\n\n- Bounty ID: ${args.bountyId}\n- Tx Hash: ${confirmResult.txHash}\n- Confirmed At: ${new Date(confirmResult.confirmedAt * 1000).toISOString()}\n- Chain: ${args.chain} (${chainConfig.network})`;

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
1. Validates bounty status on-chain (must be Submitted)
2. Confirms bounty on-chain (transitions Submitted → Confirmed)
3. Optionally updates GitHub Issue metadata with confirmedAt timestamp
4. Returns tx hash and confirmation timestamp

State validation:
- Bounty must be in Submitted status

Role: Executed by User to confirm Worker's submission`,
  inputSchema: {
    type: 'object',
    properties: {
      bountyId: {
        type: 'string',
        description: 'Bounty ID (from accept-bounty or publish-bounty output)'
      },
      issueUrl: {
        type: 'string',
        description: 'GitHub Issue URL (optional, for updating metadata)'
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

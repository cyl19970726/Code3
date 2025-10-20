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
import type { BountyOperator } from '@code3-team/bounty-operator';
import { ConcreteTask3Operator } from '@code3-team/orchestration';
import { Network } from '@aptos-labs/ts-sdk';
import { getEthereumConfig, getAptosConfig } from '../chain-config.js';

const ConfirmBountySchema = z.object({
  issueUrl: z.string().describe('GitHub Issue URL'),
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
    // 1. Create operators
    const dataOperator = new SpecKitDataOperator({
      githubToken: config.githubToken,
      repo: config.repo,
      localSpecsDir: config.localSpecsDir
    });

    // 2. Create BountyOperator based on chain
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

    // 3. Create Task3Operator instance and call confirmFlow
    const task3Operator = new ConcreteTask3Operator();
    const result = await task3Operator.confirmFlow({
      dataOperator,
      bountyOperator,
      taskUrl: args.issueUrl
    });

    // 4. Return result
    let message = `✅ Bounty confirmed successfully!\n\n- Tx Hash: ${result.txHash}\n- Confirmed At: ${new Date(result.confirmedAt * 1000).toISOString()}\n- Chain: ${args.chain} (${chainConfig.network})`;


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
3. Starts cooling period (if applicable on the chain)
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
      chain: {
        type: 'string',
        enum: ['aptos', 'ethereum'],
        default: 'ethereum',
        description: 'Target blockchain (ethereum=Sepolia testnet, aptos=Aptos testnet)'
      }
    },
    required: ['issueUrl', 'chain']
  }
};

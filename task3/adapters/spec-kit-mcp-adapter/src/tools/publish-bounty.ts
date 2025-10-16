/**
 * MCP Tool: publish-bounty (发布 Bounty)
 *
 * Functionality:
 * 1. Read local specs/00x/spec.md file
 * 2. Upload to GitHub Issue
 * 3. Create on-chain Bounty (Aptos or Ethereum)
 * 4. Update Issue metadata (record bounty_id)
 *
 * Idempotency:
 * - If Bounty already exists (via taskHash), return existing Bounty info
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SpecKitDataOperator } from '../data-operator.js';
import { AptosBountyOperator } from '@code3-team/bounty-operator-aptos';
import { EthereumBountyOperator } from '@code3-team/bounty-operator-ethereum';
import type { BountyOperator } from '@code3-team/bounty-operator';
import { ConcreteTask3Operator } from '@code3-team/orchestration';
import { Network } from '@aptos-labs/ts-sdk';
import fs from 'fs/promises';

const PublishBountySchema = z.object({
  specPath: z.string().describe('Local spec.md file path (e.g., "specs/001/spec.md")'),
  repo: z.string().describe('GitHub repository (format: "owner/repo")'),
  amount: z.string().describe('Bounty amount (e.g., "100000000" for 1 APT, or "10000000000000000" for 0.01 ETH)'),
  asset: z.string().describe('Asset symbol (e.g., "APT", "ETH")'),
  chain: z.enum(['aptos', 'ethereum']).default('aptos').describe('Target blockchain'),
  moduleAddress: z.string().describe('Contract address (Aptos: module address, Ethereum: contract address)')
});

export async function publishBounty(
  args: z.infer<typeof PublishBountySchema>,
  config: {
    githubToken: string;
    aptosPrivateKey?: string;
    ethereumPrivateKey?: string;
    ethereumRpcUrl?: string;
    localSpecsDir: string;
  }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // 1. Read local spec.md file
    const specContent = await fs.readFile(args.specPath, 'utf-8');

    // 2. Create operators
    const dataOperator = new SpecKitDataOperator({
      githubToken: config.githubToken,
      repo: args.repo,
      localSpecsDir: config.localSpecsDir
    });

    // 3. Create BountyOperator based on chain
    let bountyOperator: BountyOperator;
    let network: string;

    if (args.chain === 'ethereum') {
      if (!config.ethereumPrivateKey) {
        throw new Error('ETHEREUM_PRIVATE_KEY is required for Ethereum chain');
      }
      if (!config.ethereumRpcUrl) {
        throw new Error('ETHEREUM_RPC_URL is required for Ethereum chain');
      }

      bountyOperator = new EthereumBountyOperator({
        rpcUrl: config.ethereumRpcUrl,
        privateKey: config.ethereumPrivateKey,
        contractAddress: args.moduleAddress
      });
      network = 'sepolia'; // Default to Sepolia testnet
    } else {
      // Aptos
      if (!config.aptosPrivateKey) {
        throw new Error('APTOS_PRIVATE_KEY is required for Aptos chain');
      }

      bountyOperator = new AptosBountyOperator({
        privateKey: config.aptosPrivateKey,
        network: Network.TESTNET,
        moduleAddress: args.moduleAddress
      });
      network = 'testnet';
    }

    // 4. Create Task3Operator instance and call publishFlow
    const task3Operator = new ConcreteTask3Operator();
    const result = await task3Operator.publishFlow({
      dataOperator,
      bountyOperator,
      taskData: { content: specContent },
      metadata: {
        schema: 'code3/v2' as const,
        taskId: '', // Will be set after upload
        taskHash: '', // Will be calculated by publishFlow
        chain: {
          name: args.chain,
          network,
          bountyId: '', // Will be set after creation
          contractAddress: args.moduleAddress
        },
        workflow: {
          name: 'spec-kit',
          version: '1.0.0',
          adapter: 'spec-kit-mcp-adapter'
        },
        bounty: {
          asset: args.asset,
          amount: args.amount,
          confirmedAt: null,
          coolingUntil: null
        },
        dataLayer: {
          type: 'github',
          url: '' // Will be set after upload
        }
      },
      amount: args.amount,
      asset: args.asset
    });

    // 5. Return result
    const message = result.isNew
      ? `✅ Bounty published successfully on ${args.chain}!\n\n- Issue: ${result.taskUrl}\n- Bounty ID: ${result.bountyId}\n- Tx Hash: ${result.txHash}\n- Chain: ${args.chain} (${network})`
      : `✅ Bounty already exists (idempotent)!\n\n- Issue: ${result.taskUrl}\n- Bounty ID: ${result.bountyId}\n- Chain: ${args.chain} (${network})\n- Status: Already published`;

    return {
      content: [{ type: 'text', text: message }]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to publish bounty: ${error.message}\n\nStack: ${error.stack}`
        }
      ]
    };
  }
}

export const publishBountyTool: Tool = {
  name: 'publish-bounty',
  description: `Publish a spec-kit bounty to GitHub Issue and blockchain (Aptos or Ethereum).

This tool:
1. Uploads spec.md to GitHub Issue
2. Creates on-chain bounty
3. Updates Issue with bounty_id
4. Returns Issue URL and bounty ID

Idempotency: If bounty already exists (same taskHash), returns existing bounty info.

Supported chains:
- aptos: Aptos testnet
- ethereum: Ethereum Sepolia testnet`,
  inputSchema: {
    type: 'object',
    properties: {
      specPath: {
        type: 'string',
        description: 'Local spec.md file path (e.g., "specs/001/spec.md")'
      },
      repo: {
        type: 'string',
        description: 'GitHub repository (format: "owner/repo")'
      },
      amount: {
        type: 'string',
        description: 'Bounty amount in smallest unit (e.g., "100000000" for 1 APT, "10000000000000000" for 0.01 ETH)'
      },
      asset: {
        type: 'string',
        description: 'Asset symbol (e.g., "APT" for Aptos, "ETH" for Ethereum)'
      },
      chain: {
        type: 'string',
        enum: ['aptos', 'ethereum'],
        default: 'aptos',
        description: 'Target blockchain (aptos=Aptos testnet, ethereum=Ethereum Sepolia)'
      },
      moduleAddress: {
        type: 'string',
        description: 'Contract address (Aptos: module address like 0x123, Ethereum: contract address like 0xc18C3F54778D2B1527c1081Ed15F030170C42B82)'
      }
    },
    required: ['specPath', 'repo', 'amount', 'asset', 'moduleAddress']
  }
};

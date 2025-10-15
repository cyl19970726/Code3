/**
 * MCP Tool: publish-bounty (发布 Bounty)
 *
 * Functionality:
 * 1. Read local specs/00x/spec.md file
 * 2. Upload to GitHub Issue
 * 3. Create on-chain Bounty
 * 4. Update Issue metadata (record bounty_id)
 *
 * Idempotency:
 * - If Bounty already exists (via taskHash), return existing Bounty info
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SpecKitDataOperator } from '../data-operator.js';
import { AptosBountyOperator } from '@code3-team/bounty-operator-aptos';
import { ConcreteTask3Operator } from '@code3-team/orchestration';
import { Network } from '@aptos-labs/ts-sdk';
import fs from 'fs/promises';

const PublishBountySchema = z.object({
  specPath: z.string().describe('Local spec.md file path (e.g., "specs/001/spec.md")'),
  repo: z.string().describe('GitHub repository (format: "owner/repo")'),
  amount: z.string().describe('Bounty amount (e.g., "100000000" for 1 APT or 1 ETH in wei)'),
  asset: z.string().describe('Asset symbol (e.g., "APT", "ETH")'),
  chain: z.enum(['aptos', 'ethereum']).default('aptos').describe('Target blockchain'),
  moduleAddress: z.string().describe('Module address for bounty contract')
});

export async function publishBounty(
  args: z.infer<typeof PublishBountySchema>,
  config: {
    githubToken: string;
    aptosPrivateKey: string;
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

    const bountyOperator = new AptosBountyOperator({
      privateKey: config.aptosPrivateKey,
      network: Network.TESTNET,
      moduleAddress: args.moduleAddress
    });

    // 3. Create Task3Operator instance and call publishFlow
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
          network: 'testnet',
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

    // 4. Return result
    const message = result.isNew
      ? `✅ Bounty published successfully!\n\n- Issue: ${result.taskUrl}\n- Bounty ID: ${result.bountyId}\n- Tx Hash: ${result.txHash}`
      : `✅ Bounty already exists (idempotent)!\n\n- Issue: ${result.taskUrl}\n- Bounty ID: ${result.bountyId}\n- Status: Already published`;

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
  description: `Publish a spec-kit bounty to GitHub Issue and blockchain.

This tool:
1. Uploads spec.md to GitHub Issue
2. Creates on-chain bounty
3. Updates Issue with bounty_id
4. Returns Issue URL and bounty ID

Idempotency: If bounty already exists (same taskHash), returns existing bounty info.`,
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
        description: 'Bounty amount (e.g., "100000000" for 1 APT)'
      },
      asset: {
        type: 'string',
        description: 'Asset symbol (e.g., "APT")'
      },
      chain: {
        type: 'string',
        enum: ['aptos', 'ethereum'],
        default: 'aptos',
        description: 'Target blockchain'
      },
      moduleAddress: {
        type: 'string',
        description: 'Module address for bounty contract'
      }
    },
    required: ['specPath', 'repo', 'amount', 'asset', 'moduleAddress']
  }
};

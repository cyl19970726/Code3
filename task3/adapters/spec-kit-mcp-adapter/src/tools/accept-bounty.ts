/**
 * MCP Tool: accept-bounty (接单)
 *
 * Functionality:
 * 1. Download spec.md from GitHub Issue to local
 * 2. Accept bounty on-chain (Worker accepts the task)
 * 3. Return local path and bountyId
 *
 * State validation:
 * - Bounty status must be Open
 *
 * Role: Worker (accepts and starts working on the task)
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

const AcceptBountySchema = z.object({
  issueUrl: z.string().describe('GitHub Issue URL'),
  chain: z.enum(['aptos', 'ethereum']).default('ethereum').describe('Target blockchain (ethereum=Sepolia testnet, aptos=Aptos testnet)')
});

export async function acceptBounty(
  args: z.infer<typeof AcceptBountySchema>,
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

    // 3. Create Task3Operator instance and call acceptFlow
    const task3Operator = new ConcreteTask3Operator();
    const result = await task3Operator.acceptFlow({
      dataOperator,
      bountyOperator,
      taskUrl: args.issueUrl
    });

    // 4. Get metadata to extract repository information
    const metadata = await dataOperator.getTaskMetadata({ taskUrl: args.issueUrl });
    const { repository } = metadata;

    // 5. Generate Worker branch name
    const workerBranchName = `worker-bounty-${result.bountyId}`;

    // 6. Generate repository instructions
    let repoInstructions = '';
    if (repository) {
      const repoName = repository.url.split('/').pop()?.replace('.git', '') || 'repo';

      repoInstructions = `

📦 Repository Setup Instructions:

\`\`\`bash
# Clone the repository with source branch
git clone ${repository.url} --branch ${repository.sourceBranch}
cd ${repoName}

# Create your worker branch
git checkout -b ${workerBranchName}

# Read the spec file
cat ${repository.specPath}
\`\`\`

📁 Source branch: ${repository.sourceBranch}
📄 Spec file: ${repository.specPath}

💡 Next steps:
   1. Read and understand the spec at ${repository.specPath}
   2. Implement the feature on branch: ${workerBranchName}
   3. Commit and push your changes:
      \`git push origin ${workerBranchName}\`
   4. Submit your work:
      \`submit-bounty --issueUrl ${args.issueUrl} --branchName ${workerBranchName}\`
`;
    } else {
      repoInstructions = `

⚠️  Repository metadata not available.
   Please check the GitHub Issue for spec details: ${args.issueUrl}
`;
    }

    // 7. Return result
    const message = `✅ Bounty accepted successfully!

- Bounty ID: ${result.bountyId}
- Tx Hash: ${result.txHash}
- Chain: ${args.chain} (${chainConfig.network})
${repoInstructions}`;

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
  description: `Accept a spec-kit bounty from GitHub Issue (Worker role).

This tool:
1. Downloads spec.md from Issue to local directory
2. Accepts the bounty on-chain (Worker accepts the task)
3. Returns local path and bounty ID

State validation: Bounty must be in Open status.

Role: Executed by Worker to accept and start working on the task`,
  inputSchema: {
    type: 'object',
    properties: {
      issueUrl: {
        type: 'string',
        description: 'GitHub Issue URL (e.g., "https://github.com/owner/repo/issues/123")'
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

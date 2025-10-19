#!/usr/bin/env node
/**
 * spec-kit-mcp-adapter MCP Server
 *
 * Exposes 6 tools:
 * - guide: Get started guide for Users and Workers
 * - publish-bounty: Publish a bounty to GitHub Issue and blockchain
 * - accept-bounty: Accept a bounty and download spec.md
 * - submit-bounty: Submit work via PR
 * - confirm-bounty: Confirm submitted work (Sponsor confirms Worker's submission)
 * - claim-bounty: Claim payout after cooling period
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { guide, guideTool } from './tools/guide.js';
import { publishBounty, publishBountyTool } from './tools/publish-bounty.js';
import { acceptBounty, acceptBountyTool } from './tools/accept-bounty.js';
import { submitBounty, submitBountyTool } from './tools/submit-bounty.js';
import { confirmBounty, confirmBountyTool } from './tools/confirm-bounty.js';
import { claimBounty, claimBountyTool } from './tools/claim-bounty.js';

// 1. Read configuration from environment variables
const config = {
  githubToken: process.env.GITHUB_TOKEN,
  aptosPrivateKey: process.env.APTOS_PRIVATE_KEY,
  aptosModuleAddress: process.env.APTOS_MODULE_ADDRESS,
  ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY,
  ethereumRpcUrl: process.env.ETHEREUM_RPC_URL,
  ethereumContractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS,
  localSpecsDir: process.env.LOCAL_SPECS_DIR || './specs',
  repo: process.env.GITHUB_REPO || ''
};

// Validate required environment variables
if (!config.githubToken) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

// Note: Either APTOS_PRIVATE_KEY or ETHEREUM_PRIVATE_KEY must be set (depending on which chain you use)
// We don't enforce both, as users may only use one chain

if (!config.repo) {
  console.error('Error: GITHUB_REPO environment variable is required (format: "owner/repo")');
  process.exit(1);
}

// 2. Create MCP Server
const server = new Server(
  {
    name: 'spec-kit-mcp-adapter',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// 3. Register ListToolsRequest handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      guideTool,
      publishBountyTool,
      acceptBountyTool,
      submitBountyTool,
      confirmBountyTool,
      claimBountyTool
    ]
  };
});

// 4. Register CallToolRequest handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'guide':
        return await guide(request.params.arguments as any);

      case 'publish-bounty':
        return await publishBounty(request.params.arguments as any, config as any);

      case 'accept-bounty':
        return await acceptBounty(request.params.arguments as any, {
          ...config as any,
          repo: config.repo
        });

      case 'submit-bounty':
        return await submitBounty(request.params.arguments as any, {
          ...config as any,
          repo: config.repo
        });

      case 'confirm-bounty':
        return await confirmBounty(request.params.arguments as any, {
          ...config as any,
          repo: config.repo
        });

      case 'claim-bounty':
        return await claimBounty(request.params.arguments as any, {
          ...config as any,
          repo: config.repo
        });

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
    }
  } catch (error: any) {
    console.error(`Error executing tool ${request.params.name}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error.message}`
    );
  }
});

// 5. Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('spec-kit-mcp-adapter server running on stdio');
  console.error('Configuration:');
  console.error(`  - GitHub Repo: ${config.repo}`);
  console.error(`  - Local Specs Dir: ${config.localSpecsDir}`);
  console.error(`  - GitHub Token: ${config.githubToken ? '***' : 'NOT SET'}`);
  console.error(`  - Aptos Private Key: ${config.aptosPrivateKey ? '***' : 'NOT SET'}`);
  console.error(`  - Aptos Module Address: ${config.aptosModuleAddress || 'NOT SET'}`);
  console.error(`  - Ethereum Private Key: ${config.ethereumPrivateKey ? '***' : 'NOT SET'}`);
  console.error(`  - Ethereum RPC URL: ${config.ethereumRpcUrl || 'NOT SET'}`);
  console.error(`  - Ethereum Contract Address: ${config.ethereumContractAddress || 'NOT SET'}`);
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

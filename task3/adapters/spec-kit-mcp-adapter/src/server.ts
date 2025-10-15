#!/usr/bin/env node
/**
 * spec-kit-mcp-adapter MCP Server
 *
 * Exposes 4 Bounty flow tools:
 * - publish-bounty: Publish a bounty to GitHub Issue and blockchain
 * - accept-bounty: Accept a bounty and download spec.md
 * - submit-bounty: Submit work via PR
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
import { publishBounty, publishBountyTool } from './tools/publish-bounty.js';
import { acceptBounty, acceptBountyTool } from './tools/accept-bounty.js';
import { submitBounty, submitBountyTool } from './tools/submit-bounty.js';
import { claimBounty, claimBountyTool } from './tools/claim-bounty.js';

// 1. Read configuration from environment variables
const config = {
  githubToken: process.env.GITHUB_TOKEN,
  aptosPrivateKey: process.env.APTOS_PRIVATE_KEY,
  localSpecsDir: process.env.LOCAL_SPECS_DIR || './specs',
  repo: process.env.GITHUB_REPO || ''
};

// Validate required environment variables
if (!config.githubToken) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

if (!config.aptosPrivateKey) {
  console.error('Error: APTOS_PRIVATE_KEY environment variable is required');
  process.exit(1);
}

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
      publishBountyTool,
      acceptBountyTool,
      submitBountyTool,
      claimBountyTool
    ]
  };
});

// 4. Register CallToolRequest handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
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
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

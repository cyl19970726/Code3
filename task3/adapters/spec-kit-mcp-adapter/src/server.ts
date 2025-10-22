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
// Only user-specific configurations (credentials and repo)
const config = {
  githubToken: process.env.GITHUB_TOKEN,
  aptosPrivateKey: process.env.APTOS_PRIVATE_KEY,
  ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY,
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY,
  localSpecsDir: process.env.LOCAL_SPECS_DIR || './specs',
  defaultRepo: process.env.GITHUB_REPO || '' // Optional: default repo for all operations
};

// System-level configurations (RPC URLs, contract addresses) are in chain-config.ts
// Users don't need to configure these

// Validate required environment variables
if (!config.githubToken) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

// Note: Either APTOS_PRIVATE_KEY or ETHEREUM_PRIVATE_KEY must be set (depending on which chain you use)
// We don't enforce both, as users may only use one chain

// Note: GITHUB_REPO is optional - can be specified per-tool-call via 'repo' parameter
// If not set in env and not provided in tool call, tool will error with helpful message

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
    const args = request.params.arguments as any;

    // Helper: Get repo (from args or default config)
    const getRepo = () => {
      const repo = args.repo || config.defaultRepo;
      if (!repo) {
        throw new Error(
          'Repository not specified. Either:\n' +
          '1. Set GITHUB_REPO environment variable, OR\n' +
          '2. Pass "repo" parameter (format: "owner/repo") in tool call'
        );
      }
      return repo;
    };

    switch (request.params.name) {
      case 'guide':
        return await guide(args);

      case 'publish-bounty':
        return await publishBounty(args, config as any);

      case 'accept-bounty':
        return await acceptBounty(args, {
          ...config as any,
          repo: getRepo()
        });

      case 'submit-bounty':
        return await submitBounty(args, {
          ...config as any,
          repo: getRepo()
        });

      case 'confirm-bounty':
        return await confirmBounty(args, {
          ...config as any,
          repo: getRepo()
        });

      case 'claim-bounty':
        return await claimBounty(args, {
          ...config as any,
          repo: getRepo()
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
  console.error('\nUser Configuration:');
  console.error(`  - GitHub Repo (default): ${config.defaultRepo || 'NOT SET (will require per-call)'}`);
  console.error(`  - Local Specs Dir: ${config.localSpecsDir}`);
  console.error(`  - GitHub Token: ${config.githubToken ? '***' : 'NOT SET'}`);
  console.error(`  - Aptos Private Key: ${config.aptosPrivateKey ? '***' : 'NOT SET'}`);
  console.error(`  - Ethereum Private Key: ${config.ethereumPrivateKey ? '***' : 'NOT SET'}`);
  console.error(`  - Solana Private Key: ${config.solanaPrivateKey ? '***' : 'NOT SET'}`);
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

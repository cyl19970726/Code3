/// MCP Server for Aptos Chain Tools

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.js";
import { AptosClient } from "./aptos/client.js";
import { AptosChainError, ErrorCode } from "./utils/errors.js";

// Import all tool implementations
// Write operations
import { createBountyTool, createBountyToolMetadata } from "./tools/create-bounty.js";
import { acceptBountyTool, acceptBountyToolMetadata } from "./tools/accept-bounty.js";
import { submitPRTool, submitPRToolMetadata } from "./tools/submit-pr.js";
import { markMergedTool, markMergedToolMetadata } from "./tools/mark-merged.js";
import { claimPayoutTool, claimPayoutToolMetadata } from "./tools/claim-payout.js";
import { cancelBountyTool, cancelBountyToolMetadata } from "./tools/cancel-bounty.js";

// Read operations
import { getBountyTool, getBountyToolMetadata } from "./tools/get-bounty.js";
import {
  getBountyByIssueHashTool,
  getBountyByIssueHashToolMetadata,
} from "./tools/get-bounty-by-issue-hash.js";
import { listBountiesTool, listBountiesToolMetadata } from "./tools/list-bounties.js";
import {
  getBountiesBySponsorTool,
  getBountiesBySponsorToolMetadata,
} from "./tools/get-bounties-by-sponsor.js";
import {
  getBountiesByWinnerTool,
  getBountiesByWinnerToolMetadata,
} from "./tools/get-bounties-by-winner.js";

/**
 * Aptos Chain MCP Server
 */
export class AptosChainMCPServer {
  private server: Server;
  private client: AptosClient;

  constructor() {
    // Load configuration
    const config = loadConfig();

    // Initialize Aptos client
    this.client = new AptosClient(config);

    // Initialize MCP server
    this.server = new Server(
      {
        name: "@code3/aptos-chain-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Write operations (6)
        createBountyToolMetadata,
        acceptBountyToolMetadata,
        submitPRToolMetadata,
        markMergedToolMetadata,
        claimPayoutToolMetadata,
        cancelBountyToolMetadata,
        // Read operations (5)
        getBountyToolMetadata,
        getBountyByIssueHashToolMetadata,
        listBountiesToolMetadata,
        getBountiesBySponsorToolMetadata,
        getBountiesByWinnerToolMetadata,
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        console.log(`[MCP Server] Tool called: ${name}`);

        // Ensure args is defined
        const toolArgs = args || {};

        let result: any;

        switch (name) {
          // Write operations
          case "create_bounty":
            result = await createBountyTool(this.client, toolArgs as any);
            break;

          case "accept_bounty":
            result = await acceptBountyTool(this.client, toolArgs as any);
            break;

          case "submit_pr":
            result = await submitPRTool(this.client, toolArgs as any);
            break;

          case "mark_merged":
            result = await markMergedTool(this.client, toolArgs as any);
            break;

          case "claim_payout":
            result = await claimPayoutTool(this.client, toolArgs as any);
            break;

          case "cancel_bounty":
            result = await cancelBountyTool(this.client, toolArgs as any);
            break;

          // Read operations
          case "get_bounty":
            result = await getBountyTool(this.client, toolArgs as any);
            break;

          case "get_bounty_by_issue_hash":
            result = await getBountyByIssueHashTool(this.client, toolArgs as any);
            break;

          case "list_bounties":
            result = await listBountiesTool(this.client, toolArgs as any);
            break;

          case "get_bounties_by_sponsor":
            result = await getBountiesBySponsorTool(this.client, toolArgs as any);
            break;

          case "get_bounties_by_winner":
            result = await getBountiesByWinnerTool(this.client, toolArgs as any);
            break;

          default:
            throw new AptosChainError(
              ErrorCode.INVALID_INPUT,
              `Unknown tool: ${name}`,
              { name }
            );
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`[MCP Server] Tool error:`, error);

        // Format error response
        if (error instanceof AptosChainError) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: error.toJSON(),
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        // Generic error
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: {
                    code: ErrorCode.UNKNOWN_ERROR,
                    message: error instanceof Error ? error.message : String(error),
                  },
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error("[MCP Server] Aptos Chain MCP Server started");
    console.error(`[MCP Server] Network: ${this.client.getNetwork()}`);
    console.error(`[MCP Server] Contract: ${this.client.getContractAddress()}`);
    console.error(
      `[MCP Server] Account: ${this.client.getAccountAddress() || "Read-only mode"}`
    );
  }
}

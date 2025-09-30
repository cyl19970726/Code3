#!/usr/bin/env node

/**
 * Code3 Spec-MCP Client-Remote Server
 *
 * MCP server providing remote spec publishing and bounty creation tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { specify } from './tools/specify.js';
import { publishIssueWithMetadata } from './tools/publish.js';
import { remotePlan } from './tools/remote_plan.js';
import { remoteTasks } from './tools/remote_tasks.js';
import type {
  SpecifyInput,
  PublishIssueInput,
  RemotePlanInput,
  RemoteTasksInput,
} from './types/contracts.js';

/**
 * Tool definitions
 */
const TOOLS: Tool[] = [
  {
    name: 'spec_mcp_specify',
    description: 'Create a new feature specification (spec.md) locally (remote variant for convenience)',
    inputSchema: {
      type: 'object',
      properties: {
        feature_description: {
          type: 'string',
          description: 'Description of the feature to create',
        },
        feature_id: {
          type: ['string', 'null'],
          description: 'Optional feature ID (e.g., "003-my-feature"). If not provided, auto-generated.',
        },
        allow_overwrite: {
          type: 'boolean',
          description: 'Allow overwriting existing feature',
          default: false,
        },
        workspace_root: {
          type: 'string',
          description: 'Optional workspace root path (defaults to current directory)',
        },
      },
      required: ['feature_description'],
    },
  },
  {
    name: 'spec_mcp_publish_issue_with_metadata',
    description: 'Publish feature spec as GitHub Issue with code3/v1 metadata and create Aptos bounty',
    inputSchema: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'Repository in format "owner/repo"',
        },
        feature_id: {
          type: 'string',
          description: 'Feature ID (e.g., "003-web-ai-agent")',
        },
        spec_path: {
          type: 'string',
          description: 'Path to spec.md file',
        },
        amount: {
          type: 'string',
          description: 'Bounty amount in smallest unit (e.g., "1000000" for 1 USDT)',
        },
        asset: {
          type: 'string',
          description: 'Asset type (currently only "USDT" supported)',
          enum: ['USDT'],
        },
        network: {
          type: 'string',
          description: 'Aptos network',
          enum: ['testnet', 'mainnet'],
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'GitHub labels (defaults to ["code3", "open"])',
        },
        assignees: {
          type: 'array',
          items: { type: 'string' },
          description: 'GitHub assignees',
        },
      },
      required: ['repo', 'feature_id', 'spec_path', 'amount', 'asset', 'network'],
    },
  },
  {
    name: 'spec_mcp_remote_plan',
    description: 'Generate plan artifacts remotely and optionally post to Issue',
    inputSchema: {
      type: 'object',
      properties: {
        issue_url: {
          type: 'string',
          description: 'GitHub Issue URL',
        },
        feature_id: {
          type: 'string',
          description: 'Feature ID',
        },
      },
      required: ['issue_url', 'feature_id'],
    },
  },
  {
    name: 'spec_mcp_remote_tasks',
    description: 'Generate tasks.md remotely and optionally post to Issue',
    inputSchema: {
      type: 'object',
      properties: {
        issue_url: {
          type: 'string',
          description: 'GitHub Issue URL',
        },
        feature_id: {
          type: 'string',
          description: 'Feature ID',
        },
      },
      required: ['issue_url', 'feature_id'],
    },
  },
];

/**
 * Create and configure MCP server
 */
async function main() {
  const server = new Server(
    {
      name: 'code3-spec-mcp-client-remote',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'spec_mcp_specify': {
          const input = args as unknown as SpecifyInput & { workspace_root?: string };
          const result = await specify(
            {
              feature_description: input.feature_description,
              feature_id: input.feature_id,
              allow_overwrite: input.allow_overwrite,
            },
            input.workspace_root
          );
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'spec_mcp_publish_issue_with_metadata': {
          const input = args as unknown as PublishIssueInput;
          const result = await publishIssueWithMetadata(input);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'spec_mcp_remote_plan': {
          const input = args as unknown as RemotePlanInput;
          const result = await remotePlan(input);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'spec_mcp_remote_tasks': {
          const input = args as unknown as RemoteTasksInput;
          const result = await remoteTasks(input);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: {
                  code: 'E_INTERNAL',
                  message: (error as Error).message,
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

  // Connect transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Code3 Spec-MCP Client-Remote server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * Code3 Spec-MCP Client-Local Server
 *
 * MCP server providing local spec/plan/tasks generation tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { specify } from './tools/specify.js';
import { plan } from './tools/plan.js';
import { tasks } from './tools/tasks.js';
import type { SpecifyInput, PlanInput, TasksInput } from './types/contracts.js';

/**
 * Tool definitions
 */
const TOOLS: Tool[] = [
  {
    name: 'spec_mcp_specify',
    description: 'Create a new feature specification (spec.md) following spec-kit conventions',
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
    name: 'spec_mcp_plan',
    description: 'Create plan artifacts (plan.md, research.md, data-model.md, contracts/, quickstart.md)',
    inputSchema: {
      type: 'object',
      properties: {
        feature_id: {
          type: 'string',
          description: 'Feature ID (e.g., "003-my-feature")',
        },
        tech_constraints: {
          type: ['string', 'null'],
          description: 'Optional technical constraints or requirements',
        },
        allow_overwrite: {
          type: 'boolean',
          description: 'Allow overwriting existing artifacts',
          default: false,
        },
        workspace_root: {
          type: 'string',
          description: 'Optional workspace root path (defaults to current directory)',
        },
      },
      required: ['feature_id'],
    },
  },
  {
    name: 'spec_mcp_tasks',
    description: 'Create tasks.md with TDD ordering and parallel/dependency annotations',
    inputSchema: {
      type: 'object',
      properties: {
        feature_id: {
          type: 'string',
          description: 'Feature ID (e.g., "003-my-feature")',
        },
        allow_overwrite: {
          type: 'boolean',
          description: 'Allow overwriting existing tasks.md',
          default: false,
        },
        workspace_root: {
          type: 'string',
          description: 'Optional workspace root path (defaults to current directory)',
        },
      },
      required: ['feature_id'],
    },
  },
];

/**
 * Create and configure MCP server
 */
async function main() {
  const server = new Server(
    {
      name: 'code3-spec-mcp-client-local',
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

        case 'spec_mcp_plan': {
          const input = args as unknown as PlanInput & { workspace_root?: string };
          const result = await plan(
            {
              feature_id: input.feature_id,
              tech_constraints: input.tech_constraints,
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

        case 'spec_mcp_tasks': {
          const input = args as unknown as TasksInput & { workspace_root?: string };
          const result = await tasks(
            {
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

  console.error('Code3 Spec-MCP Client-Local server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
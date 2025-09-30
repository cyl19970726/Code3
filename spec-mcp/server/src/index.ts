#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { registerTools, handleToolCall, ToolContext } from './tools.js';

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  let projectPath = process.cwd();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--project' && args[i + 1]) {
      projectPath = resolve(args[i + 1]);
      i++;
    } else if (a.startsWith('--project=')) {
      projectPath = resolve(a.split('=')[1]);
    }
  }
  return { projectPath };
}

async function main() {
  const { projectPath } = parseArgs(process.argv);
  const server = new Server({ name: 'code3-spec-mcp', version: '0.1.0' }, {
    capabilities: {
      tools: registerTools().reduce<Record<string, {}>>((acc, t: Tool) => { acc[t.name] = {}; return acc; }, {})
    }
  });

  const context: ToolContext = {
    projectPath,
    env: process.env
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: registerTools() }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    return handleToolCall(req.params.name, req.params.arguments || {}, context);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});


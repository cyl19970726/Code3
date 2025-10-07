#!/usr/bin/env node
/**
 * spec-kit-mcp MCP Server
 * Pure MCP + LLM Architecture
 * 注册 Prompts（引导 LLM）+ Tools（文件操作）
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ToolContext } from "./types.js";

// Import Prompts
import {
  specifyPrompt,
  clarifyPrompt,
  planPrompt,
  tasksPrompt,
  analyzePrompt,
  implementPrompt,
  constitutionPrompt,
} from "./prompts/index.js";

// Import Tools
import {
  specContextTool,
  handleSpecContext,
  planContextTool,
  handlePlanContext,
  tasksContextTool,
  handleTasksContext,
  initTool,
  handleInit,
  specKitGuideTool,
  handleSpecKitGuide,
} from "./tools/index.js";

const server = new Server(
  {
    name: "spec-kit-mcp",
    version: "0.2.0",
  },
  {
    capabilities: {
      prompts: {},
      tools: {},
    },
  }
);

// Build Tool Context
const projectPath = process.cwd();
const context: ToolContext = {
  projectPath,
  // dashboardUrl is optional (we don't have Dashboard)
};

// ========================================
// Prompts (引导 LLM 生成内容)
// ========================================

const allPrompts = [
  specifyPrompt,
  clarifyPrompt,
  planPrompt,
  tasksPrompt,
  analyzePrompt,
  implementPrompt,
  constitutionPrompt,
];

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: allPrompts.map((p) => p.prompt),
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const promptName = request.params.name;
  const promptDef = allPrompts.find((p) => p.prompt.name === promptName);

  if (!promptDef) {
    throw new Error(`Prompt not found: ${promptName}`);
  }

  const args = request.params.arguments || {};
  return {
    messages: await promptDef.handler(args, context),
  };
});

// ========================================
// Tools (文件操作、上下文读取)
// ========================================

const allTools = [
  specKitGuideTool,  // ⭐ Call this FIRST
  initTool,
  specContextTool,
  planContextTool,
  tasksContextTool,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      case "spec-kit-guide":
        result = await handleSpecKitGuide();
        break;
      case "init":
        result = await handleInit(args || {});
        break;
      case "spec-context":
        result = await handleSpecContext(args || {});
        break;
      case "plan-context":
        result = await handlePlanContext(args || {});
        break;
      case "tasks-context":
        result = await handleTasksContext(args || {});
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: error.message,
              code: error.code || "E_UNKNOWN",
              details: error.details,
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

// ========================================
// 启动 Server
// ========================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("spec-kit-mcp server running on stdio (Pure MCP + LLM)");

  // Keep process running
  process.on("SIGINT", () => {
    console.error("\n[MCP Server] Shutting down...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.error("\n[MCP Server] Shutting down...");
    process.exit(0);
  });
}

// Export server for testing
export { server, main };

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

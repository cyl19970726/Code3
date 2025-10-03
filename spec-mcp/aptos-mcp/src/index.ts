#!/usr/bin/env node

/// Entry point for Aptos Chain MCP Server

import { AptosChainMCPServer } from "./server.js";

/**
 * Main entry point
 */
async function main() {
  try {
    const server = new AptosChainMCPServer();
    await server.start();

    // Keep process running
    process.on("SIGINT", () => {
      console.error("\n[MCP Server] Shutting down...");
      process.exit(0);
    });
  } catch (error) {
    console.error("[MCP Server] Fatal error:", error);
    process.exit(1);
  }
}

main();

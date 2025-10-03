#!/usr/bin/env node
/**
 * spec-kit-mcp Entry Point
 * Direct entry for bin execution
 */
import { main } from "./server.js";

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

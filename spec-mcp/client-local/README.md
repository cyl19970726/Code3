# Code3 Spec-MCP Client-Local

Local spec/plan/tasks generation tools following spec-kit conventions.

## Overview

This package provides MCP tools for generating specification artifacts locally:

- `spec_mcp_specify`: Create a new feature specification (spec.md)
- `spec_mcp_plan`: Generate plan artifacts (plan.md, research.md, data-model.md, contracts/, quickstart.md)
- `spec_mcp_tasks`: Create tasks.md with TDD ordering and dependencies

## Installation

```bash
cd Code3/spec-mcp/client-local
pnpm install
pnpm build
```

## Usage

### As MCP Server

Add to your MCP client configuration (e.g., Claude Desktop, Codex):

```json
{
  "mcpServers": {
    "code3-spec-local": {
      "command": "node",
      "args": ["/path/to/Code3/spec-mcp/client-local/dist/index.js"]
    }
  }
}
```

### Tool Examples

#### spec_mcp_specify

Create a new feature specification:

```json
{
  "feature_description": "Web AI agent project management",
  "allow_overwrite": false
}
```

Returns:
```json
{
  "success": true,
  "feature_id": "003-web-ai-agent",
  "paths": {
    "spec": "specs/003-web-ai-agent/spec.md",
    "dir": "specs/003-web-ai-agent"
  }
}
```

#### spec_mcp_plan

Generate plan artifacts:

```json
{
  "feature_id": "003-web-ai-agent",
  "tech_constraints": "Use TypeScript and React",
  "allow_overwrite": false
}
```

Returns:
```json
{
  "success": true,
  "paths": {
    "plan": "specs/003-web-ai-agent/plan.md",
    "research": "specs/003-web-ai-agent/research.md",
    "data_model": "specs/003-web-ai-agent/data-model.md",
    "contracts": "specs/003-web-ai-agent/contracts",
    "quickstart": "specs/003-web-ai-agent/quickstart.md"
  }
}
```

#### spec_mcp_tasks

Generate tasks.md:

```json
{
  "feature_id": "003-web-ai-agent",
  "allow_overwrite": false
}
```

Returns:
```json
{
  "success": true,
  "path": "specs/003-web-ai-agent/tasks.md"
}
```

## Error Codes

- `E_NOT_FOUND`: Feature or dependency not found
- `E_EXISTS`: Target already exists (use `allow_overwrite: true`)
- `E_PRECONDITION`: Prerequisites not met
- `E_INTERNAL`: Internal error

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test
```

## Architecture

- `src/types/contracts.ts`: Type definitions and contracts
- `src/utils/feature.ts`: Feature path and numbering utilities
- `src/utils/templates.ts`: Template loading and processing
- `src/tools/`: Tool implementations (specify, plan, tasks)
- `src/templates/`: Template files from spec-kit
- `src/index.ts`: MCP server entry point

## References

- [Code3/docs/07-mcp-tools-spec.md](../../docs/07-mcp-tools-spec.md) - Tool contracts
- [Code3/docs/04-architect-spec-mcp.md](../../docs/04-architect-spec-mcp.md) - Architecture
- [spec-kit](../../../spec-kit/) - Reference implementation
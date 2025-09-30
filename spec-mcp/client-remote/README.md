# Code3 Spec-MCP Client-Remote

Remote spec publishing and bounty creation tools.

## Overview

This package provides MCP tools for publishing specifications to GitHub and creating bounties on Aptos:

- `spec_mcp_specify`: Create local spec (convenience, identical to client-local)
- `spec_mcp_publish_issue_with_metadata`: Publish spec as GitHub Issue with embedded metadata and create Aptos bounty
- `spec_mcp_remote_plan`: Generate plan artifacts remotely
- `spec_mcp_remote_tasks`: Generate tasks.md remotely

## Prerequisites

### Required MCP Servers

1. **github-mcp-server**: For GitHub API operations
   - Install: See [github-mcp-server docs](https://github.com/modelcontextprotocol/servers)
   - Configuration: Set `GITHUB_TOKEN` environment variable with repo permissions

2. **aptos-chain-mcp**: For Aptos blockchain operations
   - Install: See [Code3/docs/09-api-and-config.md](../../docs/09-api-and-config.md)
   - Configuration: Set `APTOS_API_KEY`, `APTOS_NETWORK`, optional `APTOS_PRIVATE_KEY`

## Installation

```bash
cd Code3/spec-mcp/client-remote
pnpm install
pnpm build
```

## Configuration

### MCP Client Configuration

Add to your MCP client (e.g., Claude Desktop, Codex):

```json
{
  "mcpServers": {
    "code3-spec-remote": {
      "command": "node",
      "args": ["/path/to/Code3/spec-mcp/client-remote/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "APTOS_API_KEY": "your_aptos_api_key",
        "APTOS_NETWORK": "testnet"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

## Usage

### 1. Create Spec Locally (Optional)

```json
{
  "tool": "spec_mcp_specify",
  "arguments": {
    "feature_description": "Web AI agent project management",
    "allow_overwrite": false
  }
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

### 2. Publish to GitHub + Create Bounty

```json
{
  "tool": "spec_mcp_publish_issue_with_metadata",
  "arguments": {
    "repo": "cyl19970726/Code3",
    "feature_id": "003-web-ai-agent",
    "spec_path": "specs/003-web-ai-agent/spec.md",
    "amount": "1000000",
    "asset": "USDT",
    "network": "testnet",
    "labels": ["code3", "open"]
  }
}
```

Returns:
```json
{
  "success": true,
  "issue": {
    "url": "https://github.com/cyl19970726/Code3/issues/1",
    "number": 1,
    "issue_hash": "a1b2c3d4..."
  },
  "bounty": {
    "bounty_id": "0x..."
  }
}
```

### 3. Generate Remote Plan (Optional)

```json
{
  "tool": "spec_mcp_remote_plan",
  "arguments": {
    "issue_url": "https://github.com/cyl19970726/Code3/issues/1",
    "feature_id": "003-web-ai-agent"
  }
}
```

Returns plan artifacts (plan.md, research.md, data-model.md, quickstart.md).

### 4. Generate Remote Tasks (Optional)

```json
{
  "tool": "spec_mcp_remote_tasks",
  "arguments": {
    "issue_url": "https://github.com/cyl19970726/Code3/issues/1",
    "feature_id": "003-web-ai-agent"
  }
}
```

Returns tasks.md with TDD ordering.

## Data Flow

```
Local Spec → publish_issue_with_metadata → GitHub Issue (with code3/v1 metadata)
                                         ↓
                                    Aptos Bounty Created
                                         ↓
                                    bounty_id written back to Issue
```

## Error Codes

- `E_NOT_FOUND`: Feature or spec file not found
- `E_EXISTS`: Feature already exists
- `E_GH_RATE_LIMIT`: GitHub API rate limit hit
- `E_CHAIN_TX_FAILED`: Aptos transaction failed
- `E_IDEMPOTENT_REJECTED`: Duplicate submission (same issue_hash)
- `E_INTERNAL`: Internal error

## Security

⚠️ **Important**: Never commit tokens or private keys to the repository.

- Use environment variables for all secrets
- GitHub Token requires: `repo`, `workflow` scopes
- Aptos Private Key is optional for this tool (used by server-remote for worker operations)

See [Code3/docs/12-security-and-secrets.md](../../docs/12-security-and-secrets.md) for details.

## Implementation Status

### ✅ Completed
- Project structure
- Type definitions from 14-data-model.md
- Hash utilities (canonical JSON, issue_hash calculation)
- spec_mcp_specify tool
- Tool framework and placeholders

### 🚧 In Progress
- GitHub MCP integration (requires github-mcp-server)
- Aptos MCP integration (requires aptos-chain-mcp)
- Idempotency enforcement
- Integration tests

### 📝 TODO
- Implement actual MCP client calls to github-mcp-server
- Implement actual MCP client calls to aptos-chain-mcp
- Add retry logic with exponential backoff
- Add rate limiting
- Write integration tests with mocked MCPs

## References

- [Code3/docs/07-mcp-tools-spec.md](../../docs/07-mcp-tools-spec.md) - Tool contracts
- [Code3/docs/14-data-model.md](../../docs/14-data-model.md) - Unified data model
- [Code3/docs/06-issue-metadata.md](../../docs/06-issue-metadata.md) - Issue metadata schema
- [IMPLEMENTATION_PLAN.md](../../../IMPLEMENTATION_PLAN.md) - Stage 2 (C2) details
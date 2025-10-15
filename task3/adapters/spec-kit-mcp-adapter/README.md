# spec-kit-mcp-adapter

> Bounty flow adapter for spec-kit workflow on Code3 platform

## Overview

This adapter implements the **Bounty flow** for spec-kit workflow, enabling:
- Publishing bounties to GitHub Issues and blockchain
- Accepting and working on bounties
- Submitting work via Pull Requests
- Claiming payouts after review

**Separation of Concerns**:
- This package: **Bounty lifecycle tools** (4 tools)
- [`spec-kit-mcp`](../../../workflows/spec-kit-mcp/): **Workflow tools** (7 tools: specify, analyze, plan, etc.)

---

## Architecture

### Components

```
spec-kit-mcp-adapter/
├── src/
│   ├── data-operator.ts      # SpecKitDataOperator (implements DataOperator interface)
│   ├── tools/                # 4 Bounty flow tools
│   │   ├── publish-bounty.ts # Publish bounty (spec.md → GitHub Issue → on-chain)
│   │   ├── accept-bounty.ts  # Accept bounty (on-chain → download spec.md)
│   │   ├── submit-bounty.ts  # Submit work (create PR → on-chain)
│   │   └── claim-bounty.ts   # Claim payout (verify cooling period → claim)
│   ├── server.ts             # MCP server (exposes 4 tools)
│   └── index.ts              # Package exports
├── tests/                    # Unit and E2E tests
├── package.json
├── tsconfig.json
└── .env.example              # Environment variables template
```

### Design Principles

1. **Interface Implementation**: Implements `DataOperator` interface from `@code3-team/data-operator`
2. **Dependency Injection**: Uses `ConcreteTask3Operator` for flow orchestration
3. **Chain Agnostic**: Works with Aptos, Ethereum, and other supported chains
4. **Data Layer Agnostic**: Uses `GitHubDataLayer` for GitHub operations

---

## Installation

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- GitHub Personal Access Token
- Aptos private key (or Ethereum private key)

### Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Build the package**:
   ```bash
   pnpm run build
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

---

## Configuration

Create a `.env` file with the following variables:

```bash
# GitHub Configuration
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_REPO=owner/repo

# Aptos Configuration
APTOS_PRIVATE_KEY=0x_your_aptos_private_key_here

# Local Configuration
LOCAL_SPECS_DIR=./specs
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | ✅ | GitHub Personal Access Token with `repo` scope |
| `GITHUB_REPO` | ✅ | Repository in format `owner/repo` |
| `APTOS_PRIVATE_KEY` | ✅ | Aptos account private key (0x-prefixed) |
| `LOCAL_SPECS_DIR` | ❌ | Local directory for spec.md files (default: `./specs`) |

---

## Usage

### Start MCP Server

```bash
npx spec-kit-mcp-adapter
```

Or via Claude Desktop:

```json
{
  "mcpServers": {
    "spec-kit-bounty": {
      "command": "npx",
      "args": ["spec-kit-mcp-adapter"],
      "env": {
        "GITHUB_TOKEN": "ghp_...",
        "GITHUB_REPO": "owner/repo",
        "APTOS_PRIVATE_KEY": "0x...",
        "LOCAL_SPECS_DIR": "./specs"
      }
    }
  }
}
```

### Available Tools

#### 1. publish-bounty

Publish a bounty to GitHub Issue and blockchain.

**Parameters**:
- `specPath`: Local spec.md file path (e.g., `specs/001/spec.md`)
- `repo`: GitHub repository (format: `owner/repo`)
- `amount`: Bounty amount (e.g., `100000000` for 1 APT)
- `asset`: Asset symbol (e.g., `APT`, `ETH`)
- `chain`: Target blockchain (`aptos` or `ethereum`)
- `moduleAddress`: Contract/module address

**Example**:
```typescript
{
  "specPath": "specs/001/spec.md",
  "repo": "code3-team/bounty-repo",
  "amount": "100000000",
  "asset": "APT",
  "chain": "aptos",
  "moduleAddress": "0xabc123..."
}
```

#### 2. accept-bounty

Accept a bounty and download spec.md to local.

**Parameters**:
- `issueUrl`: GitHub Issue URL
- `moduleAddress`: Contract/module address

**Example**:
```typescript
{
  "issueUrl": "https://github.com/owner/repo/issues/123",
  "moduleAddress": "0xabc123..."
}
```

#### 3. submit-bounty

Submit work via Pull Request.

**Parameters**:
- `issueUrl`: GitHub Issue URL
- `branchName`: Git branch with changes
- `summary`: PR summary (optional)
- `filesChanged`: List of changed files (optional)
- `testing`: Testing notes (optional)
- `moduleAddress`: Contract/module address

**Example**:
```typescript
{
  "issueUrl": "https://github.com/owner/repo/issues/123",
  "branchName": "feat/implement-spec-123",
  "summary": "Implemented user authentication feature",
  "moduleAddress": "0xabc123..."
}
```

#### 4. claim-bounty

Claim payout after cooling period.

**Parameters**:
- `issueUrl`: GitHub Issue URL
- `moduleAddress`: Contract/module address

**Example**:
```typescript
{
  "issueUrl": "https://github.com/owner/repo/issues/123",
  "moduleAddress": "0xabc123..."
}
```

---

## Development

### Build

```bash
pnpm run build
```

### Run Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

### Watch Mode

```bash
pnpm run dev
```

---

## Architecture Details

### SpecKitDataOperator

Implements the `DataOperator` interface with 5 methods:

1. **uploadTaskData()**: Upload spec.md to GitHub Issue with YAML frontmatter metadata
2. **downloadTaskData()**: Download Issue content to local `specs/{id}/spec.md`
3. **uploadSubmission()**: Create PR with "Closes #\<issue_number\>"
4. **getTaskMetadata()**: Extract metadata from Issue body
5. **updateTaskMetadata()**: Update Issue metadata (deep merge)

### Flow Orchestration

Uses `ConcreteTask3Operator` (from `@code3-team/orchestration`) for:
- State validation
- Idempotency checks
- Cooling period enforcement
- Transaction coordination

### Supported Chains

- ✅ Aptos (via `@code3-team/bounty-operator-aptos`)
- 🔄 Ethereum (coming soon)
- 🔄 Sui (coming soon)

---

## Related Packages

- [`@code3-team/data-operator`](../../data-operator/): DataOperator interface
- [`@code3-team/bounty-operator`](../../bounty-operator/): BountyOperator interface
- [`@code3-team/bounty-operator-aptos`](../../bounty-operator/aptos/): Aptos implementation
- [`@code3-team/orchestration`](../../orchestration/): Flow orchestration
- [`@code3-team/data-layers-github`](../../data-layers/github/): GitHub operations

---

## License

MIT

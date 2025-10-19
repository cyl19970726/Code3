# spec-kit-mcp-adapter

> Bounty flow adapter for spec-kit workflow on Code3 platform

## Overview

This adapter implements the **Bounty flow** for spec-kit workflow, enabling:
- Publishing bounties to GitHub Issues and blockchain
- Accepting and working on bounties
- Submitting work via Pull Requests
- Claiming payouts after review

**Separation of Concerns**:
- This package: **Bounty lifecycle tools** (5 tools)
- [`spec-kit-mcp`](../../../workflows/spec-kit-mcp/): **Workflow tools** (7 tools: specify, analyze, plan, etc.)

---

## Installation & Configuration

### Option 1: Quick Start with npx (Recommended)

Add to your Claude Code `.mcp.json`:

```json
{
  "mcpServers": {
    "spec-kit-adapter": {
      "command": "npx",
      "args": ["-y", "@code3-team/spec-kit-mcp-adapter"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "GITHUB_REPO": "owner/repo",
        "APTOS_PRIVATE_KEY": "0x_your_aptos_key_here",
        "APTOS_MODULE_ADDRESS": "0xafd0c08dbf36230f9b96eb1d23ff7ee223ad40be47917a0aba310ed90ac422a1",
        "ETHEREUM_RPC_URL": "https://ethereum-sepolia-rpc.publicnode.com",
        "ETHEREUM_PRIVATE_KEY": "0x_your_ethereum_key_here",
        "ETHEREUM_CONTRACT_ADDRESS": "0x28FE83352f2451c54d9050761DF1d7F8945a8fc4",
        "LOCAL_SPECS_DIR": "./specs"
      }
    }
  }
}
```

**Verify Installation**:
1. Restart Claude Code
2. Check that spec-kit-mcp-adapter prompts appear in the Prompts list
3. Check that spec-kit-mcp-adapter tools appear in the Tools list

### Option 2: Local Development

```bash
# 1. Clone repository
git clone https://github.com/code3-team/code3.git
cd code3/task3/adapters/spec-kit-mcp-adapter

# 2. Install dependencies
pnpm install

# 3. Build
pnpm run build

# 4. Link locally
pnpm link --global

# 5. Add to .mcp.json
{
  "mcpServers": {
    "spec-kit-adapter": {
      "command": "spec-kit-mcp-adapter",
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "GITHUB_REPO": "owner/repo",
        "APTOS_PRIVATE_KEY": "0x_your_aptos_key_here",
        "APTOS_MODULE_ADDRESS": "0xafd0c08...",
        "ETHEREUM_RPC_URL": "https://ethereum-sepolia-rpc.publicnode.com",
        "ETHEREUM_PRIVATE_KEY": "0x_your_ethereum_key_here",
        "ETHEREUM_CONTRACT_ADDRESS": "0x28FE83352...",
        "LOCAL_SPECS_DIR": "./specs"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | ✅ | GitHub Personal Access Token with `repo` scope |
| `GITHUB_REPO` | ✅ | Repository in format `owner/repo` |
| `APTOS_PRIVATE_KEY` | ✅ | Aptos account private key (0x-prefixed) |
| `APTOS_MODULE_ADDRESS` | ✅ | Aptos contract module address |
| `ETHEREUM_RPC_URL` | ✅ | Ethereum RPC endpoint (e.g., Sepolia testnet) |
| `ETHEREUM_PRIVATE_KEY` | ✅ | Ethereum account private key (0x-prefixed) |
| `ETHEREUM_CONTRACT_ADDRESS` | ✅ | Ethereum BountyManager contract address |
| `LOCAL_SPECS_DIR` | ❌ | Local directory for spec.md files (default: `./specs`) |

---

## Project Structure

```
spec-kit-mcp-adapter/
├── src/
│   ├── data-operator.ts      # SpecKitDataOperator (implements DataOperator interface)
│   ├── tools/                # 5 Bounty flow tools
│   │   ├── publish-bounty.ts # Publish bounty (spec.md → GitHub Issue → on-chain)
│   │   ├── accept-bounty.ts  # Accept bounty (on-chain → download spec.md)
│   │   ├── submit-bounty.ts  # Submit work (create PR → on-chain)
│   │   ├── confirm-bounty.ts # Confirm work (requester confirms submission)
│   │   └── claim-bounty.ts   # Claim payout (verify cooling period → claim)
│   ├── server.ts             # MCP server (exposes 5 tools)
│   └── index.ts              # Package exports
├── tests/                    # Unit and E2E tests
├── package.json
├── tsconfig.json
└── .env.example              # Environment variables template
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

# E2E tests (requires deployed contracts and test tokens)
pnpm test:e2e
```

### Watch Mode

```bash
pnpm run dev
```

### Start MCP Server Locally

```bash
# After build
node dist/server.js
```

---

## Available Tools

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

## License

MIT

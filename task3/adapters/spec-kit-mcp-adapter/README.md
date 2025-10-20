# spec-kit-mcp-adapter

> Bounty flow adapter for spec-kit workflow on Code3 platform

## Overview

This adapter implements the **Bounty flow** for spec-kit workflow, enabling:
- Publishing bounties to GitHub Issues and blockchain (Ethereum/Aptos)
- Accepting and working on bounties
- Submitting work via Pull Requests
- Confirming submissions (with optional cooling period)
- Claiming payouts after review

**Separation of Concerns**:
- This package: **Bounty lifecycle tools** (6 tools: guide, publish, accept, submit, confirm, claim)
- [`spec-kit-mcp`](../../../workflows/spec-kit-mcp/): **Workflow tools** (7 tools: specify, analyze, plan, etc.)

---

## Installation & Configuration

### Quick Start

Add to your Claude Code workspace `.mcp.json`:

```json
{
  "mcpServers": {
    "spec-kit-adapter": {
      "command": "node",
      "args": ["/path/to/Code3/task3/adapters/spec-kit-mcp-adapter/dist/src/server.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "GITHUB_REPO": "owner/repo",
        "ETHEREUM_PRIVATE_KEY": "0x_your_ethereum_key_here",
        "APTOS_PRIVATE_KEY": "0x_your_aptos_key_here"
      }
    }
  }
}
```

**That's it!** System configurations (RPC URLs, Contract Addresses) are managed in `src/chain-config.ts`.

### Configuration Layers

#### 1. **User Configuration** (`.mcp.json` in your workspace)

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | ✅ Yes | GitHub Personal Access Token with `repo` scope |
| `GITHUB_REPO` | ✅ Yes | Repository in format `owner/repo` |
| `ETHEREUM_PRIVATE_KEY` | ⚠️ Choose one | Ethereum account private key (for Sepolia testnet) |
| `APTOS_PRIVATE_KEY` | ⚠️ Choose one | Aptos account private key (for Aptos testnet) |
| `LOCAL_SPECS_DIR` | ❌ No | Local directory for specs (default: `./specs`) |

**Notes**:
- You need **at least one** blockchain private key (Ethereum or Aptos)
- For Ethereum: Get testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
- For Aptos: Get testnet APT from [Aptos Faucet](https://aptoslabs.com/testnet-faucet)

#### 2. **System Configuration** (`src/chain-config.ts`)

Managed by Code3 team, you **don't need to configure** these:

**Ethereum Sepolia**:
- RPC URL: `https://ethereum-sepolia-rpc.publicnode.com`
- Contract Address: `0x28FE83352f2451c54d9050761DF1d7F8945a8fc4`

**Aptos Testnet**:
- RPC URL: `https://fullnode.testnet.aptoslabs.com/v1`
- Module Address: `0x28a6173...` (auto-configured)

**Why this separation?**
- Users only configure **credentials** (tokens, keys, repo)
- System configs (RPC URLs, contract addresses) are **version-controlled** and updated by Code3 team
- Reduces configuration errors and simplifies setup

---

## Project Structure

```
spec-kit-mcp-adapter/
├── src/
│   ├── chain-config.ts       # System-level blockchain configs (RPC, contracts)
│   ├── data-operator.ts      # SpecKitDataOperator (GitHub operations)
│   ├── tools/                # 6 Bounty flow tools
│   │   ├── guide.ts          # Get started guide for Users/Workers
│   │   ├── publish-bounty.ts # Publish bounty (spec.md → Issue → on-chain)
│   │   ├── accept-bounty.ts  # Accept bounty (on-chain → download spec)
│   │   ├── submit-bounty.ts  # Submit work (create PR → on-chain)
│   │   ├── confirm-bounty.ts # Confirm work (User confirms submission)
│   │   └── claim-bounty.ts   # Claim payout (after cooling period)
│   ├── server.ts             # MCP server (exposes 6 tools)
│   └── index.ts              # Package exports
├── tests/                    # Unit and E2E tests
│   ├── e2e-ethereum-spec-kit.test.ts
│   └── e2e-aptos-spec-kit.test.ts
├── package.json
└── .env.test.example         # Test environment template
```

---

## Development

### Build

```bash
pnpm run build
```

### Run Tests

**E2E Tests** require real credentials:

```bash
# 1. Copy test config template
cp .env.test.example .env.test

# 2. Fill in your test credentials (see .env.test.example for details)

# 3. Run E2E tests
pnpm test:e2e
```

**What tests do**:
- Create real GitHub Issues/PRs
- Create real blockchain transactions on testnets
- Require manual cleanup after tests

### Start MCP Server Locally

```bash
# After build
node dist/src/server.js
```

---

## Available Tools

### 1. guide

Get started guide for Users and Workers.

**Parameters**:
- `role`: `user` or `worker`

**Example**:
```typescript
{
  "role": "user"
}
```

---

### 2. publish-bounty

Publish a bounty to GitHub Issue and blockchain.

**Parameters**:
- `specPath`: Local spec.md file path (e.g., `specs/001/spec.md`)
- `repo`: GitHub repository (format: `owner/repo`)
- `amount`: Bounty amount in smallest unit
  - Ethereum: `"10000000000000000"` (0.01 ETH)
  - Aptos: `"100000000"` (1 APT)
- `asset`: Asset symbol (`ETH` or `APT`)
- `chain`: Target blockchain (`ethereum` or `aptos`, default: `ethereum`)

**Example**:
```typescript
{
  "specPath": "specs/001/spec.md",
  "repo": "code3-team/bounty-repo",
  "amount": "10000000000000000",
  "asset": "ETH",
  "chain": "ethereum"
}
```

**Returns**:
- Issue URL
- Bounty ID
- Transaction hash
- Chain and contract address

---

### 3. accept-bounty

Accept a bounty and download spec.md to local.

**Parameters**:
- `issueUrl`: GitHub Issue URL
- `chain`: Target blockchain (`ethereum` or `aptos`, default: `ethereum`)

**Example**:
```typescript
{
  "issueUrl": "https://github.com/owner/repo/issues/123",
  "chain": "ethereum"
}
```

**Returns**:
- Bounty ID
- Local path where spec.md was saved
- Transaction hash

---

### 4. submit-bounty

Submit work via Pull Request.

**Parameters**:
- `issueUrl`: GitHub Issue URL
- `branchName`: Git branch with changes
- `summary`: PR summary (optional)
- `filesChanged`: List of changed files (optional)
- `testing`: Testing notes (optional)
- `chain`: Target blockchain (`ethereum` or `aptos`, default: `ethereum`)

**Example**:
```typescript
{
  "issueUrl": "https://github.com/owner/repo/issues/123",
  "branchName": "feat/implement-spec-123",
  "summary": "Implemented user authentication feature",
  "chain": "ethereum"
}
```

**Returns**:
- PR URL
- Transaction hash

---

### 5. confirm-bounty

Confirm a submitted PR (User role).

**Parameters**:
- `issueUrl`: GitHub Issue URL
- `chain`: Target blockchain (`ethereum` or `aptos`, default: `ethereum`)

**Example**:
```typescript
{
  "issueUrl": "https://github.com/owner/repo/issues/123",
  "chain": "ethereum"
}
```

**Returns**:
- Transaction hash
- Confirmed timestamp
- Cooling period end time (if applicable)

**Note**:
- Ethereum has no cooling period (can claim immediately after confirm)
- Aptos may have a cooling period (check contract configuration)

---

### 6. claim-bounty

Claim payout after confirmation (Worker role).

**Parameters**:
- `issueUrl`: GitHub Issue URL
- `chain`: Target blockchain (`ethereum` or `aptos`, default: `ethereum`)

**Example**:
```typescript
{
  "issueUrl": "https://github.com/owner/repo/issues/123",
  "chain": "ethereum"
}
```

**Returns**:
- Amount paid
- Transaction hash

---

## Testing

### E2E Test Configuration

For E2E tests, copy `.env.test.example` to `.env.test`:

```bash
# GitHub credentials
GITHUB_TOKEN=ghp_your_test_token_here
TEST_REPO=your-username/code3-e2e-test

# Choose one or both chains to test
ETHEREUM_PRIVATE_KEY=0x_your_ethereum_test_key_here
APTOS_PRIVATE_KEY=0x_your_aptos_test_key_here
```

**Notes**:
- System configs (RPC URLs, contract addresses) are automatically loaded from `src/chain-config.ts`
- Tests create real resources (Issues, PRs, transactions)
- Manual cleanup required after tests

---

## System Configuration Updates

If you're a Code3 team member updating blockchain configurations:

**Edit `src/chain-config.ts`**:

```typescript
export const ETHEREUM_CONFIGS: Record<string, ChainConfig> = {
  sepolia: {
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    contractAddress: '0x28FE83352f2451c54d9050761DF1d7F8945a8fc4', // Update here
    network: 'sepolia'
  }
};

export const APTOS_CONFIGS: Record<string, ChainConfig> = {
  testnet: {
    rpcUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
    contractAddress: '0x28a61734...', // Update here
    network: 'testnet'
  }
};
```

After updating:
1. Rebuild: `pnpm run build`
2. Commit changes
3. Users get new configs on next restart (no manual config needed!)

---

## License

MIT

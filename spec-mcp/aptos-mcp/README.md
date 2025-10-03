# @code3-team/aptos-chain-mcp

> Aptos Chain MCP Server - Blockchain interaction tools for Code3 bounty management
>
> **Status**: MVP Implementation
> **Network**: Aptos Testnet (mainnet-ready)
> **Contract**: [Code3 Bounty Contract](../../task3/aptos/sources/bounty.move)

---

## Installation & Setup

### Quick Start (npx)

Add to your Claude Code `.mcp.json`:

```json
{
  "mcpServers": {
    "aptos-chain": {
      "command": "npx",
      "args": ["-y", "@code3-team/aptos-chain-mcp"],
      "env": {
        "APTOS_CONTRACT_ADDRESS": "YOUR_CONTRACT_ADDRESS",
        "APTOS_PRIVATE_KEY": "YOUR_PRIVATE_KEY",
        "APTOS_NETWORK": "testnet"
      }
    }
  }
}
```

### Environment Variables

Create a `.env` file:

```bash
APTOS_CONTRACT_ADDRESS=0xafd0c08dbf36230f9b96eb1d23ff7ee223ad40be47917a0aba310ed90ac422a1
APTOS_PRIVATE_KEY=0x...
APTOS_NETWORK=testnet
```

**Important**: This MCP server requires the Code3 bounty contract to be deployed on Aptos. The contract source code is located at:
- **Contract Source**: [Code3-Workspace/task3/aptos/sources/bounty.move](https://github.com/cyl19970726/Code3-Workspace/tree/main/task3/aptos)
- **Deployment Guide**: See [task3/aptos/README.md](https://github.com/cyl19970726/Code3-Workspace/blob/main/task3/aptos/README.md)

**No ABI file needed**: This MCP server calls contract functions directly using the Aptos TypeScript SDK (`@aptos-labs/ts-sdk`). Function signatures are defined in the TypeScript code.

### Local Development

```bash
# Clone and build
git clone https://github.com/cyl19970726/Code3-Workspace.git
cd Code3-Workspace/spec-mcp/aptos-chain-mcp
npm install
npm run build

# Link locally
npm link

# Add to .mcp.json
{
  "mcpServers": {
    "aptos-chain": {
      "command": "aptos-chain-mcp",
      "env": {
        "APTOS_CONTRACT_ADDRESS": "${APTOS_CONTRACT_ADDRESS}",
        "APTOS_PRIVATE_KEY": "${APTOS_PRIVATE_KEY}",
        "APTOS_NETWORK": "${APTOS_NETWORK:-testnet}"
      }
    }
  }
}
```

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [MCP Tools](#mcp-tools)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Reference](#reference)

---

## Overview

`@code3-team/aptos-chain-mcp` is a Model Context Protocol (MCP) server that provides AI-friendly tools for interacting with the Code3 bounty smart contract on Aptos blockchain.

**Key Features**:
- 6 MCP tools covering the complete bounty lifecycle
- Automatic retry logic with exponential backoff
- Comprehensive input validation
- Contract error mapping (Move → TypeScript)
- TypeScript SDK integration (@aptos-labs/ts-sdk ^1.30.0)

**Use Cases**:
- AI agents managing bounties on behalf of sponsors
- Automated PR submission and verification
- Cross-chain bounty dashboards
- Workflow automation (e.g., Claude Desktop + MCP)

---

## Architecture

```
@code3-team/aptos-chain-mcp
├── src/
│   ├── aptos/
│   │   └── client.ts          # Aptos SDK wrapper
│   ├── tools/
│   │   ├── create-bounty.ts   # Tool 1: Create bounty
│   │   ├── accept-bounty.ts   # Tool 2: Accept bounty
│   │   ├── submit-pr.ts       # Tool 3: Submit PR
│   │   ├── mark-merged.ts     # Tool 4: Mark PR as merged
│   │   ├── claim-payout.ts    # Tool 5: Claim payout
│   │   └── cancel-bounty.ts   # Tool 6: Cancel bounty
│   ├── utils/
│   │   ├── errors.ts          # Error handling & contract error mapping
│   │   ├── retry.ts           # Retry logic with backoff
│   │   └── validation.ts      # Input validation
│   ├── types.ts               # TypeScript type definitions
│   ├── config.ts              # Environment variable loading
│   ├── server.ts              # MCP server implementation
│   └── index.ts               # Entry point
└── dist/                      # Compiled JavaScript (ESM)
```

---

## MCP Tools

### 1. `create_bounty`

Create a new bounty for a GitHub issue.

**Input**:
```typescript
{
  repo_url: string;     // e.g., "https://github.com/owner/repo"
  issue_hash: string;   // SHA-256 hash (64 hex chars)
  asset: string;        // Aptos asset address (e.g., USDT)
  amount: string;       // Amount in base units (e.g., "1000000" for 1 USDT)
}
```

**Output**:
```typescript
{
  bounty_id: string;
  tx_hash: string;
  repo_url: string;
  issue_hash: string;
  amount: string;
  status: "Open";
}
```

**Example**:
```bash
# Via Claude Desktop
User: Create a bounty for issue #42 in github.com/code3/core
      - Asset: 0x1::aptos_coin::AptosCoin
      - Amount: 10 APT

AI: [calls create_bounty tool with proper parameters]
```

---

### 2. `accept_bounty`

Accept a bounty (marks it as "Started").

**Input**:
```typescript
{
  bounty_id: string;  // e.g., "1"
}
```

**Output**:
```typescript
{
  bounty_id: string;
  tx_hash: string;
  winner: string;     // Developer's address
  status: "Started";
}
```

**Preconditions**:
- Bounty must be in `Open` status
- Any developer can accept (first-come-first-serve)

---

### 3. `submit_pr`

Submit a pull request URL for a bounty.

**Input**:
```typescript
{
  bounty_id: string;
  pr_url: string;       // e.g., "https://github.com/owner/repo/pull/123"
  pr_digest: string;    // SHA-256 hash of PR metadata
}
```

**Output**:
```typescript
{
  bounty_id: string;
  tx_hash: string;
  pr_url: string;
  status: "PRSubmitted";
}
```

**Preconditions**:
- Bounty must be in `Started` status
- Caller must be the winner

---

### 4. `mark_merged`

Mark a PR as merged (sponsor only) and start 7-day cooling period.

**Input**:
```typescript
{
  bounty_id: string;
  pr_url: string;       // Must match submitted PR URL
}
```

**Output**:
```typescript
{
  bounty_id: string;
  tx_hash: string;
  merged_at: number;       // Unix timestamp
  cooling_until: number;   // merged_at + 7 days
  status: "CoolingDown";
}
```

**Preconditions**:
- Bounty must be in `PRSubmitted` status
- Caller must be the sponsor
- PR URL must match

---

### 5. `claim_payout`

Claim payout after cooling period ends (winner only).

**Input**:
```typescript
{
  bounty_id: string;
}
```

**Output**:
```typescript
{
  bounty_id: string;
  tx_hash: string;
  amount: string;
  winner: string;
  status: "Paid";
}
```

**Preconditions**:
- Bounty must be in `CoolingDown` status
- Caller must be the winner
- Cooling period must have ended

---

### 6. `cancel_bounty`

Cancel a bounty (sponsor only, before PR submission).

**Input**:
```typescript
{
  bounty_id: string;
}
```

**Output**:
```typescript
{
  bounty_id: string;
  tx_hash: string;
  refund_amount: string;
  sponsor: string;
  status: "Cancelled";
}
```

**Preconditions**:
- Bounty must be in `Open` or `Started` status
- Caller must be the sponsor

---

## Installation

### Prerequisites

- Node.js 18+ (ESM support)
- Aptos CLI (for deployment)
- Aptos account with private key

### Install from source

```bash
cd Code3/spec-mcp/aptos-mcp
npm install
npm run build
```

### Verify installation

```bash
npm run start --help
```

---

## Configuration

### Environment Variables

Create `.env` file in the MCP server directory:

```bash
# Required
APTOS_CONTRACT_ADDRESS=0x<contract_address>

# Optional
APTOS_NETWORK=testnet                    # testnet | mainnet | devnet
APTOS_NODE_URL=https://...               # Custom node URL (optional)
APTOS_PRIVATE_KEY=0x<your_private_key>   # For write operations
```

**Security**:
- ⚠️ **NEVER commit `.env` to git**
- Use environment-specific files (`.env.testnet`, `.env.mainnet`)
- For production, use system keychain or secret management service

### Contract Deployment

**Before using this MCP server**, you must deploy the Code3 bounty contract to Aptos:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/cyl19970726/Code3-Workspace.git
   cd Code3-Workspace/task3/aptos
   ```

2. **Deploy the contract** (see [task3/aptos/README.md](https://github.com/cyl19970726/Code3-Workspace/blob/main/task3/aptos/README.md)):
   ```bash
   # Deploy to testnet
   aptos move publish --network testnet --named-addresses code3=<your_address>

   # Or use the deployment script
   ./scripts/deploy_testnet.sh
   ```

3. **Copy the contract address** to your `.env` file as `APTOS_CONTRACT_ADDRESS`.

**Architecture Note**: This MCP server does **not** use ABI files. It calls contract functions directly using the Aptos TypeScript SDK (`@aptos-labs/ts-sdk`). Function signatures are hardcoded in the TypeScript source code (see `src/tools/*.ts`).

### Read-Only Mode

If `APTOS_PRIVATE_KEY` is not set, the MCP server runs in **read-only mode**:
- Only view functions work (e.g., get_bounty)
- Write operations will fail with `PRIVATE_KEY_MISSING` error

---

## Usage

### 1. Start MCP Server (Standalone)

```bash
npm run start
```

**Output**:
```
[MCP Server] Aptos Chain MCP Server started
[MCP Server] Network: testnet
[MCP Server] Contract: 0x1234...
[MCP Server] Account: 0x5678... (or "Read-only mode")
```

### 2. Integrate with Claude Code

**Quick Setup** (Recommended):

```bash
# 1. Deploy contract and generate .env files
cd Code3/task3/aptos
./scripts/deploy_testnet.sh
./scripts/setup_env.sh testnet

# 2. Create .mcp.json in Code3 directory
cd Code3
cat > .mcp.json <<'EOF'
{
  "mcpServers": {
    "aptos-chain": {
      "command": "node",
      "args": [
        "${workspaceFolder}/spec-mcp/aptos-mcp/dist/index.js"
      ],
      "env": {
        "APTOS_CONTRACT_ADDRESS": "${APTOS_CONTRACT_ADDRESS}",
        "APTOS_PRIVATE_KEY": "${APTOS_PRIVATE_KEY}",
        "APTOS_NETWORK": "${APTOS_NETWORK:-testnet}"
      }
    }
  }
}
EOF

# 3. Export environment variables from Code3/.env
export $(cat Code3/.env | xargs)

# 4. Restart Claude Code
# MCP server will auto-load
```

**Manual Configuration** (`.mcp.json` in project root):

```json
{
  "mcpServers": {
    "aptos-chain": {
      "command": "node",
      "args": [
        "/absolute/path/to/Code3/spec-mcp/aptos-mcp/dist/index.js"
      ],
      "env": {
        "APTOS_CONTRACT_ADDRESS": "0xafd0c08dbf36230f9b96eb1d23ff7ee223ad40be47917a0aba310ed90ac422a1",
        "APTOS_PRIVATE_KEY": "0xd38396d0b2c37d930de3eba9d45af4e209f6c3e05eb46c44dc68eaaba3236b34",
        "APTOS_NETWORK": "testnet"
      }
    }
  }
}
```

**Using environment variable expansion** (`.mcp.json` in Code3/):

```json
{
  "mcpServers": {
    "aptos-chain": {
      "command": "node",
      "args": [
        "${workspaceFolder}/spec-mcp/aptos-mcp/dist/index.js"
      ],
      "env": {
        "APTOS_CONTRACT_ADDRESS": "${APTOS_CONTRACT_ADDRESS}",
        "APTOS_PRIVATE_KEY": "${APTOS_PRIVATE_KEY:-}",
        "APTOS_NETWORK": "${APTOS_NETWORK:-testnet}"
      }
    }
  }
}
```

**Verify MCP server is loaded**:

```
User: List available Aptos Chain MCP tools

AI: Available tools:
    - create_bounty
    - accept_bounty
    - submit_pr
    - mark_merged
    - claim_payout
    - cancel_bounty
```

**Usage example**:

```
User: Create a bounty for github.com/cyl19970726/Code3 issue #1 with 1 APT

AI: [automatically calls create_bounty tool]
    ✅ Bounty created!
    - Bounty ID: 1
    - Transaction: 0xabc...
    - Status: Open
    - View on explorer: https://explorer.aptoslabs.com/txn/0xabc...?network=testnet
```

**Reference**: [Claude Code MCP Documentation](https://docs.claude.com/en/docs/claude-code/mcp)

---

### 3. Integrate with Claude Desktop

Add to `claude_desktop_config.json` (usually at `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "aptos-chain": {
      "command": "node",
      "args": [
        "/path/to/Code3/spec-mcp/aptos-mcp/dist/index.js"
      ],
      "env": {
        "APTOS_CONTRACT_ADDRESS": "0x...",
        "APTOS_PRIVATE_KEY": "0x...",
        "APTOS_NETWORK": "testnet"
      }
    }
  }
}
```

**Restart Claude Desktop**, then:

```
User: Create a bounty for github.com/code3/core issue #1 with 10 APT

AI: [automatically calls create_bounty tool]
    ✅ Bounty created! ID: 1, TX: 0xabc...
```

### 4. Programmatic Usage

```typescript
import { AptosClient } from "@code3-team/aptos-chain-mcp";

const client = new AptosClient({
  network: "testnet",
  contractAddress: "0x...",
  privateKey: "0x...",
});

// Create bounty
const txResult = await client.createBounty(
  "https://github.com/code3/core",
  "a".repeat(64), // issue_hash
  "0x1::aptos_coin::AptosCoin",
  "10000000" // 10 APT
);

console.log("Bounty created:", txResult.hash);

// Get bounty info
const bounty = await client.getBounty("1");
console.log("Bounty status:", bounty?.status);
```

---

## Development

### Project Structure

```
aptos-mcp/
├── src/                    # TypeScript source
│   ├── aptos/
│   ├── tools/
│   ├── utils/
│   ├── types.ts
│   ├── config.ts
│   ├── server.ts
│   └── index.ts
├── dist/                   # Compiled JavaScript (ESM)
├── package.json
├── tsconfig.json
├── .env                    # Environment variables (gitignored)
└── README.md
```

### Build

```bash
npm run build
```

### Run in Development

```bash
npm run dev
```

### Linting

```bash
npm run lint
```

---

## Testing

### Unit Tests (Planned)

```bash
npm run test
```

### Manual Testing with Testnet

1. **Deploy contract** (see [task3/aptos/README.md](../../task3/aptos/README.md)):
   ```bash
   cd ../../task3/aptos
   ./scripts/deploy_testnet.sh
   ```

2. **Set environment variables**:
   ```bash
   export APTOS_CONTRACT_ADDRESS=$(cat ../../.env.testnet | grep APTOS_CONTRACT_ADDRESS_TESTNET | cut -d'=' -f2)
   export APTOS_PRIVATE_KEY=0x<your_key>
   ```

3. **Run MCP server**:
   ```bash
   npm run start
   ```

4. **Test with Claude Desktop** or programmatic client.

---

## Deployment

### To Production (Mainnet)

1. **Deploy contract to mainnet**:
   ```bash
   cd ../../task3/aptos
   # Edit scripts/deploy_testnet.sh to use mainnet
   # Or create scripts/deploy_mainnet.sh
   aptos move publish --network mainnet --named-addresses code3=$YOUR_ACCOUNT
   ```

2. **Update environment**:
   ```bash
   APTOS_NETWORK=mainnet
   APTOS_CONTRACT_ADDRESS=0x<mainnet_address>
   APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
   APTOS_PRIVATE_KEY=0x<production_key>
   ```

3. **Security hardening**:
   - Use system keychain for private key
   - Enable rate limiting
   - Add transaction monitoring

---

## Security

### Best Practices

1. **Private Key Management**:
   - ✅ Use environment variables (`.env`)
   - ✅ Use system keychain in production
   - ❌ **NEVER** hardcode private keys

2. **Input Validation**:
   - All MCP tools validate inputs before submission
   - URL format checking (HTTPS required)
   - Amount bounds checking (u64 max)
   - Address format validation

3. **Error Handling**:
   - Contract errors are mapped to TypeScript error codes
   - Sensitive data is **NOT** logged
   - Retry logic prevents network failures

4. **Network Security**:
   - HTTPS required for GitHub URLs
   - Custom node URLs must be validated
   - Transaction signing happens locally (never sends private key)

### Vulnerability Disclosure

If you discover a security issue, please email: **security@code3.com** (placeholder)

---

## Reference

### Related Documentation

- [Code3 Architecture](../../Code3/docs/02-architecture.md)
- [Data Model](../../Code3/docs/05-data-model.md)
- [Aptos Smart Contract](../../task3/aptos/sources/bounty.move)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

### Dependencies

- `@aptos-labs/ts-sdk` ^1.30.0 - Aptos TypeScript SDK
- `@modelcontextprotocol/sdk` ^1.0.4 - MCP SDK

### Error Codes

See [src/utils/errors.ts](./src/utils/errors.ts) for complete list:

| Code | Description |
|------|-------------|
| `BOUNTY_NOT_FOUND` | Bounty ID does not exist |
| `INVALID_STATUS` | Bounty not in required status |
| `NOT_SPONSOR` | Caller is not the sponsor |
| `NOT_WINNER` | Caller is not the winner |
| `COOLING_PERIOD_NOT_ENDED` | Cannot claim yet (< 7 days) |
| `TRANSACTION_FAILED` | Transaction submission failed |
| `NETWORK_ERROR` | Network connectivity issue |
| ... | (9 total error codes) |

### State Machine

```
Open (0) → Started (1) → PRSubmitted (2) → Merged (3) → CoolingDown (4) → Paid (5)
   ↓
Cancelled (6)
```

**Transitions**:
- `create_bounty`: → Open
- `accept_bounty`: Open → Started
- `submit_pr`: Started → PRSubmitted
- `mark_merged`: PRSubmitted → CoolingDown
- `claim_payout`: CoolingDown → Paid
- `cancel_bounty`: Open/Started → Cancelled

---

## License

MIT (placeholder)

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) (placeholder)

---

**Built with ❤️ for Code3**

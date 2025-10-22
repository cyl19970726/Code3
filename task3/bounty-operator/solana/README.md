# @code3-team/bounty-operator-solana

Solana implementation of the BountyOperator interface for Code3 bounty system.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Solana CLI
- Anchor CLI v0.30.1+
- Rust 1.70+

### Installation

```bash
# Install dependencies
pnpm install

# Install Anchor CLI (if not installed)
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli
anchor --version
```

## ⚙️ Configuration

### 1. Check RPC Connection

```bash
pnpm check:rpc
```

Expected output:
```
✓ Connection Successful
  Response Time: 120ms
  Rating: Excellent
  Status: ✓ Healthy
```

### 2. Check Account Balances

```bash
pnpm check:balance
```

Expected output:
```
Sponsor Account:
  ✓ Balance: 2.5000 SOL
  Status: Sufficient

Worker Account:
  ✓ Balance: 1.8000 SOL
  Status: Sufficient

✓ All accounts ready for testing!
```

### 3. Request Airdrop (if needed)

```bash
pnpm airdrop
```

For more configuration details, see: `.agent-context/plan/todo/support-solana/config.md`

## 🔨 Development

### Build Smart Contract

```bash
# Build Anchor program
pnpm build

# Clean build artifacts
pnpm clean
```

### Run Tests

```bash
# Run Anchor tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Watch mode
pnpm test:watch
```

### Deploy

```bash
# Deploy to devnet
pnpm deploy:devnet

# Deploy to mainnet (CAUTION!)
pnpm deploy:mainnet
```

## 📁 Project Structure

```
Code3/task3/bounty-operator/solana/
├── programs/
│   └── bounty-manager/        # Solana program (Rust)
│       ├── src/
│       │   ├── lib.rs         # Program entry point
│       │   ├── state.rs       # Account structures
│       │   ├── instructions/  # Instruction handlers
│       │   ├── error.rs       # Error definitions
│       │   └── events.rs      # Event definitions
│       └── Cargo.toml
├── tests/
│   └── bounty-manager.ts      # Anchor tests
├── src/                       # TypeScript SDK
│   ├── solana-bounty-operator.ts
│   ├── index.ts
│   └── e2e-solana.test.ts
├── scripts/                   # Utility scripts
│   ├── check-balance.ts       # ✅ Check account balances
│   └── check-rpc.ts           # ✅ Check RPC health
├── .env.test                  # ✅ Test configuration
├── Anchor.toml                # Anchor config
├── package.json
├── tsconfig.json
└── README.md
```

**Status**:
- ✅ Configuration files ready
- ✅ Check scripts ready
- 🔄 Smart contract (pending)
- 🔄 TypeScript SDK (pending)
- 🔄 E2E tests (pending)

## 🧪 Testing

### E2E Test Flow

1. Create bounty (0.1 SOL)
2. Accept bounty (assign worker)
3. Submit work (PR URL)
4. Confirm work (sponsor approval)
5. Claim payout (worker receives SOL)

### Test Accounts

- **Sponsor**: Creates and confirms bounties
- **Worker**: Accepts and claims bounties

Minimum balance required: **1.0 SOL** per account

## 📖 Documentation

- **Implementation Plan**: `.agent-context/plan/todo/support-solana/plan.md`
- **E2E Test Plan**: `.agent-context/plan/todo/support-solana/e2e.md`
- **Configuration Guide**: `.agent-context/plan/todo/support-solana/config.md`

## 🔗 Links

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Book](https://book.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [QuickNode Solana RPC](https://www.quicknode.com/docs/solana)
- [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)

## 📄 License

MIT

# @code3-team/bounty-operator-ethereum

Ethereum implementation of the `BountyOperator` interface for Code3 bounty system.

## Features

✅ **Full BountyOperator interface implementation** (11 methods)
- 6 write operations (create, accept, submit, confirm, claim, cancel)
- 5 read operations (get, getByTaskHash, list, getBySponsor, getByWorker)

✅ **Ethereum-specific features**
- Native ETH and ERC20 token support
- EIP-1559 gas management (maxFeePerGas, maxPriorityFeePerGas)
- Event parsing for bountyId retrieval
- 7-day cooling period enforcement

✅ **Production-ready**
- TypeScript with full type safety
- Comprehensive unit tests (17 tests)
- Deployed and verified on Sepolia testnet

## Installation

```bash
pnpm add @code3-team/bounty-operator-ethereum
```

## Quick Start

### 1. Initialize Operator

```typescript
import { EthereumBountyOperator } from '@code3-team/bounty-operator-ethereum';

const operator = new EthereumBountyOperator({
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  privateKey: process.env.PRIVATE_KEY!,
  contractAddress: '0xc18C3F54778D2B1527c1081Ed15F030170C42B82', // Sepolia

  // Optional gas settings
  gasLimit: 500000n,
  maxFeePerGas: 20000000000n, // 20 gwei
  maxPriorityFeePerGas: 1000000000n // 1 gwei
});
```

### 2. Create a Bounty

```typescript
// Create bounty with ETH
const result = await operator.createBounty({
  taskId: 'my-project#123',
  taskHash: '0x' + ethers.keccak256(ethers.toUtf8Bytes('task-description')),
  amount: ethers.parseEther('0.1').toString(), // 0.1 ETH
  asset: 'ETH'
});

console.log('Bounty ID:', result.bountyId);
console.log('Tx Hash:', result.txHash);
```

### 3. Worker Accepts Bounty

```typescript
const result = await operator.acceptBounty({
  bountyId: '1'
});

console.log('Accepted! Tx:', result.txHash);
```

### 4. Worker Submits Work

```typescript
const result = await operator.submitBounty({
  bountyId: '1',
  submissionHash: 'https://github.com/my-project/pull/123'
});

console.log('Submitted! Tx:', result.txHash);
```

### 5. Requester Confirms Work

```typescript
const result = await operator.confirmBounty({
  bountyId: '1',
  confirmedAt: Math.floor(Date.now() / 1000)
});

console.log('Confirmed! Cooling until:', new Date(result.coolingUntil * 1000));
```

### 6. Worker Claims Payout (after cooling period)

```typescript
// Wait 7 days after confirmation
const result = await operator.claimPayout({
  bountyId: '1'
});

console.log('Claimed! Tx:', result.txHash);
```

## Read Operations

### Get Bounty Details

```typescript
const bounty = await operator.getBounty({ bountyId: '1' });

console.log(bounty);
// {
//   bountyId: '1',
//   taskId: 'my-project#123',
//   taskHash: '0x...',
//   sponsor: '0x...',
//   worker: '0x...',
//   amount: '100000000000000000',
//   asset: 'ETH',
//   status: 'Confirmed',
//   createdAt: 1697000000,
//   acceptedAt: 1697001000,
//   submittedAt: 1697002000,
//   confirmedAt: 1697003000,
//   coolingUntil: 1697607800,
//   claimedAt: null
// }
```

### Check Idempotency

```typescript
const result = await operator.getBountyByTaskHash({
  taskHash: '0x...'
});

if (result.found) {
  console.log('Bounty already exists:', result.bountyId);
} else {
  console.log('No bounty found for this task hash');
}
```

### List Bounties

```typescript
// List all bounties
const result = await operator.listBounties({ offset: 0, limit: 100 });
console.log('Bounty IDs:', result.bountyIds); // ['1', '2', '3', ...]
console.log('Total:', result.count);

// Get bounties by sponsor
const sponsorBounties = await operator.getBountiesBySponsor({
  sponsor: '0x...'
});

// Get bounties by worker
const workerBounties = await operator.getBountiesByWorker({
  worker: '0x...'
});
```

## Contract Deployment

### Sepolia Testnet (Live)

- **Contract Address**: `0xc18C3F54778D2B1527c1081Ed15F030170C42B82`
- **Chain ID**: 11155111
- **Etherscan**: https://sepolia.etherscan.io/address/0xc18C3F54778D2B1527c1081Ed15F030170C42B82#code
- **Deployed**: 2025-10-15T12:14:13.891Z
- **Block**: 9417024

### Mainnet

Not deployed yet.

## Configuration

### Gas Options (EIP-1559)

```typescript
const operator = new EthereumBountyOperator({
  rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
  privateKey: process.env.PRIVATE_KEY!,
  contractAddress: '0x...',

  // Gas limit (optional, defaults to auto-estimate)
  gasLimit: 500000n,

  // Max fee per gas (optional, defaults to network fee data)
  maxFeePerGas: 50000000000n, // 50 gwei

  // Max priority fee per gas (optional, tip to miners)
  maxPriorityFeePerGas: 2000000000n // 2 gwei
});
```

### Helper Methods

```typescript
// Get cooling period (in seconds)
const period = await operator.getCoolingPeriod();
console.log('Cooling period:', period, 'seconds'); // 604800 (7 days)

// Get current wallet address
const address = operator.getAddress();
console.log('Wallet:', address);

// Get contract address
const contractAddress = operator.getContractAddress();
console.log('Contract:', contractAddress);

// Get provider
const provider = operator.getProvider();
const blockNumber = await provider.getBlockNumber();
console.log('Current block:', blockNumber);
```

## Testing

### Unit Tests

```bash
# Run unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm vitest run --coverage
```

**Test Coverage**: 17/17 tests passing ✅
- Constructor (2 tests)
- Write operations (6 tests)
- Read operations (6 tests)
- Helper methods (3 tests)

### E2E Tests

```bash
# Run E2E tests (requires real Sepolia testnet setup)
pnpm test:e2e
```

**E2E Test Coverage**: 11 scenarios ✅
- Complete bounty flow (9 steps): create → accept → submit → confirm → claim
- Cancellation flow (2 steps): create → cancel
- Idempotency verification
- Query operations (by sponsor, by worker, by taskHash)

**Prerequisites for E2E tests**:
1. Two Sepolia accounts with ~0.05 ETH each (requester + worker)
2. Configure `.env.test` with private keys
3. BountyManager contract deployed on Sepolia

See [E2E-TEST-GUIDE.md](./E2E-TEST-GUIDE.md) for detailed instructions.

## Architecture

```
ethereum/
├── src/
│   ├── ethereum-bounty-operator.ts   # Main implementation (320 lines)
│   ├── ethereum-bounty-operator.test.ts  # Unit tests (17 tests)
│   └── index.ts                       # Exports
├── contract/
│   ├── contracts/
│   │   └── BountyManager.sol          # Solidity contract (437 lines)
│   ├── scripts/
│   │   ├── deploy.js                  # Deployment script
│   │   └── check-balance.js           # Balance checker
│   ├── test/
│   │   └── BountyManager.test.js      # Hardhat tests (10 tests)
│   └── deployments/
│       └── sepolia.json               # Deployment info
├── package.json
├── tsconfig.json
└── README.md
```

## Status Transitions

```
Open → Accepted → Submitted → Confirmed → Claimed
  ↓
Cancelled (only when Open)
```

## Error Handling

All methods throw descriptive errors:

```typescript
try {
  await operator.claimPayout({ bountyId: '1' });
} catch (error) {
  console.error('Claim failed:', error.message);
  // Possible errors:
  // - "Cooling period not elapsed"
  // - "Only worker can claim"
  // - "Bounty not confirmed"
}
```

## Contributing

See [Code3/CLAUDE.md](../../../CLAUDE.md) for development guidelines.

## License

MIT

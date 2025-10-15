# Aptos BountyOperator Implementation

This package implements the `BountyOperator` interface for the Aptos blockchain.

## Structure

```
aptos/
├── contract/                    # Aptos Move smart contract
│   ├── sources/
│   │   └── bounty.move         # Main bounty contract
│   └── Move.toml               # Contract configuration
├── src/
│   ├── bounty-operator.ts      # AptosBountyOperator class (11 methods)
│   ├── client.ts               # Aptos client wrapper
│   └── types.ts                # Aptos-specific types
├── tests/
│   └── bounty-operator.test.ts # Unit tests
├── package.json
├── tsconfig.json
└── README.md                   # This file
```

## Contract Features

### Entry Functions (6 write operations)
- `create_bounty` - Create a new bounty with escrow
- `accept_bounty` - Worker accepts the task
- `submit_bounty` - Worker submits work result
- `confirm_bounty` - Sponsor confirms work (enters 7-day cooling period)
- `claim_payout` - Worker claims reward after cooling period
- `cancel_bounty` - Sponsor cancels (only when Open)

### View Functions (5 read operations)
- `get_bounty` - Get complete bounty information
- `get_bounty_by_task_hash` - Check if bounty exists (idempotency)
- `get_next_bounty_id` - Get next available bounty ID
- `get_bounties_by_sponsor` - List bounties by sponsor
- `get_bounties_by_worker` - List bounties by worker

### Status Machine
```
Open → Accepted → Submitted → Confirmed → Claimed
  ↓
Cancelled (only from Open)
```

### Escrow Mechanism
- Funds are locked in `BountyEscrow` when bounty is created
- Funds are released to worker when `claim_payout` is called
- Funds are refunded to sponsor when `cancel_bounty` is called

### Cooling Period
- 7 days (604800 seconds)
- Starts when sponsor calls `confirm_bounty`
- Worker can only claim after cooling period ends

## TypeScript Implementation

### AptosBountyOperator

Implements all 11 methods of the `BountyOperator` interface:

**Write Operations**:
1. `createBounty` - Submit transaction to create bounty
2. `acceptBounty` - Submit transaction to accept bounty
3. `submitBounty` - Submit transaction to submit work
4. `confirmBounty` - Submit transaction to confirm work
5. `claimPayout` - Submit transaction to claim payout
6. `cancelBounty` - Submit transaction to cancel bounty

**Read Operations**:
7. `getBounty` - View function to get bounty details
8. `getBountyByTaskHash` - View function for idempotency check
9. `listBounties` - Get all bounty IDs (pagination supported)
10. `getBountiesBySponsor` - Get bounties by sponsor address
11. `getBountiesByWorker` - Get bounties by worker address

## Usage Example

```typescript
import { AptosBountyOperator } from '@code3/task3/bounty-operator/aptos';

// Initialize
const bountyOperator = new AptosBountyOperator({
  privateKey: process.env.APTOS_PRIVATE_KEY!,
  network: 'testnet',
  contractAddress: '0x...'
});

// Create bounty
const result = await bountyOperator.createBounty({
  taskId: 'owner/repo#123',
  taskHash: '0xabcd...',
  amount: '100000000', // 1 APT in octas
  asset: 'APT'
});

console.log(`Bounty created: ${result.bountyId}, Tx: ${result.txHash}`);
```

## Deployment

### 1. Compile contract
```bash
cd contract
aptos move compile
```

### 2. Deploy contract
```bash
aptos move publish --profile testnet
```

### 3. Initialize registry
```bash
aptos move run \
  --function-id 0x<address>::bounty::initialize \
  --profile testnet
```

## Testing

```bash
npm test
```

## Status

- ✅ Move contract implemented
- ⏳ TypeScript BountyOperator implementation (pending T005 completion)
- ⏳ Unit tests (pending T008)

## References

- **Interface**: [Code3/docs/02-interfaces.md Section 2](../../../../docs/02-interfaces.md#2-bountyoperator-接口)
- **Data Model**: [Code3/docs/01-data-model.md Section 2](../../../../docs/01-data-model.md#2-bounty-数据模型)
- **Aptos SDK**: https://aptos.dev/sdks/ts-sdk

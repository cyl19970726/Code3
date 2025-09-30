# Code3 Bounty Smart Contract

Move smart contract for managing GitHub Issue bounties on Aptos blockchain.

## Overview

This contract implements a complete bounty lifecycle for software development tasks:

```
Open → Started → PRSubmitted → Merged → CoolingDown(7d) → Paid
         └───────────────┐                └→ Cancelled
```

## Features

- **Single PR Settlement**: First-merged PR wins the bounty
- **7-Day Cooling Period**: Dispute window after merge before payout
- **Idempotency**: Uses `issue_hash` to prevent duplicate bounties
- **Event Emission**: All state changes emit events for off-chain indexing
- **USDT Support**: Uses Fungible Asset standard (testnet/mainnet)

## Data Model

All data structures are defined in [Code3/docs/14-data-model.md](../../docs/14-data-model.md).

### Key Structures

- `Bounty`: Main bounty record with sponsor, winner, amount, status, timestamps
- `BountyRegistry`: Global registry storing all bounties with idempotency mapping
- `AcceptedWorkers`: Tracks workers who accepted each bounty

### Status Codes

| Value | Name         | Description                      |
|-------|--------------|----------------------------------|
| 0     | Open         | Published, awaiting acceptance   |
| 1     | Started      | Worker accepted, in progress     |
| 2     | PRSubmitted  | Worker submitted PR              |
| 3     | Merged       | PR merged, winner established    |
| 4     | CoolingDown  | 7-day dispute period active      |
| 5     | Paid         | Payout claimed successfully      |
| 6     | Cancelled    | Bounty cancelled by sponsor      |

## Entry Functions

### create_bounty
```move
public entry fun create_bounty(
    sponsor: &signer,
    repo_url: String,
    issue_hash: vector<u8>,
    asset: Object<Metadata>,
    amount: u64,
)
```
Creates a new bounty. Validates amount > 0 and checks idempotency via `issue_hash`.

**TODO**: Implement token escrow from sponsor account.

### accept_bounty
```move
public entry fun accept_bounty(
    worker: &signer,
    bounty_id: u64,
)
```
Worker accepts a bounty. Requires status = Open. Multiple workers can accept (concurrent work allowed).

### submit_pr
```move
public entry fun submit_pr(
    worker: &signer,
    bounty_id: u64,
    pr_url: String,
    commit_sha: Option<vector<u8>>,
)
```
Worker submits PR link. Requires worker has accepted bounty and status = Started.

**TODO**: Implement pr_digest calculation from (bounty_id || pr_url || commit_sha).

### mark_merged
```move
public entry fun mark_merged(
    resolver: &signer,
    bounty_id: u64,
    pr_url: String,
    commit_sha: Option<vector<u8>>,
)
```
Resolver/sponsor marks PR as merged. First merged PR establishes winner. Sets 7-day cooling period.

**TODO**:
- Verify pr_digest matches submitted PR
- Add resolver role support (currently only sponsor can call)

### claim_payout
```move
public entry fun claim_payout(
    worker: &signer,
    bounty_id: u64,
)
```
Winner claims payout after cooling period expires. Requires winner == caller and current_time >= cooling_until.

**TODO**: Implement actual token transfer to winner.

### cancel_bounty
```move
public entry fun cancel_bounty(
    sponsor: &signer,
    bounty_id: u64,
)
```
Sponsor cancels bounty. Only allowed in Open or Started states.

**TODO**: Implement token refund to sponsor.

## View Functions

- `get_bounty(bounty_id: u64): &Bounty` - Get bounty details
- `find_bounty_by_issue_hash(issue_hash: vector<u8>): u64` - Get bounty_id from issue_hash

## Events

All events match [14-data-model.md](../../docs/14-data-model.md):

- `BountyCreated`: Emitted on bounty creation
- `BountyAccepted`: Emitted when worker accepts
- `PRSubmitted`: Emitted when PR is submitted
- `Merged`: Emitted when PR merged, includes winner and cooling period
- `Paid`: Emitted on successful payout
- `Cancelled`: Emitted on cancellation

## Building

```bash
cd Code3/task3/contract
aptos move compile --dev --save-metadata
```

## Testing

```bash
aptos move test --dev
```

**TODO**: Write comprehensive unit tests for all functions.

## Deployment

```bash
# Testnet
aptos move publish --dev

# Mainnet (update Move.toml addresses first)
aptos move publish
```

## Integration

This contract integrates with:
- **GitHub**: Issue metadata via [06-issue-metadata.md](../../docs/06-issue-metadata.md)
- **MCP Tools**: Via [07-mcp-tools-spec.md](../../docs/07-mcp-tools-spec.md)
- **Webhook**: Chain-offchain bridge via [10-chain-offchain-bridge.md](../../docs/10-chain-offchain-bridge.md)

## Security

- Access control enforced via `assert!` checks
- State machine transitions validated
- Idempotency via `issue_hash` prevents duplicate creation
- Winner can only be set once (first-merged-wins)
- Cooling period enforced with block timestamps

## Known Limitations

1. **Token transfers not implemented**: Escrow, payout, and refund are placeholder TODOs
2. **PR digest verification incomplete**: Hash calculation not implemented
3. **Resolver role**: Currently only sponsor can call `mark_merged`, needs separate resolver role
4. **No tests**: Unit tests need to be written

## References

- [08-contract-spec.md](../../docs/08-contract-spec.md) - Contract specification
- [14-data-model.md](../../docs/14-data-model.md) - Unified data model (single source of truth)
- [IMPLEMENTATION_PLAN.md](../../../IMPLEMENTATION_PLAN.md) - Stage 6 implementation details
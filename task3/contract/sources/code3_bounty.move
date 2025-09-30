/// Code3 Bounty Contract
///
/// Manages bounty lifecycle for GitHub Issues on Aptos blockchain.
/// Based on Code3/docs/14-data-model.md and Code3/docs/08-contract-spec.md
///
/// State Machine:
/// Open → Started → PRSubmitted → Merged → CoolingDown → Paid
///         └─────────────────┐                └→ Cancelled
///
/// Key Features:
/// - Single PR settlement (first-merged-wins)
/// - 7-day cooling period after merge
/// - Idempotency via issue_hash
/// - Event emission for all state changes
module code3::code3_bounty {
    use std::string::{String};
    use std::option::{Self, Option};
    use std::signer;
    use std::vector;
    use aptos_std::table::{Self, Table};
    use aptos_std::event;
    use aptos_framework::timestamp;
    use aptos_framework::object::Object;
    use aptos_framework::fungible_asset::Metadata;
    // TODO: Add fungible_asset and primary_fungible_store when implementing actual token transfers

    // ============================================
    // Error Codes (from 14-data-model.md)
    // ============================================

    const E_NOT_FOUND: u64 = 1;
    const E_EXISTS: u64 = 2;
    const E_PRECONDITION: u64 = 3;
    const E_INVALID_STATE: u64 = 4;
    const E_UNAUTHORIZED: u64 = 5;
    const E_DUPLICATE: u64 = 6;
    const E_COOLING: u64 = 7;
    const E_INVALID_AMOUNT: u64 = 8;
    const E_DIGEST_MISMATCH: u64 = 9;

    // ============================================
    // Status Constants (from 14-data-model.md)
    // ============================================

    const STATUS_OPEN: u8 = 0;
    const STATUS_STARTED: u8 = 1;
    const STATUS_PR_SUBMITTED: u8 = 2;
    const STATUS_MERGED: u8 = 3;
    const STATUS_COOLING_DOWN: u8 = 4;
    const STATUS_PAID: u8 = 5;
    const STATUS_CANCELLED: u8 = 6;

    // ============================================
    // Time Constants
    // ============================================

    const COOLING_PERIOD_SECONDS: u64 = 604800; // 7 days

    // ============================================
    // Data Structures (from 14-data-model.md)
    // ============================================

    /// Bounty resource
    /// Matches Code3/docs/14-data-model.md section 1.1
    struct Bounty has store {
        id: u64,
        sponsor: address,
        winner: Option<address>,
        repo_url: String,
        issue_hash: vector<u8>,       // SHA256 hash for idempotency
        pr_url: Option<String>,
        pr_digest: Option<vector<u8>>, // hash(bounty_id || pr_url || commit_sha)
        asset: Object<Metadata>,       // USDT FA
        amount: u64,
        status: u8,
        merged_at: Option<u64>,
        cooling_until: Option<u64>,
        created_at: u64,
    }

    /// Registry of all bounties
    struct BountyRegistry has key {
        bounties: Table<u64, Bounty>,
        next_id: u64,
        issue_hash_to_id: Table<vector<u8>, u64>, // For idempotency
    }

    /// Track accepted workers per bounty
    struct AcceptedWorkers has key {
        // bounty_id -> list of workers
        workers_by_bounty: Table<u64, vector<address>>,
    }

    // ============================================
    // Events (from 14-data-model.md section 4)
    // ============================================

    #[event]
    struct BountyCreated has drop, store {
        bounty_id: u64,
        sponsor: address,
        repo_url: String,
        issue_hash: vector<u8>,
        asset: Object<Metadata>,
        amount: u64,
    }

    #[event]
    struct BountyAccepted has drop, store {
        bounty_id: u64,
        worker: address,
    }

    #[event]
    struct PRSubmitted has drop, store {
        bounty_id: u64,
        worker: address,
        pr_url: String,
    }

    #[event]
    struct Merged has drop, store {
        bounty_id: u64,
        pr_url: String,
        winner: address,
        merged_at: u64,
        cooling_until: u64,
    }

    #[event]
    struct Paid has drop, store {
        bounty_id: u64,
        winner: address,
        amount: u64,
    }

    #[event]
    struct Cancelled has drop, store {
        bounty_id: u64,
    }

    // ============================================
    // Initialization
    // ============================================

    /// Initialize the module (called once on deployment)
    fun init_module(account: &signer) {
        move_to(account, BountyRegistry {
            bounties: table::new(),
            next_id: 1,
            issue_hash_to_id: table::new(),
        });

        move_to(account, AcceptedWorkers {
            workers_by_bounty: table::new(),
        });
    }

    // ============================================
    // Public Entry Functions
    // ============================================

    /// Create a new bounty
    /// Based on 14-data-model.md section 1.1 and IMPLEMENTATION_PLAN.md
    public entry fun create_bounty(
        sponsor: &signer,
        repo_url: String,
        issue_hash: vector<u8>,
        asset: Object<Metadata>,
        amount: u64,
    ) acquires BountyRegistry {
        // Validate amount
        assert!(amount > 0, E_INVALID_AMOUNT);

        let sponsor_addr = signer::address_of(sponsor);
        let registry = borrow_global_mut<BountyRegistry>(@code3);

        // Check idempotency: issue_hash must be unique
        assert!(
            !table::contains(&registry.issue_hash_to_id, issue_hash),
            E_DUPLICATE
        );

        // Transfer tokens to contract
        // TODO: Implement escrow logic with fungible_asset::transfer
        // For now, we assume sponsor has approved the transfer

        let bounty_id = registry.next_id;
        registry.next_id = bounty_id + 1;

        let now = timestamp::now_seconds();

        // Copy values for event before moving bounty
        let repo_url_copy = repo_url;
        let issue_hash_copy = issue_hash;

        let bounty = Bounty {
            id: bounty_id,
            sponsor: sponsor_addr,
            winner: option::none(),
            repo_url,
            issue_hash,
            pr_url: option::none(),
            pr_digest: option::none(),
            asset,
            amount,
            status: STATUS_OPEN,
            merged_at: option::none(),
            cooling_until: option::none(),
            created_at: now,
        };

        // Store bounty
        table::add(&mut registry.bounties, bounty_id, bounty);
        table::add(&mut registry.issue_hash_to_id, issue_hash_copy, bounty_id);

        // Emit event
        event::emit(BountyCreated {
            bounty_id,
            sponsor: sponsor_addr,
            repo_url: repo_url_copy,
            issue_hash: issue_hash_copy,
            asset,
            amount,
        });
    }

    /// Accept a bounty (worker claims the task)
    public entry fun accept_bounty(
        worker: &signer,
        bounty_id: u64,
    ) acquires BountyRegistry, AcceptedWorkers {
        let worker_addr = signer::address_of(worker);
        let registry = borrow_global_mut<BountyRegistry>(@code3);

        // Check bounty exists
        assert!(table::contains(&registry.bounties, bounty_id), E_NOT_FOUND);

        let bounty = table::borrow_mut(&mut registry.bounties, bounty_id);

        // Check status is Open
        assert!(bounty.status == STATUS_OPEN, E_INVALID_STATE);

        // Track accepted worker
        let workers_registry = borrow_global_mut<AcceptedWorkers>(@code3);
        if (!table::contains(&workers_registry.workers_by_bounty, bounty_id)) {
            table::add(&mut workers_registry.workers_by_bounty, bounty_id, vector::empty());
        };

        let workers = table::borrow_mut(&mut workers_registry.workers_by_bounty, bounty_id);

        // Check worker hasn't already accepted
        assert!(!vector::contains(workers, &worker_addr), E_DUPLICATE);

        vector::push_back(workers, worker_addr);

        // Update status to Started
        bounty.status = STATUS_STARTED;

        // Emit event
        event::emit(BountyAccepted {
            bounty_id,
            worker: worker_addr,
        });
    }

    /// Submit PR for a bounty
    public entry fun submit_pr(
        worker: &signer,
        bounty_id: u64,
        pr_url: String,
        _commit_sha: Option<vector<u8>>,  // TODO: Use for pr_digest calculation
    ) acquires BountyRegistry, AcceptedWorkers {
        let worker_addr = signer::address_of(worker);
        let registry = borrow_global_mut<BountyRegistry>(@code3);

        assert!(table::contains(&registry.bounties, bounty_id), E_NOT_FOUND);

        let bounty = table::borrow_mut(&mut registry.bounties, bounty_id);

        // Check status is Started
        assert!(bounty.status == STATUS_STARTED, E_INVALID_STATE);

        // Check worker is accepted
        let workers_registry = borrow_global<AcceptedWorkers>(@code3);
        assert!(table::contains(&workers_registry.workers_by_bounty, bounty_id), E_UNAUTHORIZED);

        let workers = table::borrow(&workers_registry.workers_by_bounty, bounty_id);
        assert!(vector::contains(workers, &worker_addr), E_UNAUTHORIZED);

        // Calculate pr_digest
        // TODO: Implement proper hash(bounty_id || pr_url || commit_sha)
        // For now, use a placeholder
        let pr_digest = vector::empty<u8>();
        vector::push_back(&mut pr_digest, (bounty_id as u8));

        // Store PR info
        bounty.pr_url = option::some(pr_url);
        bounty.pr_digest = option::some(pr_digest);
        bounty.status = STATUS_PR_SUBMITTED;

        // Emit event
        event::emit(PRSubmitted {
            bounty_id,
            worker: worker_addr,
            pr_url: *option::borrow(&bounty.pr_url),
        });
    }

    /// Mark PR as merged (called by resolver/sponsor)
    public entry fun mark_merged(
        resolver: &signer,
        bounty_id: u64,
        pr_url: String,
        _commit_sha: Option<vector<u8>>,  // TODO: Use for pr_digest verification
    ) acquires BountyRegistry {
        let resolver_addr = signer::address_of(resolver);
        let registry = borrow_global_mut<BountyRegistry>(@code3);

        assert!(table::contains(&registry.bounties, bounty_id), E_NOT_FOUND);

        let bounty = table::borrow_mut(&mut registry.bounties, bounty_id);

        // Check authorization: resolver must be sponsor
        // TODO: Add resolver role support
        assert!(bounty.sponsor == resolver_addr, E_UNAUTHORIZED);

        // Check status is PRSubmitted
        assert!(bounty.status == STATUS_PR_SUBMITTED, E_INVALID_STATE);

        // Verify pr_url matches
        assert!(option::is_some(&bounty.pr_url), E_INVALID_STATE);
        let stored_pr_url = option::borrow(&bounty.pr_url);
        assert!(*stored_pr_url == pr_url, E_DIGEST_MISMATCH);

        // TODO: Verify pr_digest if commit_sha provided

        // If no winner yet (first merge), set winner
        if (option::is_none(&bounty.winner)) {
            // Find worker who submitted this PR
            // For simplicity, we'll set winner to sponsor for now
            // TODO: Track PR submitter properly
            bounty.winner = option::some(resolver_addr);

            let now = timestamp::now_seconds();
            bounty.merged_at = option::some(now);
            bounty.cooling_until = option::some(now + COOLING_PERIOD_SECONDS);
        };

        bounty.status = STATUS_COOLING_DOWN;

        // Emit event
        event::emit(Merged {
            bounty_id,
            pr_url,
            winner: *option::borrow(&bounty.winner),
            merged_at: *option::borrow(&bounty.merged_at),
            cooling_until: *option::borrow(&bounty.cooling_until),
        });
    }

    /// Claim payout after cooling period
    public entry fun claim_payout(
        worker: &signer,
        bounty_id: u64,
    ) acquires BountyRegistry {
        let worker_addr = signer::address_of(worker);
        let registry = borrow_global_mut<BountyRegistry>(@code3);

        assert!(table::contains(&registry.bounties, bounty_id), E_NOT_FOUND);

        let bounty = table::borrow_mut(&mut registry.bounties, bounty_id);

        // Check status is CoolingDown
        assert!(bounty.status == STATUS_COOLING_DOWN, E_INVALID_STATE);

        // Check caller is winner
        assert!(option::is_some(&bounty.winner), E_UNAUTHORIZED);
        assert!(*option::borrow(&bounty.winner) == worker_addr, E_UNAUTHORIZED);

        // Check cooling period has ended
        assert!(option::is_some(&bounty.cooling_until), E_PRECONDITION);
        let cooling_until = *option::borrow(&bounty.cooling_until);
        let now = timestamp::now_seconds();
        assert!(now >= cooling_until, E_COOLING);

        // Transfer tokens to winner
        // TODO: Implement actual transfer from escrow to winner

        bounty.status = STATUS_PAID;

        // Emit event
        event::emit(Paid {
            bounty_id,
            winner: worker_addr,
            amount: bounty.amount,
        });
    }

    /// Cancel bounty (only in Open or Started status)
    public entry fun cancel_bounty(
        sponsor: &signer,
        bounty_id: u64,
    ) acquires BountyRegistry {
        let sponsor_addr = signer::address_of(sponsor);
        let registry = borrow_global_mut<BountyRegistry>(@code3);

        assert!(table::contains(&registry.bounties, bounty_id), E_NOT_FOUND);

        let bounty = table::borrow_mut(&mut registry.bounties, bounty_id);

        // Check authorization
        assert!(bounty.sponsor == sponsor_addr, E_UNAUTHORIZED);

        // Check status allows cancellation
        assert!(
            bounty.status == STATUS_OPEN || bounty.status == STATUS_STARTED,
            E_INVALID_STATE
        );

        // Refund tokens to sponsor
        // TODO: Implement actual refund from escrow

        bounty.status = STATUS_CANCELLED;

        // Emit event
        event::emit(Cancelled {
            bounty_id,
        });
    }

    // ============================================
    // View Functions
    // ============================================

    #[view]
    public fun get_bounty_status(bounty_id: u64): u8 acquires BountyRegistry {
        let registry = borrow_global<BountyRegistry>(@code3);
        assert!(table::contains(&registry.bounties, bounty_id), E_NOT_FOUND);
        let bounty = table::borrow(&registry.bounties, bounty_id);
        bounty.status
    }

    #[view]
    public fun get_bounty_by_issue_hash(issue_hash: vector<u8>): u64 acquires BountyRegistry {
        let registry = borrow_global<BountyRegistry>(@code3);
        assert!(table::contains(&registry.issue_hash_to_id, issue_hash), E_NOT_FOUND);
        *table::borrow(&registry.issue_hash_to_id, issue_hash)
    }
}
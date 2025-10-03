/// # Code3 Bounty Contract
///
/// This module implements a decentralized bounty system for GitHub issues.
/// Workers can accept bounties, submit PRs, and claim payouts after a 7-day cooling period.
///
/// ## Status Machine
/// Open -> Started -> PRSubmitted -> Merged -> CoolingDown -> Paid
///                                                         -> Cancelled
///
/// ## Key Features
/// - 7-day cooling period after PR merge
/// - Support for Fungible Assets (USDT)
/// - Event-driven architecture for indexing
/// - Idempotency keys (issue_hash, bounty_id + worker, pr_url)
module code3::bounty {
    use std::signer;
    use std::string::String;
    use std::option::{Self, Option};
    use std::vector;
    use aptos_std::smart_table::{Self, SmartTable};
    use aptos_framework::object::Object;
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account::{Self, SignerCapability};

    // ============ Status Constants ============

    const STATUS_OPEN: u8 = 0;
    const STATUS_STARTED: u8 = 1;
    const STATUS_PR_SUBMITTED: u8 = 2;
    const STATUS_MERGED: u8 = 3;
    const STATUS_COOLING_DOWN: u8 = 4;
    const STATUS_PAID: u8 = 5;
    const STATUS_CANCELLED: u8 = 6;

    // ============ Business Constants ============

    /// 7 days cooling period in seconds
    const COOLING_PERIOD_SECONDS: u64 = 604800;

    /// Maximum bounty amount (1M USDT, 6 decimals)
    const MAX_BOUNTY_AMOUNT: u64 = 1000000000000;

    /// Minimum bounty amount
    const MIN_BOUNTY_AMOUNT: u64 = 1;

    // ============ Error Codes ============

    const E_BOUNTY_NOT_FOUND: u64 = 1;
    const E_INVALID_STATUS: u64 = 2;
    const E_NOT_SPONSOR: u64 = 3;
    const E_NOT_WINNER: u64 = 4;
    const E_COOLING_PERIOD_NOT_ENDED: u64 = 5;
    const E_INSUFFICIENT_BALANCE: u64 = 6;
    const E_ALREADY_ACCEPTED: u64 = 7;
    const E_INVALID_ASSET: u64 = 8;
    const E_DUPLICATE_PR: u64 = 9;

    // ============ Data Structures ============

    /// Bounty data structure
    struct Bounty has store {
        id: u64,
        sponsor: address,
        winner: Option<address>,
        repo_url: String,
        issue_hash: vector<u8>,
        pr_url: Option<String>,
        pr_digest: Option<vector<u8>>,
        asset: Object<Metadata>,
        amount: u64,
        status: u8,
        merged_at: Option<u64>,
        cooling_until: Option<u64>,
        created_at: u64,
    }

    /// Global bounty store resource
    struct BountyStore has key {
        bounties: SmartTable<u64, Bounty>,
        next_bounty_id: u64,
        vault_signer_cap: SignerCapability,  // SignerCapability to access vault account
        bounty_created_events: EventHandle<BountyCreatedEvent>,
        bounty_accepted_events: EventHandle<BountyAcceptedEvent>,
        pr_submitted_events: EventHandle<PRSubmittedEvent>,
        bounty_merged_events: EventHandle<BountyMergedEvent>,
        bounty_paid_events: EventHandle<BountyPaidEvent>,
        bounty_cancelled_events: EventHandle<BountyCancelledEvent>,
    }

    // ============ Event Structures ============

    struct BountyCreatedEvent has drop, store {
        bounty_id: u64,
        sponsor: address,
        repo_url: String,
        issue_hash: vector<u8>,
        amount: u64,
        asset: Object<Metadata>,
    }

    struct BountyAcceptedEvent has drop, store {
        bounty_id: u64,
        winner: address,
    }

    struct PRSubmittedEvent has drop, store {
        bounty_id: u64,
        pr_url: String,
    }

    struct BountyMergedEvent has drop, store {
        bounty_id: u64,
        merged_at: u64,
        cooling_until: u64,
    }

    struct BountyPaidEvent has drop, store {
        bounty_id: u64,
        winner: address,
        amount: u64,
    }

    struct BountyCancelledEvent has drop, store {
        bounty_id: u64,
        sponsor: address,
    }

    // ============ Module Initialization ============

    /// Initialize the bounty store (called once on module publish)
    fun init_module(deployer: &signer) {
        // Create a resource account for holding funds
        let (_vault_signer, vault_signer_cap) = account::create_resource_account(deployer, b"bounty_vault");

        move_to(deployer, BountyStore {
            bounties: smart_table::new(),
            next_bounty_id: 1,
            vault_signer_cap,
            bounty_created_events: account::new_event_handle<BountyCreatedEvent>(deployer),
            bounty_accepted_events: account::new_event_handle<BountyAcceptedEvent>(deployer),
            pr_submitted_events: account::new_event_handle<PRSubmittedEvent>(deployer),
            bounty_merged_events: account::new_event_handle<BountyMergedEvent>(deployer),
            bounty_paid_events: account::new_event_handle<BountyPaidEvent>(deployer),
            bounty_cancelled_events: account::new_event_handle<BountyCancelledEvent>(deployer),
        });
    }

    // ============ Entry Functions ============

    /// Create a new bounty
    ///
    /// # Parameters
    /// - sponsor: The account creating the bounty
    /// - repo_url: GitHub repository URL
    /// - issue_hash: SHA256 hash of (repo_url + issue_number)
    /// - asset: Fungible Asset metadata object
    /// - amount: Bounty amount in asset's decimals
    public entry fun create_bounty(
        sponsor: &signer,
        repo_url: String,
        issue_hash: vector<u8>,
        asset: Object<Metadata>,
        amount: u64
    ) acquires BountyStore {
        // Validate amount
        assert!(amount >= MIN_BOUNTY_AMOUNT && amount <= MAX_BOUNTY_AMOUNT, E_INVALID_ASSET);

        let sponsor_addr = signer::address_of(sponsor);

        // Get bounty store
        let store = borrow_global_mut<BountyStore>(@code3);

        // Get vault signer to receive funds
        let vault_signer = account::create_signer_with_capability(&store.vault_signer_cap);
        let vault_addr = signer::address_of(&vault_signer);

        // Transfer fungible asset from sponsor to vault
        primary_fungible_store::transfer(sponsor, asset, vault_addr, amount);

        let bounty_id = store.next_bounty_id;
        store.next_bounty_id = bounty_id + 1;

        // Create bounty
        let bounty = Bounty {
            id: bounty_id,
            sponsor: sponsor_addr,
            winner: option::none(),
            repo_url: copy repo_url,
            issue_hash: copy issue_hash,
            pr_url: option::none(),
            pr_digest: option::none(),
            asset,
            amount,
            status: STATUS_OPEN,
            merged_at: option::none(),
            cooling_until: option::none(),
            created_at: timestamp::now_seconds(),
        };

        // Store bounty
        smart_table::add(&mut store.bounties, bounty_id, bounty);

        // Emit event
        event::emit_event(&mut store.bounty_created_events, BountyCreatedEvent {
            bounty_id,
            sponsor: sponsor_addr,
            repo_url,
            issue_hash,
            amount,
            asset,
        });
    }

    /// Accept a bounty (worker becomes the winner)
    ///
    /// # Parameters
    /// - worker: The account accepting the bounty
    /// - bounty_id: ID of the bounty to accept
    public entry fun accept_bounty(
        worker: &signer,
        bounty_id: u64
    ) acquires BountyStore {
        let worker_addr = signer::address_of(worker);
        let store = borrow_global_mut<BountyStore>(@code3);

        // Get bounty
        assert!(smart_table::contains(&store.bounties, bounty_id), E_BOUNTY_NOT_FOUND);
        let bounty = smart_table::borrow_mut(&mut store.bounties, bounty_id);

        // Validate status
        assert!(bounty.status == STATUS_OPEN, E_INVALID_STATUS);

        // Validate not already accepted
        assert!(option::is_none(&bounty.winner), E_ALREADY_ACCEPTED);

        // Update bounty
        bounty.winner = option::some(worker_addr);
        bounty.status = STATUS_STARTED;

        // Emit event
        event::emit_event(&mut store.bounty_accepted_events, BountyAcceptedEvent {
            bounty_id,
            winner: worker_addr,
        });
    }

    /// Submit PR for a bounty
    ///
    /// # Parameters
    /// - worker: The worker submitting the PR (must be the winner)
    /// - bounty_id: ID of the bounty
    /// - pr_url: GitHub PR URL
    /// - pr_digest: SHA256 digest of PR content
    public entry fun submit_pr(
        worker: &signer,
        bounty_id: u64,
        pr_url: String,
        pr_digest: vector<u8>
    ) acquires BountyStore {
        let worker_addr = signer::address_of(worker);
        let store = borrow_global_mut<BountyStore>(@code3);

        // Get bounty
        assert!(smart_table::contains(&store.bounties, bounty_id), E_BOUNTY_NOT_FOUND);
        let bounty = smart_table::borrow_mut(&mut store.bounties, bounty_id);

        // Validate status
        assert!(bounty.status == STATUS_STARTED, E_INVALID_STATUS);

        // Validate worker is the winner
        assert!(option::contains(&bounty.winner, &worker_addr), E_NOT_WINNER);

        // Validate PR URL is unique (not already submitted)
        assert!(option::is_none(&bounty.pr_url), E_DUPLICATE_PR);

        // Update bounty
        bounty.pr_url = option::some(copy pr_url);
        bounty.pr_digest = option::some(pr_digest);
        bounty.status = STATUS_PR_SUBMITTED;

        // Emit event
        event::emit_event(&mut store.pr_submitted_events, PRSubmittedEvent {
            bounty_id,
            pr_url,
        });
    }

    /// Mark PR as merged (starts cooling period)
    ///
    /// # Parameters
    /// - resolver: The resolver account (can be sponsor or authorized resolver)
    /// - bounty_id: ID of the bounty
    /// - pr_url: GitHub PR URL (must match submitted PR)
    public entry fun mark_merged(
        resolver: &signer,
        bounty_id: u64,
        pr_url: String
    ) acquires BountyStore {
        let resolver_addr = signer::address_of(resolver);
        let store = borrow_global_mut<BountyStore>(@code3);

        // Get bounty
        assert!(smart_table::contains(&store.bounties, bounty_id), E_BOUNTY_NOT_FOUND);
        let bounty = smart_table::borrow_mut(&mut store.bounties, bounty_id);

        // Validate status
        assert!(bounty.status == STATUS_PR_SUBMITTED, E_INVALID_STATUS);

        // Validate resolver is sponsor (or authorized resolver - TODO: add resolver whitelist)
        assert!(bounty.sponsor == resolver_addr, E_NOT_SPONSOR);

        // Validate PR URL matches
        assert!(option::contains(&bounty.pr_url, &pr_url), E_DUPLICATE_PR);

        // Calculate cooling period
        let now = timestamp::now_seconds();
        let cooling_until = now + COOLING_PERIOD_SECONDS;

        // Update bounty
        bounty.merged_at = option::some(now);
        bounty.cooling_until = option::some(cooling_until);
        bounty.status = STATUS_COOLING_DOWN;

        // Emit event
        event::emit_event(&mut store.bounty_merged_events, BountyMergedEvent {
            bounty_id,
            merged_at: now,
            cooling_until,
        });
    }

    /// Claim payout after cooling period
    ///
    /// # Parameters
    /// - winner: The worker claiming the payout (must be the winner)
    /// - bounty_id: ID of the bounty
    public entry fun claim_payout(
        winner: &signer,
        bounty_id: u64
    ) acquires BountyStore {
        let winner_addr = signer::address_of(winner);
        let store = borrow_global_mut<BountyStore>(@code3);

        // Get bounty
        assert!(smart_table::contains(&store.bounties, bounty_id), E_BOUNTY_NOT_FOUND);
        let bounty = smart_table::borrow_mut(&mut store.bounties, bounty_id);

        // Validate status
        assert!(bounty.status == STATUS_COOLING_DOWN, E_INVALID_STATUS);

        // Validate winner
        assert!(option::contains(&bounty.winner, &winner_addr), E_NOT_WINNER);

        // Validate cooling period has ended
        let now = timestamp::now_seconds();
        let cooling_until = *option::borrow(&bounty.cooling_until);
        assert!(now >= cooling_until, E_COOLING_PERIOD_NOT_ENDED);

        // Get vault signer to transfer funds
        let vault_signer = account::create_signer_with_capability(&store.vault_signer_cap);

        // Transfer funds from vault to winner
        primary_fungible_store::transfer(&vault_signer, bounty.asset, winner_addr, bounty.amount);

        // Update status
        bounty.status = STATUS_PAID;

        // Emit event
        event::emit_event(&mut store.bounty_paid_events, BountyPaidEvent {
            bounty_id,
            winner: winner_addr,
            amount: bounty.amount,
        });
    }

    /// Cancel bounty and refund sponsor
    ///
    /// # Parameters
    /// - sponsor: The sponsor account (must be the original sponsor)
    /// - bounty_id: ID of the bounty to cancel
    public entry fun cancel_bounty(
        sponsor: &signer,
        bounty_id: u64
    ) acquires BountyStore {
        let sponsor_addr = signer::address_of(sponsor);
        let store = borrow_global_mut<BountyStore>(@code3);

        // Get bounty
        assert!(smart_table::contains(&store.bounties, bounty_id), E_BOUNTY_NOT_FOUND);
        let bounty = smart_table::borrow_mut(&mut store.bounties, bounty_id);

        // Validate sponsor
        assert!(bounty.sponsor == sponsor_addr, E_NOT_SPONSOR);

        // Validate status (can only cancel from Open, Started, or PRSubmitted)
        assert!(
            bounty.status == STATUS_OPEN ||
            bounty.status == STATUS_STARTED ||
            bounty.status == STATUS_PR_SUBMITTED,
            E_INVALID_STATUS
        );

        // Get vault signer to refund funds
        let vault_signer = account::create_signer_with_capability(&store.vault_signer_cap);

        // Refund funds from vault to sponsor
        primary_fungible_store::transfer(&vault_signer, bounty.asset, sponsor_addr, bounty.amount);

        // Update status
        bounty.status = STATUS_CANCELLED;

        // Emit event
        event::emit_event(&mut store.bounty_cancelled_events, BountyCancelledEvent {
            bounty_id,
            sponsor: sponsor_addr,
        });
    }

    // ============ View Functions ============

    #[view]
    public fun get_bounty(bounty_id: u64): (
        u64, // id
        address, // sponsor
        Option<address>, // winner
        String, // repo_url
        vector<u8>, // issue_hash
        Option<String>, // pr_url
        Object<Metadata>, // asset
        u64, // amount
        u8, // status
        Option<u64>, // merged_at
        Option<u64>, // cooling_until
        u64 // created_at
    ) acquires BountyStore {
        let store = borrow_global<BountyStore>(@code3);
        assert!(smart_table::contains(&store.bounties, bounty_id), E_BOUNTY_NOT_FOUND);

        let bounty = smart_table::borrow(&store.bounties, bounty_id);
        (
            bounty.id,
            bounty.sponsor,
            bounty.winner,
            bounty.repo_url,
            bounty.issue_hash,
            bounty.pr_url,
            bounty.asset,
            bounty.amount,
            bounty.status,
            bounty.merged_at,
            bounty.cooling_until,
            bounty.created_at
        )
    }

    #[view]
    public fun get_next_bounty_id(): u64 acquires BountyStore {
        let store = borrow_global<BountyStore>(@code3);
        store.next_bounty_id
    }

    /// Get bounty by issue_hash (for idempotency check)
    ///
    /// Returns bounty ID if found, or 0 if not found
    /// (Move doesn't support Option return in view functions easily, so we use 0 as sentinel)
    #[view]
    public fun get_bounty_by_issue_hash(issue_hash: vector<u8>): u64 acquires BountyStore {
        let store = borrow_global<BountyStore>(@code3);
        let bounty_id = 1u64;
        let next_id = store.next_bounty_id;

        // Iterate through all bounties
        while (bounty_id < next_id) {
            if (smart_table::contains(&store.bounties, bounty_id)) {
                let bounty = smart_table::borrow(&store.bounties, bounty_id);
                if (bounty.issue_hash == issue_hash) {
                    return bounty_id
                };
            };
            bounty_id = bounty_id + 1;
        };

        // Not found
        0
    }

    /// List all bounties (returns bounty IDs)
    ///
    /// Note: This returns IDs only to avoid large return payloads.
    /// Clients should call get_bounty(id) for each ID to get details.
    #[view]
    public fun list_bounties(): vector<u64> acquires BountyStore {
        let store = borrow_global<BountyStore>(@code3);
        let result = vector::empty<u64>();
        let bounty_id = 1u64;
        let next_id = store.next_bounty_id;

        // Collect all existing bounty IDs
        while (bounty_id < next_id) {
            if (smart_table::contains(&store.bounties, bounty_id)) {
                vector::push_back(&mut result, bounty_id);
            };
            bounty_id = bounty_id + 1;
        };

        result
    }

    /// Get bounties by sponsor (returns bounty IDs)
    #[view]
    public fun get_bounties_by_sponsor(sponsor: address): vector<u64> acquires BountyStore {
        let store = borrow_global<BountyStore>(@code3);
        let result = vector::empty<u64>();
        let bounty_id = 1u64;
        let next_id = store.next_bounty_id;

        // Filter bounties by sponsor
        while (bounty_id < next_id) {
            if (smart_table::contains(&store.bounties, bounty_id)) {
                let bounty = smart_table::borrow(&store.bounties, bounty_id);
                if (bounty.sponsor == sponsor) {
                    vector::push_back(&mut result, bounty_id);
                };
            };
            bounty_id = bounty_id + 1;
        };

        result
    }

    /// Get bounties by winner (returns bounty IDs)
    #[view]
    public fun get_bounties_by_winner(winner: address): vector<u64> acquires BountyStore {
        let store = borrow_global<BountyStore>(@code3);
        let result = vector::empty<u64>();
        let bounty_id = 1u64;
        let next_id = store.next_bounty_id;

        // Filter bounties by winner
        while (bounty_id < next_id) {
            if (smart_table::contains(&store.bounties, bounty_id)) {
                let bounty = smart_table::borrow(&store.bounties, bounty_id);
                // Check if winner is set and matches
                if (option::is_some(&bounty.winner)) {
                    let bounty_winner = *option::borrow(&bounty.winner);
                    if (bounty_winner == winner) {
                        vector::push_back(&mut result, bounty_id);
                    };
                };
            };
            bounty_id = bounty_id + 1;
        };

        result
    }
}

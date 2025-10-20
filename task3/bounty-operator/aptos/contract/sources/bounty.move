module code3::bounty {
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::table::{Self, Table};

    /// Bounty status constants
    const STATUS_OPEN: u8 = 0;
    const STATUS_ACCEPTED: u8 = 1;
    const STATUS_SUBMITTED: u8 = 2;
    const STATUS_CONFIRMED: u8 = 3;
    const STATUS_CLAIMED: u8 = 4;
    const STATUS_CANCELLED: u8 = 5;

    /// Error codes
    const E_BOUNTY_NOT_FOUND: u64 = 1;
    const E_INVALID_STATUS: u64 = 2;
    const E_NOT_SPONSOR: u64 = 3;
    const E_NOT_WORKER: u64 = 4;
    const E_BOUNTY_ALREADY_EXISTS: u64 = 6;
    const E_INVALID_AMOUNT: u64 = 7;

    /// Bounty struct
    struct Bounty has store, drop, copy {
        bounty_id: u64,
        task_id: String,
        task_hash: vector<u8>,
        sponsor: address,
        worker: address,
        amount: u64,
        asset: String,
        status: u8,
        created_at: u64,
        accepted_at: u64,
        submitted_at: u64,
        confirmed_at: u64,
        claimed_at: u64,
    }

    /// Global bounty registry
    struct BountyRegistry has key {
        bounties: Table<u64, Bounty>,
        next_bounty_id: u64,
        task_hash_to_bounty_id: Table<vector<u8>, u64>,
        sponsor_bounties: Table<address, vector<u64>>,
        worker_bounties: Table<address, vector<u64>>,
    }

    /// Bounty escrow (holds APT tokens)
    struct BountyEscrow<phantom CoinType> has key {
        coins: Table<u64, Coin<CoinType>>,
    }

    /// Initialize the bounty system (called once by deployer)
    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);

        if (!exists<BountyRegistry>(addr)) {
            move_to(account, BountyRegistry {
                bounties: table::new(),
                next_bounty_id: 1,
                task_hash_to_bounty_id: table::new(),
                sponsor_bounties: table::new(),
                worker_bounties: table::new(),
            });
        };

        if (!exists<BountyEscrow<AptosCoin>>(addr)) {
            move_to(account, BountyEscrow<AptosCoin> {
                coins: table::new(),
            });
        };
    }

    /// Create a new bounty
    public entry fun create_bounty(
        sponsor: &signer,
        task_id: String,
        task_hash: vector<u8>,
        amount: u64,
        asset: String,
    ) acquires BountyRegistry, BountyEscrow {
        let sponsor_addr = signer::address_of(sponsor);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let registry = borrow_global_mut<BountyRegistry>(@code3);

        // Check idempotency: bounty with same task_hash should not exist
        assert!(
            !table::contains(&registry.task_hash_to_bounty_id, task_hash),
            E_BOUNTY_ALREADY_EXISTS
        );

        let bounty_id = registry.next_bounty_id;
        registry.next_bounty_id = bounty_id + 1;

        // Create bounty
        let bounty = Bounty {
            bounty_id,
            task_id,
            task_hash: copy task_hash,
            sponsor: sponsor_addr,
            worker: @0x0,
            amount,
            asset,
            status: STATUS_OPEN,
            created_at: timestamp::now_seconds(),
            accepted_at: 0,
            submitted_at: 0,
            confirmed_at: 0,
            claimed_at: 0,
        };

        table::add(&mut registry.bounties, bounty_id, bounty);
        table::add(&mut registry.task_hash_to_bounty_id, task_hash, bounty_id);

        // Track sponsor bounties
        if (!table::contains(&registry.sponsor_bounties, sponsor_addr)) {
            table::add(&mut registry.sponsor_bounties, sponsor_addr, vector::empty<u64>());
        };
        let sponsor_list = table::borrow_mut(&mut registry.sponsor_bounties, sponsor_addr);
        vector::push_back(sponsor_list, bounty_id);

        // Escrow funds
        let coins = coin::withdraw<AptosCoin>(sponsor, amount);
        let escrow = borrow_global_mut<BountyEscrow<AptosCoin>>(@code3);
        table::add(&mut escrow.coins, bounty_id, coins);
    }

    /// Accept a bounty (worker accepts the task)
    public entry fun accept_bounty(
        worker: &signer,
        bounty_id: u64,
    ) acquires BountyRegistry {
        let worker_addr = signer::address_of(worker);
        let registry = borrow_global_mut<BountyRegistry>(@code3);

        assert!(table::contains(&registry.bounties, bounty_id), E_BOUNTY_NOT_FOUND);
        let bounty = table::borrow_mut(&mut registry.bounties, bounty_id);

        assert!(bounty.status == STATUS_OPEN, E_INVALID_STATUS);

        bounty.worker = worker_addr;
        bounty.status = STATUS_ACCEPTED;
        bounty.accepted_at = timestamp::now_seconds();

        // Track worker bounties
        if (!table::contains(&registry.worker_bounties, worker_addr)) {
            table::add(&mut registry.worker_bounties, worker_addr, vector::empty<u64>());
        };
        let worker_list = table::borrow_mut(&mut registry.worker_bounties, worker_addr);
        vector::push_back(worker_list, bounty_id);
    }

    /// Submit work (worker submits the result)
    public entry fun submit_bounty(
        worker: &signer,
        bounty_id: u64,
        _submission_hash: vector<u8>, // For future verification
    ) acquires BountyRegistry {
        let worker_addr = signer::address_of(worker);
        let registry = borrow_global_mut<BountyRegistry>(@code3);

        assert!(table::contains(&registry.bounties, bounty_id), E_BOUNTY_NOT_FOUND);
        let bounty = table::borrow_mut(&mut registry.bounties, bounty_id);

        assert!(bounty.status == STATUS_ACCEPTED, E_INVALID_STATUS);
        assert!(bounty.worker == worker_addr, E_NOT_WORKER);

        bounty.status = STATUS_SUBMITTED;
        bounty.submitted_at = timestamp::now_seconds();
    }

    /// Confirm work (requester confirms the submission)
    public entry fun confirm_bounty(
        sponsor: &signer,
        bounty_id: u64,
        confirmed_at: u64,
    ) acquires BountyRegistry {
        let sponsor_addr = signer::address_of(sponsor);
        let registry = borrow_global_mut<BountyRegistry>(@code3);

        assert!(table::contains(&registry.bounties, bounty_id), E_BOUNTY_NOT_FOUND);
        let bounty = table::borrow_mut(&mut registry.bounties, bounty_id);

        assert!(bounty.status == STATUS_SUBMITTED, E_INVALID_STATUS);
        assert!(bounty.sponsor == sponsor_addr, E_NOT_SPONSOR);

        bounty.status = STATUS_CONFIRMED;
        bounty.confirmed_at = confirmed_at;
    }

    /// Claim payout (worker claims the reward)
    public entry fun claim_payout(
        worker: &signer,
        bounty_id: u64,
    ) acquires BountyRegistry, BountyEscrow {
        let worker_addr = signer::address_of(worker);
        let registry = borrow_global_mut<BountyRegistry>(@code3);

        assert!(table::contains(&registry.bounties, bounty_id), E_BOUNTY_NOT_FOUND);
        let bounty = table::borrow_mut(&mut registry.bounties, bounty_id);

        assert!(bounty.status == STATUS_CONFIRMED, E_INVALID_STATUS);
        assert!(bounty.worker == worker_addr, E_NOT_WORKER);

        bounty.status = STATUS_CLAIMED;
        bounty.claimed_at = timestamp::now_seconds();

        // Transfer funds from escrow to worker
        let escrow = borrow_global_mut<BountyEscrow<AptosCoin>>(@code3);
        let coins = table::remove(&mut escrow.coins, bounty_id);
        coin::deposit(worker_addr, coins);
    }

    /// Cancel bounty (only sponsor, only when status is Open)
    public entry fun cancel_bounty(
        sponsor: &signer,
        bounty_id: u64,
    ) acquires BountyRegistry, BountyEscrow {
        let sponsor_addr = signer::address_of(sponsor);
        let registry = borrow_global_mut<BountyRegistry>(@code3);

        assert!(table::contains(&registry.bounties, bounty_id), E_BOUNTY_NOT_FOUND);
        let bounty = table::borrow_mut(&mut registry.bounties, bounty_id);

        assert!(bounty.status == STATUS_OPEN, E_INVALID_STATUS);
        assert!(bounty.sponsor == sponsor_addr, E_NOT_SPONSOR);

        bounty.status = STATUS_CANCELLED;

        // Refund funds to sponsor
        let escrow = borrow_global_mut<BountyEscrow<AptosCoin>>(@code3);
        let coins = table::remove(&mut escrow.coins, bounty_id);
        coin::deposit(sponsor_addr, coins);
    }

    // ========== View Functions ==========

    #[view]
    public fun get_bounty(bounty_id: u64): Bounty acquires BountyRegistry {
        let registry = borrow_global<BountyRegistry>(@code3);
        assert!(table::contains(&registry.bounties, bounty_id), E_BOUNTY_NOT_FOUND);
        *table::borrow(&registry.bounties, bounty_id)
    }

    #[view]
    public fun get_bounty_by_task_hash(task_hash: vector<u8>): u64 acquires BountyRegistry {
        let registry = borrow_global<BountyRegistry>(@code3);
        if (table::contains(&registry.task_hash_to_bounty_id, task_hash)) {
            *table::borrow(&registry.task_hash_to_bounty_id, task_hash)
        } else {
            0 // Return 0 if not found
        }
    }

    #[view]
    public fun get_next_bounty_id(): u64 acquires BountyRegistry {
        let registry = borrow_global<BountyRegistry>(@code3);
        registry.next_bounty_id
    }

    #[view]
    public fun get_bounties_by_sponsor(sponsor: address): vector<u64> acquires BountyRegistry {
        let registry = borrow_global<BountyRegistry>(@code3);
        if (table::contains(&registry.sponsor_bounties, sponsor)) {
            *table::borrow(&registry.sponsor_bounties, sponsor)
        } else {
            vector::empty<u64>()
        }
    }

    #[view]
    public fun get_bounties_by_worker(worker: address): vector<u64> acquires BountyRegistry {
        let registry = borrow_global<BountyRegistry>(@code3);
        if (table::contains(&registry.worker_bounties, worker)) {
            *table::borrow(&registry.worker_bounties, worker)
        } else {
            vector::empty<u64>()
        }
    }
}

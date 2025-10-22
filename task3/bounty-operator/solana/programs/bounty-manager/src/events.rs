use anchor_lang::prelude::*;

/// Emitted when a new bounty is created
#[event]
pub struct BountyCreatedEvent {
    pub bounty_id: u64,
    pub task_id: String,
    pub task_url: String,
    pub task_hash: [u8; 32],
    pub sponsor: Pubkey,
    pub amount: u64,
    pub asset: Pubkey,
    pub timestamp: i64,
}

/// Emitted when a worker accepts a bounty
#[event]
pub struct BountyAcceptedEvent {
    pub bounty_id: u64,
    pub worker: Pubkey,
    pub accepted_at: i64,
}

/// Emitted when a worker submits work
#[event]
pub struct BountySubmittedEvent {
    pub bounty_id: u64,
    pub submission_url: String,
    pub submitted_at: i64,
}

/// Emitted when sponsor confirms work
#[event]
pub struct BountyConfirmedEvent {
    pub bounty_id: u64,
    pub confirmed_at: i64,
}

/// Emitted when worker claims payment
#[event]
pub struct BountyClaimedEvent {
    pub bounty_id: u64,
    pub worker: Pubkey,
    pub amount: u64,
    pub claimed_at: i64,
}

/// Emitted when a bounty is cancelled
#[event]
pub struct BountyCancelledEvent {
    pub bounty_id: u64,
    pub sponsor: Pubkey,
    pub cancelled_at: i64,
}

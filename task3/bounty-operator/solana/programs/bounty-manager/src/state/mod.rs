use anchor_lang::prelude::*;

/// Global state for bounty management
#[account]
pub struct BountyManager {
    /// Authority who can manage the bounty system
    pub authority: Pubkey,
    /// Counter for generating unique bounty IDs
    pub next_bounty_id: u64,
    /// PDA bump seed
    pub bump: u8,
}

impl BountyManager {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority (Pubkey)
        8 +  // next_bounty_id (u64)
        1;   // bump (u8)
}

/// Individual bounty data
#[account]
pub struct Bounty {
    /// Unique bounty ID
    pub bounty_id: u64,
    /// Task identifier (max 200 bytes)
    pub task_id: String,
    /// Task URL (max 500 bytes)
    pub task_url: String,
    /// Keccak256 hash of task description
    pub task_hash: [u8; 32],
    /// Sponsor (requester) address
    pub sponsor: Pubkey,
    /// Worker address (system program initially)
    pub worker: Pubkey,
    /// Bounty amount in lamports (SOL) or token amount
    pub amount: u64,
    /// Asset type: system program for native SOL, or mint address for SPL token
    pub asset: Pubkey,
    /// Current bounty status
    pub status: BountyStatus,
    /// Creation timestamp
    pub created_at: i64,
    /// Acceptance timestamp
    pub accepted_at: i64,
    /// Submission timestamp
    pub submitted_at: i64,
    /// Submission URL (max 500 bytes)
    pub submission_url: String,
    /// Confirmation timestamp
    pub confirmed_at: i64,
    /// Claim timestamp
    pub claimed_at: i64,
    /// PDA bump seed
    pub bump: u8,
}

impl Bounty {
    pub const MAX_TASK_ID_LEN: usize = 200;
    pub const MAX_TASK_URL_LEN: usize = 500;
    pub const MAX_SUBMISSION_URL_LEN: usize = 500;

    pub const LEN: usize = 8 + // discriminator
        8 +  // bounty_id (u64)
        4 + Self::MAX_TASK_ID_LEN + // task_id (String)
        4 + Self::MAX_TASK_URL_LEN + // task_url (String)
        32 + // task_hash ([u8; 32])
        32 + // sponsor (Pubkey)
        32 + // worker (Pubkey)
        8 +  // amount (u64)
        32 + // asset (Pubkey)
        1 +  // status (BountyStatus enum)
        8 +  // created_at (i64)
        8 +  // accepted_at (i64)
        8 +  // submitted_at (i64)
        4 + Self::MAX_SUBMISSION_URL_LEN + // submission_url (String)
        8 +  // confirmed_at (i64)
        8 +  // claimed_at (i64)
        1;   // bump (u8)
}

/// Bounty status enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum BountyStatus {
    /// Bounty created, waiting for worker
    Open,
    /// Worker accepted the bounty
    Accepted,
    /// Worker submitted work
    Submitted,
    /// Sponsor confirmed work
    Confirmed,
    /// Worker claimed payment
    Claimed,
    /// Bounty cancelled
    Cancelled,
}

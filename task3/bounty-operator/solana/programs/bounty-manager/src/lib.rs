pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("5bjKDPsreaQrZ2dNoyDbHsUwqJukmDMi5qQheYHVFzD4");

#[program]
pub mod bounty_manager {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }

    pub fn create_bounty(
        ctx: Context<CreateBounty>,
        task_id: String,
        task_url: String,
        task_hash: [u8; 32],
        amount: u64,
    ) -> Result<()> {
        create_bounty::handler(ctx, task_id, task_url, task_hash, amount)
    }

    pub fn accept_bounty(
        ctx: Context<AcceptBounty>,
        worker: Pubkey,
    ) -> Result<()> {
        accept_bounty::handler(ctx, worker)
    }

    pub fn submit_bounty(
        ctx: Context<SubmitBounty>,
        submission_url: String,
    ) -> Result<()> {
        submit_bounty::handler(ctx, submission_url)
    }

    pub fn confirm_bounty(ctx: Context<ConfirmBounty>) -> Result<()> {
        confirm_bounty::handler(ctx)
    }

    pub fn claim_bounty(ctx: Context<ClaimBounty>) -> Result<()> {
        claim_bounty::handler(ctx)
    }
}

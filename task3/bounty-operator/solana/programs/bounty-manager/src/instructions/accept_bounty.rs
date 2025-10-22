use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;
use crate::error::BountyError;
use crate::constants::*;

#[derive(Accounts)]
pub struct AcceptBounty<'info> {
    #[account(
        seeds = [BOUNTY_MANAGER_SEED],
        bump = bounty_manager.bump
    )]
    pub bounty_manager: Account<'info, BountyManager>,

    #[account(
        mut,
        seeds = [BOUNTY_SEED, bounty.bounty_id.to_le_bytes().as_ref()],
        bump = bounty.bump,
        constraint = bounty.status == BountyStatus::Open @ BountyError::InvalidBountyStatus,
        constraint = bounty.sponsor == sponsor.key() @ BountyError::UnauthorizedSponsor
    )]
    pub bounty: Account<'info, Bounty>,

    pub sponsor: Signer<'info>,
}

pub fn handler(
    ctx: Context<AcceptBounty>,
    worker: Pubkey,
) -> Result<()> {
    let bounty = &mut ctx.accounts.bounty;
    let clock = Clock::get()?;

    // Update bounty state
    bounty.worker = worker;
    bounty.status = BountyStatus::Accepted;
    bounty.accepted_at = clock.unix_timestamp;

    // Emit event
    emit!(BountyAcceptedEvent {
        bounty_id: bounty.bounty_id,
        worker,
        accepted_at: bounty.accepted_at,
    });

    msg!("Bounty {} accepted by worker {}", bounty.bounty_id, worker);
    Ok(())
}

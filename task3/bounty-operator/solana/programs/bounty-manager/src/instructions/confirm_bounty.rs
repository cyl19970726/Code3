use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;
use crate::error::BountyError;
use crate::constants::*;

#[derive(Accounts)]
pub struct ConfirmBounty<'info> {
    #[account(
        seeds = [BOUNTY_MANAGER_SEED],
        bump = bounty_manager.bump
    )]
    pub bounty_manager: Account<'info, BountyManager>,

    #[account(
        mut,
        seeds = [BOUNTY_SEED, bounty.bounty_id.to_le_bytes().as_ref()],
        bump = bounty.bump,
        constraint = bounty.status == BountyStatus::Submitted @ BountyError::InvalidBountyStatus,
        constraint = bounty.sponsor == sponsor.key() @ BountyError::UnauthorizedSponsor
    )]
    pub bounty: Account<'info, Bounty>,

    pub sponsor: Signer<'info>,
}

pub fn handler(ctx: Context<ConfirmBounty>) -> Result<()> {
    let bounty = &mut ctx.accounts.bounty;
    let clock = Clock::get()?;

    // Update bounty state
    bounty.status = BountyStatus::Confirmed;
    bounty.confirmed_at = clock.unix_timestamp;

    // Emit event
    emit!(BountyConfirmedEvent {
        bounty_id: bounty.bounty_id,
        confirmed_at: bounty.confirmed_at,
    });

    msg!("Bounty {} confirmed by sponsor", bounty.bounty_id);
    Ok(())
}

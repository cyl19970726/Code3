use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;
use crate::error::BountyError;
use crate::constants::*;

#[derive(Accounts)]
pub struct SubmitBounty<'info> {
    #[account(
        seeds = [BOUNTY_MANAGER_SEED],
        bump = bounty_manager.bump
    )]
    pub bounty_manager: Account<'info, BountyManager>,

    #[account(
        mut,
        seeds = [BOUNTY_SEED, bounty.bounty_id.to_le_bytes().as_ref()],
        bump = bounty.bump,
        constraint = bounty.status == BountyStatus::Accepted @ BountyError::InvalidBountyStatus,
        constraint = bounty.worker == worker.key() @ BountyError::UnauthorizedWorker
    )]
    pub bounty: Account<'info, Bounty>,

    pub worker: Signer<'info>,
}

pub fn handler(
    ctx: Context<SubmitBounty>,
    submission_url: String,
) -> Result<()> {
    // Validation
    require!(
        submission_url.len() <= Bounty::MAX_SUBMISSION_URL_LEN,
        BountyError::SubmissionUrlTooLong
    );

    let bounty = &mut ctx.accounts.bounty;
    let clock = Clock::get()?;

    // Update bounty state
    bounty.submission_url = submission_url.clone();
    bounty.status = BountyStatus::Submitted;
    bounty.submitted_at = clock.unix_timestamp;

    // Emit event
    emit!(BountySubmittedEvent {
        bounty_id: bounty.bounty_id,
        submission_url,
        submitted_at: bounty.submitted_at,
    });

    msg!("Bounty {} submitted by worker {}", bounty.bounty_id, ctx.accounts.worker.key());
    Ok(())
}

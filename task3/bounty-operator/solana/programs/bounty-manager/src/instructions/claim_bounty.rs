use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::events::*;
use crate::error::BountyError;
use crate::constants::*;

#[derive(Accounts)]
pub struct ClaimBounty<'info> {
    #[account(
        seeds = [BOUNTY_MANAGER_SEED],
        bump = bounty_manager.bump
    )]
    pub bounty_manager: Account<'info, BountyManager>,

    #[account(
        mut,
        seeds = [BOUNTY_SEED, bounty.bounty_id.to_le_bytes().as_ref()],
        bump = bounty.bump,
        constraint = bounty.status == BountyStatus::Confirmed @ BountyError::InvalidBountyStatus,
        constraint = bounty.worker == worker.key() @ BountyError::UnauthorizedWorker
    )]
    pub bounty: Account<'info, Bounty>,

    /// CHECK: Vault PDA to hold SOL
    #[account(
        mut,
        seeds = [BOUNTY_VAULT_SEED, bounty.bounty_id.to_le_bytes().as_ref()],
        bump
    )]
    pub bounty_vault: AccountInfo<'info>,

    #[account(mut)]
    pub worker: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimBounty>) -> Result<()> {
    let bounty = &ctx.accounts.bounty;
    let bounty_id = bounty.bounty_id;
    let amount = bounty.amount;

    // Transfer SOL from vault to worker using PDA signer
    let bounty_id_bytes = bounty_id.to_le_bytes();
    let vault_seeds = &[
        BOUNTY_VAULT_SEED,
        bounty_id_bytes.as_ref(),
        &[ctx.bumps.bounty_vault],
    ];
    let signer_seeds = &[&vault_seeds[..]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.bounty_vault.to_account_info(),
                to: ctx.accounts.worker.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    // Update bounty state
    let bounty = &mut ctx.accounts.bounty;
    let clock = Clock::get()?;
    bounty.status = BountyStatus::Claimed;
    bounty.claimed_at = clock.unix_timestamp;

    // Emit event
    emit!(BountyClaimedEvent {
        bounty_id,
        worker: ctx.accounts.worker.key(),
        amount,
        claimed_at: bounty.claimed_at,
    });

    msg!("Bounty {} claimed by worker {} for {} lamports", bounty_id, ctx.accounts.worker.key(), amount);
    Ok(())
}

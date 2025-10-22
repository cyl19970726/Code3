use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::events::*;
use crate::error::BountyError;
use crate::constants::*;

#[derive(Accounts)]
pub struct CreateBounty<'info> {
    #[account(
        mut,
        seeds = [BOUNTY_MANAGER_SEED],
        bump = bounty_manager.bump
    )]
    pub bounty_manager: Account<'info, BountyManager>,

    #[account(
        init,
        payer = sponsor,
        space = Bounty::LEN,
        seeds = [BOUNTY_SEED, bounty_manager.next_bounty_id.to_le_bytes().as_ref()],
        bump
    )]
    pub bounty: Account<'info, Bounty>,

    /// CHECK: Vault PDA to hold SOL
    #[account(
        mut,
        seeds = [BOUNTY_VAULT_SEED, bounty_manager.next_bounty_id.to_le_bytes().as_ref()],
        bump
    )]
    pub bounty_vault: AccountInfo<'info>,

    #[account(mut)]
    pub sponsor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateBounty>,
    task_id: String,
    task_url: String,
    task_hash: [u8; 32],
    amount: u64,
) -> Result<()> {
    // Validation
    require!(task_id.len() <= Bounty::MAX_TASK_ID_LEN, BountyError::TaskIdTooLong);
    require!(task_url.len() <= Bounty::MAX_TASK_URL_LEN, BountyError::TaskUrlTooLong);
    require!(amount > 0, BountyError::InvalidAmount);

    let bounty_manager = &mut ctx.accounts.bounty_manager;
    let bounty = &mut ctx.accounts.bounty;
    let bounty_id = bounty_manager.next_bounty_id;

    // Transfer SOL to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.sponsor.to_account_info(),
                to: ctx.accounts.bounty_vault.to_account_info(),
            },
        ),
        amount,
    )?;

    // Initialize bounty data
    bounty.bounty_id = bounty_id;
    bounty.task_id = task_id.clone();
    bounty.task_url = task_url.clone();
    bounty.task_hash = task_hash;
    bounty.sponsor = ctx.accounts.sponsor.key();
    bounty.worker = System::id(); // Placeholder for "no worker"
    bounty.amount = amount;
    bounty.asset = System::id(); // Native SOL
    bounty.status = BountyStatus::Open;
    bounty.created_at = Clock::get()?.unix_timestamp;
    bounty.accepted_at = 0;
    bounty.submitted_at = 0;
    bounty.submission_url = String::new();
    bounty.confirmed_at = 0;
    bounty.claimed_at = 0;
    bounty.bump = ctx.bumps.bounty;

    // Increment next_bounty_id
    bounty_manager.next_bounty_id = bounty_manager
        .next_bounty_id
        .checked_add(1)
        .ok_or(BountyError::ArithmeticOverflow)?;

    // Emit event
    emit!(BountyCreatedEvent {
        bounty_id,
        task_id,
        task_url,
        task_hash,
        sponsor: ctx.accounts.sponsor.key(),
        amount,
        asset: System::id(),
        timestamp: bounty.created_at,
    });

    msg!("Bounty {} created with amount {} lamports", bounty_id, amount);
    Ok(())
}

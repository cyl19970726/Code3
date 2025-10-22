use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = BountyManager::LEN,
        seeds = [BOUNTY_MANAGER_SEED],
        bump
    )]
    pub bounty_manager: Account<'info, BountyManager>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let bounty_manager = &mut ctx.accounts.bounty_manager;
    bounty_manager.authority = ctx.accounts.authority.key();
    bounty_manager.next_bounty_id = 1;
    bounty_manager.bump = ctx.bumps.bounty_manager;

    msg!("BountyManager initialized with authority: {}", bounty_manager.authority);
    Ok(())
}

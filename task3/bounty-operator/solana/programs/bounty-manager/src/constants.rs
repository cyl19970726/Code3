use anchor_lang::prelude::*;

// PDA Seeds for deterministic address generation
#[constant]
pub const BOUNTY_MANAGER_SEED: &[u8] = b"bounty_manager";

#[constant]
pub const BOUNTY_SEED: &[u8] = b"bounty";

#[constant]
pub const BOUNTY_VAULT_SEED: &[u8] = b"bounty_vault";

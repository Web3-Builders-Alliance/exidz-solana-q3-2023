use anchor_lang::prelude::*;
use crate::constant::*;

#[account]
pub struct Escrow {
    pub maker: Pubkey,
    pub maker_token: Pubkey,
    pub taker_token: Pubkey,
    pub seed: u64,
    pub offer_amount: u64,
    pub auth_bump: u8,
    pub escrow_bump: u8,
    pub vault_bump: u8,
}

impl Escrow {
    pub const LEN: usize = 8 +(PUBKEY_L * 3) + (U64_L * 2) + (U8_L * 3);
}

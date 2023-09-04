use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use crate::state::*;

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(
        mut,
        has_one = maker,
        seeds = [b"escrow", maker.key().as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump = escrow.escrow_bump,
    )]
    pub escrow: Box<Account<'info, Escrow>>,
    pub new_taker_token: Box<Account<'info, Mint>>,
}

impl<'info> Update<'info> {
    pub fn update_escrow(&mut self, offer_amt: u64) -> Result<()> {
        self.escrow.offer_amount = offer_amt;
        self.escrow.taker_token = self.new_taker_token.key();
        Ok(())
    }
}

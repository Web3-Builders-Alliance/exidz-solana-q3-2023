use anchor_lang::prelude::*;
use anchor_spl::associated_token::*;
use anchor_spl::token::{
    transfer as transferSPL, Mint, Token, TokenAccount, Transfer as SPLTransfer,
};
use std::collections::BTreeMap;
use crate::state::*;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Make<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(
        init,
        payer = maker,
        space = Escrow::LEN,
        seeds = [b"escrow", maker.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump,
    )]
    pub escrow: Box<Account<'info, Escrow>>,

    #[account(
        mut,
        associated_token::mint = maker_token,
        associated_token::authority = maker,
    )]
    pub maker_ata: Account<'info, TokenAccount>,

    pub maker_token: Box<Account<'info, Mint>>,
    pub taker_token: Box<Account<'info, Mint>>,

    #[account(
        seeds = [b"auth", escrow.key().as_ref()],
        bump,
    )]
    /// CHECK: This is safe
    pub auth: UncheckedAccount<'info>,

    #[account(
        init,
        payer = maker,
        seeds = [b"vault", escrow.key().as_ref()],
        token::mint = maker_token,
        token::authority = auth,
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Make<'info> {
    pub fn init(&mut self, seed: u64, bumps: &BTreeMap<String, u8>, offer_amt: u64) -> Result<()> {
        let escrow = &mut self.escrow;
        escrow.maker = *self.maker.key;
        escrow.maker_token = self.maker_token.key();
        escrow.taker_token = self.taker_token.key();
        escrow.offer_amount = offer_amt;
        escrow.seed = seed;
        escrow.auth_bump = *bumps.get("auth").unwrap();
        escrow.vault_bump = *bumps.get("vault").unwrap();
        escrow.escrow_bump = *bumps.get("escrow").unwrap();

        Ok(())
    }

    pub fn transfer_vault(&self, deposit_amt: u64) -> Result<()> {
        let accounts = SPLTransfer {
            from: self.maker_ata.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.maker.to_account_info(),
        };

        let cpi = CpiContext::new(self.token_program.to_account_info(), accounts);

        let _ = transferSPL(cpi, deposit_amt);
        Ok(())
    }
}

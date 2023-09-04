use anchor_lang::prelude::*;
use anchor_spl::associated_token::*;
use anchor_spl::token::{
    close_account, transfer as transferSPL, CloseAccount as SplCloseAccount, Mint, Token,
    TokenAccount, Transfer as SPLTransfer,
};
use crate::state::*;

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(
        mut,
        has_one = maker,
        has_one = maker_token,
        seeds = [b"escrow", maker.key().as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump = escrow.escrow_bump,
        close = maker,
    )]
    pub escrow: Box<Account<'info, Escrow>>,

    #[account(
        mut,
        associated_token::mint = maker_token,
        associated_token::authority = maker,
    )]
    pub maker_ata: Account<'info, TokenAccount>,

    pub maker_token: Box<Account<'info, Mint>>,

    #[account(
        seeds = [b"auth", escrow.key().as_ref()],
        bump = escrow.auth_bump,
    )]
    /// CHECK: This is safe
    pub auth: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        token::mint = maker_token,
        token::authority = auth,
        bump = escrow.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Refund<'info> {
    pub fn empty_vault_to_maker(&self) -> Result<()> {
        let seeds = &[
            b"auth",
            self.escrow.to_account_info().key.as_ref(),
            &[self.escrow.auth_bump],
        ];

        let signer_seeds: &[&[&[u8]]; 1] = &[&seeds[..]];
        let accounts = SPLTransfer {
            from: self.vault.to_account_info(),
            to: self.maker_ata.to_account_info(),
            authority: self.auth.to_account_info(),
        };

        let cpi = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            signer_seeds,
        );

        let _ = transferSPL(cpi, self.vault.amount);

        Ok(())
    }

    pub fn close_vault(&self) -> Result<()> {
        let seeds = &[
            b"auth",
            self.escrow.to_account_info().key.as_ref(),
            &[self.escrow.auth_bump],
        ];

        let signer_seeds = &[&seeds[..]];
        let accounts = SplCloseAccount {
            account: self.vault.to_account_info(),
            destination: self.maker.to_account_info(),
            authority: self.auth.to_account_info(),
        };

        let cpi = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            signer_seeds,
        );

        let _ = close_account(cpi);

        Ok(())
    }
}
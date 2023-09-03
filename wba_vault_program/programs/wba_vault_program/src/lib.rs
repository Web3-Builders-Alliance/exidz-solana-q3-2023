use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{
    close_account, transfer as transferSPL, CloseAccount as SplCloseAccount, Mint, Token,
    TokenAccount, Transfer as SPLTransfer,
};

declare_id!("5QYYRm4embEgtbGNc1Rm95BW6dJyJL3VDLhjXSSLQQ15");

#[program]
pub mod wba_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.state.auth_bump = *ctx.bumps.get("auth").unwrap();
        ctx.accounts.state.vault_bump = *ctx.bumps.get("vault").unwrap();
        ctx.accounts.state.state_bump = *ctx.bumps.get("state").unwrap();
        Ok(())
    }

    pub fn deposit(ctx: Context<Payments>, amount: u64) -> Result<()> {
        let accounts = Transfer {
            from: ctx.accounts.owner.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        };

        let cpi = CpiContext::new(ctx.accounts.system_program.to_account_info(), accounts);

        let _ = transfer(cpi, amount);
        Ok(())
    }

    pub fn withdraw(ctx: Context<Payments>, amount: u64) -> Result<()> {
        let accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.owner.to_account_info(),
        };

        let seeds = &[
            b"vault",
            ctx.accounts.state.to_account_info().key.as_ref(),
            &[ctx.accounts.state.vault_bump],
        ];

        let signer_seeds = &[&seeds[..]];

        let cpi = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            accounts,
            signer_seeds,
        );

        let _ = transfer(cpi, amount);
        Ok(())
    }

    pub fn deposit_spl(ctx: Context<SPLDeposit>, amount: u64) -> Result<()> {
        let accounts = SPLTransfer {
            from: ctx.accounts.owner_ata.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };

        let cpi = CpiContext::new(ctx.accounts.token_program.to_account_info(), accounts);

        let _ = transferSPL(cpi, amount);
        Ok(())
    }

    pub fn withdraw_spl(ctx: Context<SPLWithdraw>, amount: u64) -> Result<()> {
        let accounts = SPLTransfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.owner_ata.to_account_info(),
            authority: ctx.accounts.auth.to_account_info(),
        };

        let seeds = &[
            b"auth",
            ctx.accounts.state.to_account_info().key.as_ref(),
            &[ctx.accounts.state.auth_bump],
        ];

        let signer_seeds = &[&seeds[..]];

        let cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            accounts,
            signer_seeds,
        );

        let _ = transferSPL(cpi, amount);
        Ok(())
    }

    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        match ctx.accounts.vault.try_lamports() {
            Ok(amount) => {
                let accounts = Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.owner.to_account_info(),
                };

                let seeds = &[
                    b"vault",
                    ctx.accounts.state.to_account_info().key.as_ref(),
                    &[ctx.accounts.state.vault_bump],
                ];

                let signer_seeds = &[&seeds[..]];

                let cpi = CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    accounts,
                    signer_seeds,
                );

                let _ = transfer(cpi, amount);
            }
            Err(_) => (),
        }

        let seeds = &[
            b"auth",
            ctx.accounts.state.to_account_info().key.as_ref(),
            &[ctx.accounts.state.auth_bump],
        ];

        let signer_seeds = &[&seeds[..]];

        if ctx.accounts.spl_vault.amount > 0 {
            let accounts = SPLTransfer {
                from: ctx.accounts.spl_vault.to_account_info(),
                to: ctx.accounts.owner_ata.to_account_info(),
                authority: ctx.accounts.auth.to_account_info(),
            };

            let cpi = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                accounts,
                signer_seeds,
            );

            let _ = transferSPL(cpi, ctx.accounts.spl_vault.amount.clone())?;
        }
        let close_spl_account = SplCloseAccount {
            account: ctx.accounts.spl_vault.to_account_info(),
            destination: ctx.accounts.owner.to_account_info(),
            authority: ctx.accounts.auth.to_account_info(),
        };
        let cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            close_spl_account,
            signer_seeds,
        );
        let _ = close_account(cpi);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    owner: Signer<'info>,
    // PDA signer for SPL vault
    #[account(
        seeds=[b"auth", state.key().as_ref()],
        bump
    )]
    /// CHECK: This is not dangerous trust me
    auth: UncheckedAccount<'info>,
    // Where we store our SOL
    #[account(
        seeds=[b"vault", state.key().as_ref()],
        bump
    )]
    vault: SystemAccount<'info>,

    #[account(
        init,
        payer =owner,
        space = VaultState::LEN,
        seeds=[b"state", owner.key().as_ref()],
        bump
    )]
    state: Account<'info, VaultState>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Payments<'info> {
    #[account(mut)]
    owner: Signer<'info>,
    // Where we store our SOL
    #[account(
        mut,
        seeds=[b"vault", state.key().as_ref()],
        bump = state.vault_bump
    )]
    vault: SystemAccount<'info>,

    #[account(
        seeds=[b"state", owner.key().as_ref()],
        bump = state.state_bump
    )]
    state: Account<'info, VaultState>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SPLDeposit<'info> {
    #[account(mut)]
    owner: Signer<'info>,
    #[account(
        seeds = [b"state", owner.key().as_ref()],
        bump = state.state_bump,
    )]
    state: Account<'info, VaultState>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = owner,
    )]
    owner_ata: Account<'info, TokenAccount>,
    mint: Account<'info, Mint>,
    #[account(
        seeds = [b"auth", state.key().as_ref()],
        bump = state.auth_bump,
    )]
    /// CHECK: This is safe
    auth: UncheckedAccount<'info>,
    #[account(
        init,
        payer = owner,
        seeds = [b"spl_vault", state.key().as_ref()],
        token::mint = mint,
        token::authority = auth,
        bump
    )]
    vault: Account<'info, TokenAccount>,
    token_program: Program<'info, Token>,
    ata_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SPLWithdraw<'info> {
    #[account(mut)]
    owner: Signer<'info>,
    #[account(
        seeds = [b"state", owner.key().as_ref()],
        bump = state.state_bump,
    )]
    state: Account<'info, VaultState>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = owner,
    )]
    owner_ata: Account<'info, TokenAccount>,
    mint: Account<'info, Mint>,
    #[account(
        seeds = [b"auth", state.key().as_ref()],
        bump = state.auth_bump,
    )]
    /// CHECK: This is safe
    auth: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"spl_vault", state.key().as_ref()],
        token::mint = mint,
        token::authority = auth,
        bump,
    )]
    vault: Account<'info, TokenAccount>,
    token_program: Program<'info, Token>,
    ata_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(mut)]
    owner: Signer<'info>,
    #[account(
        mut,
        close = owner,
        seeds = [b"state", owner.key().as_ref()],
        bump = state.state_bump,
    )]
    state: Account<'info, VaultState>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = owner,
    )]
    owner_ata: Account<'info, TokenAccount>,
    mint: Account<'info, Mint>,
    #[account(
        seeds = [b"auth", state.key().as_ref()],
        bump = state.auth_bump,
    )]
    /// CHECK: This is safe
    auth: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"spl_vault", state.key().as_ref()],
        token::mint = mint,
        token::authority = auth,
        bump,
    )]
    spl_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"vault", state.key().as_ref()],
        bump
    )]
    vault: SystemAccount<'info>,
    token_program: Program<'info, Token>,
    ata_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
}
#[account]
pub struct VaultState {
    auth_bump: u8,
    vault_bump: u8,
    state_bump: u8,
}

impl VaultState {
    const LEN: usize = 8 + 3 * 1;
}

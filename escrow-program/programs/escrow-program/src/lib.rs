use anchor_lang::prelude::*;
mod constant;
mod state;
mod context;
use context::*;

declare_id!("m9855G8NzRqrFpdJ6SPqZREXbD2kamUny7ymyNNxHdc");
#[program]
pub mod escrow_program {
    use super::*;

    pub fn make(ctx: Context<Make>, seed: u64, offer_amt: u64, deposit_amt: u64) -> Result<()> {
        ctx.accounts.init(seed, &ctx.bumps, offer_amt)?;
        let _ = ctx.accounts.transfer_vault(deposit_amt);
        Ok(())
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {
        ctx.accounts.deposit_to_maker()?;
        ctx.accounts.empty_vault_to_taker()?;
        let _ = ctx.accounts.close_vault();
        Ok(())
    }

    pub fn update(ctx: Context<Update>, offer_amt: u64) -> Result<()> {
        let _ = ctx.accounts.update_escrow(offer_amt);
        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.empty_vault_to_maker()?;
        let _ = ctx.accounts.close_vault();
        Ok(())
    }
}

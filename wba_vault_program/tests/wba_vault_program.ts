import * as anchor from "@coral-xyz/anchor";
import { WbaVault, IDL } from "../target/types/wba_vault";
import {
  Commitment,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { BN } from "bn.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe("wba_vault", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.local();

  const owner = new Keypair();

  const commitment: Commitment = "finalized";

  const programId = new PublicKey(
    "5QYYRm4embEgtbGNc1Rm95BW6dJyJL3VDLhjXSSLQQ15"
  );
  const program = new anchor.Program<WbaVault>(
    IDL,
    programId,
    anchor.getProvider()
  );

  //PDA
  const state = PublicKey.findProgramAddressSync(
    [Buffer.from("state"), owner.publicKey.toBytes()],
    program.programId
  )[0];
  const vault = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), state.toBytes()],
    program.programId
  )[0];
  const splVault = PublicKey.findProgramAddressSync(
    [Buffer.from("spl_vault"), state.toBytes()],
    program.programId
  )[0];
  const auth = PublicKey.findProgramAddressSync(
    [Buffer.from("auth"), state.toBytes()],
    program.programId
  )[0];

  let mint;
  let ownerAta;

  const token_decimals = 1_000_000n;

  it("Airdrop token to owner and Mint SPL", async () => {
    await anchor
      .getProvider()
      .connection.requestAirdrop(
        owner.publicKey,
        10000 * anchor.web3.LAMPORTS_PER_SOL
      )
      .then(confirmTx);
  });

  it("Initialize Vault", async () => {
    // Add your test here.
    await program.methods
      .initialize()
      .accounts({
        owner: owner.publicKey,
        auth,
        vault,
        state,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc()
      .then(confirmTx);
  });

  it("Deposit SOL", async () => {
    await program.methods
      .deposit(new BN(10 * LAMPORTS_PER_SOL))
      .accounts({
        owner: owner.publicKey,
        vault,
        state,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc()
      .then(confirmTx);
  });

  it("Withdraw SOL", async () => {
    await program.methods
      .withdraw(new BN(10 * LAMPORTS_PER_SOL))
      .accounts({
        owner: owner.publicKey,
        vault,
        state,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc()
      .then(confirmTx);
  });

  it("Minting SPL", async () => {
    mint = await createMint(
      anchor.getProvider().connection,
      owner,
      owner.publicKey,
      null,
      6
    );

    ownerAta = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      owner,
      mint,
      owner.publicKey
    );

    await mintTo(
      anchor.getProvider().connection,
      owner,
      mint,
      ownerAta.address,
      owner.publicKey,
      10000n * token_decimals
    );
  });

  it("Deposit SPL", async () => {
    const ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      owner,
      mint,
      owner.publicKey
    );

    await program.methods
      .depositSpl(new BN(10e6))
      .accounts({
        owner: owner.publicKey,
        ownerAta: ata.address,
        vault: splVault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        state,
        auth,
        mint,
      })
      .signers([owner])
      .rpc()
      .then(confirmTx);
  });

  it("Withdraw SPL", async () => {
    const ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      owner,
      mint,
      owner.publicKey
    );

    await program.methods
      .withdrawSpl(new BN(10e6))
      .accounts({
        owner: owner.publicKey,
        ownerAta: ata.address,
        vault: splVault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        state,
        auth,
        mint,
      })
      .signers([owner])
      .rpc()
      .then(confirmTx);
  });

  it("Close Vault", async () => {
    const ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      owner,
      mint,
      owner.publicKey
    );
    await program.methods
      .closeVault()
      .accounts({
        owner: owner.publicKey,
        ownerAta: ata.address,
        vault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        state,
        auth,
        mint,
        splVault,
      })
      .signers([owner])
      .rpc()
      .then(confirmTx);
  });
});

const confirmTx = async (signature: string) => {
  const latestBlockHash = await anchor
    .getProvider()
    .connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction(
    {
      signature,
      ...latestBlockHash,
    },
    "confirmed"
  );
  

  return signature;
};

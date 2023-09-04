import * as anchor from "@coral-xyz/anchor";

import { EscrowProgram, IDL } from "../target/types/escrow_program";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "bn.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe("escrow-program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const programId = new PublicKey(
    "m9855G8NzRqrFpdJ6SPqZREXbD2kamUny7ymyNNxHdc"
  );

  const program = new anchor.Program<EscrowProgram>(
    IDL,
    programId,
    anchor.getProvider()
  );

  const maker = new Keypair();
  const taker = new Keypair();

  const makerEscrow = PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      maker.publicKey.toBytes(),
      new BN(1).toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  )[0];
  const maker_vault = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), makerEscrow.toBytes()],
    program.programId
  )[0];
  const maker_auth = PublicKey.findProgramAddressSync(
    [Buffer.from("auth"), makerEscrow.toBytes()],
    program.programId
  )[0];

  const takerEscrow = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), taker.publicKey.toBytes()],
    program.programId
  )[0];
  const taker_vault = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), takerEscrow.toBytes()],
    program.programId
  )[0];
  const taker_auth = PublicKey.findProgramAddressSync(
    [Buffer.from("auth"), takerEscrow.toBytes()],
    program.programId
  )[0];

  let maker_spl;
  let taker_spl;
  const token_decimals = 1_000_000n;

  it("Airdrop token to maker and taker account", async () => {
    await anchor
      .getProvider()
      .connection.requestAirdrop(
        maker.publicKey,
        10000 * anchor.web3.LAMPORTS_PER_SOL
      )
      .then(confirmTx);

    await anchor
      .getProvider()
      .connection.requestAirdrop(
        taker.publicKey,
        10000 * anchor.web3.LAMPORTS_PER_SOL
      )
      .then(confirmTx);
  });

  it("Minting Maker SPL", async () => {
    maker_spl = await createMint(
      anchor.getProvider().connection,
      maker,
      maker.publicKey,
      null,
      6
    );

    let maker_ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      maker,
      maker_spl,
      maker.publicKey
    );

    await mintTo(
      anchor.getProvider().connection,
      maker,
      maker_spl,
      maker_ata.address,
      maker.publicKey,
      10000n * token_decimals
    );
  });

  it("Minting Taker SPL", async () => {
    taker_spl = await createMint(
      anchor.getProvider().connection,
      taker,
      taker.publicKey,
      null,
      6
    );

    let taker_ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      taker,
      taker_spl,
      taker.publicKey
    );

    await mintTo(
      anchor.getProvider().connection,
      taker,
      taker_spl,
      taker_ata.address,
      taker.publicKey,
      10000n * token_decimals
    );
  });

  it("Initiate escrow", async () => {
    let maker_ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      maker,
      maker_spl,
      maker.publicKey
    );

    await program.methods
      .make(new BN(1), new BN(10e6), new BN(10e6))
      .accounts({
        maker: maker.publicKey,
        makerAta: maker_ata.address,
        makerToken: maker_spl,
        takerToken: taker_spl,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        auth: maker_auth,
        vault: maker_vault,
        escrow: makerEscrow,
      })
      .signers([maker])
      .rpc()
      .then(confirmTx);
  });

  it("Update escrow requirements", async () => {
    await program.methods
      .update(new BN(19e6))
      .accounts({
        maker: maker.publicKey,
        escrow: makerEscrow,
        newTakerToken: taker_spl,
      })
      .signers([maker])
      .rpc()
      .then(confirmTx);
  });

  it("Take escrow offer", async () => {
    let maker_recieve_ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      maker,
      taker_spl,
      maker.publicKey
    );

    let taker_ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      taker,
      taker_spl,
      taker.publicKey
    );
    let taker_recieve_ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      taker,
      maker_spl,
      taker.publicKey
    );

    await program.methods
      .take()
      .accounts({
        takerRecieveAta: taker_recieve_ata.address,
        makerRecieveAta: maker_recieve_ata.address,
        maker: maker.publicKey,
        takerAta: taker_ata.address,
        taker: taker.publicKey,
        makerToken: maker_spl,
        takerToken: taker_spl,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        auth: maker_auth,
        vault: maker_vault,
        escrow: makerEscrow,
      })
      .signers([taker])
      .rpc()
      .then(confirmTx);
  });

  it("Initiate new escrow and do refund", async () => {
    let maker_ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      maker,
      maker_spl,
      maker.publicKey
    );

    const newMakerEscrow = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBytes(),
        new BN(2).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    )[0];
    const newMaker_vault = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), newMakerEscrow.toBytes()],
      program.programId
    )[0];
    const newMaker_auth = PublicKey.findProgramAddressSync(
      [Buffer.from("auth"), newMakerEscrow.toBytes()],
      program.programId
    )[0];

    await program.methods
      .make(new BN(2), new BN(10e6), new BN(10e6))
      .accounts({
        maker: maker.publicKey,
        makerAta: maker_ata.address,
        makerToken: maker_spl,
        takerToken: taker_spl,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        auth: newMaker_auth,
        vault: newMaker_vault,
        escrow: newMakerEscrow,
      })
      .signers([maker])
      .rpc()
      .then(confirmTx);

    await program.methods
      .refund()
      .accounts({
        maker: maker.publicKey,
        makerAta: maker_ata.address,
        makerToken: maker_spl,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        auth: newMaker_auth,
        vault: newMaker_vault,
        escrow: newMakerEscrow,
      })
      .signers([maker])
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

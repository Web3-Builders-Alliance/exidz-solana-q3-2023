import {
  Commitment,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import wallet from "./wba-wallet.json";
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

// Mint address
const mint = new PublicKey("HinNAxNqxg3Ja8YV6EKy9u5PepL8fEhzH9VjoS8gg4JU");

// Recipient address
const to = new PublicKey("5kRot8UnMEqoDkAc72e7pqaEaF5hxGmbDNowMmPiCDmb");

const token_decimals = 1_000_000n;

(async () => {
  try {
    // Get the token account of the fromWallet address, and if it does not exist, create it
    const from = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      keypair.publicKey,
      false,
      commitment
    );
    console.log(`Your ata address is: ${from.address.toBase58()}`);

    // Get the token account of the toWallet address, and if it does not exist, create it
    const cadet = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      to,
      false,
      commitment
    );
    console.log(`Cadet address is: ${cadet.address.toBase58()}`);

    // Transfer the new token to the "toTokenAccount" we just created

    const tx = await transfer(
      connection,
      keypair,
      new PublicKey(from.address),
      new PublicKey(cadet.address),
      keypair.publicKey,
      10n * token_decimals
    );

    console.log(`Transaction id: ${tx}`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();

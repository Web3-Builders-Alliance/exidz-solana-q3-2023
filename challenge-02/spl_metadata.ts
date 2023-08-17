import {
  Commitment,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import wallet from "./wba-wallet.json";
import {
  CreateMetadataAccountArgsV3,
  CreateMetadataAccountV3InstructionAccounts,
  CreateMetadataAccountV3InstructionArgs,
  DataV2,
  createCreateMetadataAccountV2Instruction,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

// Define our Mint address
const mint = new PublicKey("HinNAxNqxg3Ja8YV6EKy9u5PepL8fEhzH9VjoS8gg4JU");

// Add the Token Metadata Program
const token_metadata_program_id = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

// Create PDA for token metadata
const metadata_seeds = [
  Buffer.from("metadata"),
  token_metadata_program_id.toBuffer(),
  mint.toBuffer(),
];
const [metadata_pda, _bump] = PublicKey.findProgramAddressSync(
  metadata_seeds,
  token_metadata_program_id
);

(async () => {
  try {
    // Start here
    const transaction = new Transaction();
    const accounts: CreateMetadataAccountV3InstructionAccounts = {
      metadata: metadata_pda,
      mint,
      mintAuthority: keypair.publicKey,
      payer: keypair.publicKey,
      updateAuthority: keypair.publicKey,
    };
    const collectionData: DataV2 = {
      name: "WBA Challenge 02",
      symbol: "WBACH02",
      uri: "",
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    };
    const argsV3: CreateMetadataAccountArgsV3 = {
      data: collectionData,
      isMutable: true,
      collectionDetails: null,
    };

    const args: CreateMetadataAccountV3InstructionArgs = {
      createMetadataAccountArgsV3: argsV3,
    };
    transaction.add(createCreateMetadataAccountV3Instruction(accounts, args));
    const tx = await sendAndConfirmTransaction(connection, transaction, [
      keypair,
    ]);
    console.log(`Transaction id: ${tx}`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();

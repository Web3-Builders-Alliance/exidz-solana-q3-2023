import { Commitment, Connection, Keypair } from "@solana/web3.js";
import wallet from "./wba-wallet.json";
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
} from "@metaplex-foundation/js";
import { readFile } from "fs/promises";

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(keypair))
  .use(
    bundlrStorage({
      address: "https://devnet.bundlr.network",
      providerUrl: "https://api.devnet.solana.com",
      timeout: 60000,
    })
  );

(async () => {
  try {
    // Start here
    const img = await readFile("./images/generug.png");
    const metaplexFile = toMetaplexFile(img, "cool-rug.png");
    const imgUrl = await metaplex.storage().upload(metaplexFile);
    console.log(`Your image uri can access here: ${imgUrl}`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();

import { Commitment, Connection, Keypair } from "@solana/web3.js";
import wallet from "./wba-wallet.json";
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  UploadMetadataOutput,
} from "@metaplex-foundation/js";

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

    const mint = await metaplex.nfts().create(
      {
        uri: "https://arweave.net/6Jfrwxs98d2Jorqk1uUxPx7T3mRBtgEvSUuaSl-wBIc",
        name: "Cool Rug",
        sellerFeeBasisPoints: 0,
        symbol: "CRG",
        collection: null,
        uses: null,
      },
      { commitment: "finalized" }
    );

    console.log(`Here is mint nft: ${mint.mintAddress}`);
    //Mint address : DXWXMCuTtRQjXBkxiDgFBTPtZc8Kg9TBL7BhKB31bqfv
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();

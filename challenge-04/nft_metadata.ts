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
    const metadata = {
      name: "Cool Rug",
      description: "Generative rug on Solana.",
      image:
        "https://arweave.net/W2z291ZZeDzsOsvPQovzgCx9CUhhBKx3v729SyOz5HY?ext=jpeg",
      external_url: "https://deanmlittle.github.io/generug/",
      properties: {
        files: [
          {
            uri: "https://arweave.net/W2z291ZZeDzsOsvPQovzgCx9CUhhBKx3v729SyOz5HY?ext=png",
            type: "image/png",
          },
        ],
        category: "image",
      },
    };
    const { uri }: UploadMetadataOutput = await metaplex
      .nfts()
      .uploadMetadata(metadata);
    console.log(`Here is the sample uri of your NFT: ${uri}`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();

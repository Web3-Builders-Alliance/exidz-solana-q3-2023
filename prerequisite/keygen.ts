import { Keypair } from "@solana/web3.js";
import * as fs from 'fs';

function saveArrayToJsonFile(array: Uint8Array, filename: string): void {
    const byteArray = Array.from(array);
    const jsonContent = JSON.stringify(byteArray);

  fs.writeFile(filename, jsonContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing JSON file:', err);
    } else {
      console.log('Secret key (JSON) saved successfully:', filename);
    }
  });
}

const fileName = 'dev-wallet.json';
let kp = Keypair.generate()
let kpSecret = kp.secretKey
console.log(`You've generated a new Solana wallet: ${kp.publicKey.toBase58()}`)
console.log(`Secret key: ${kpSecret}`);
saveArrayToJsonFile(kpSecret, fileName);

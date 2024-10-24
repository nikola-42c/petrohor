import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const CONTRACTS_FILE = path.resolve(process.cwd(), "../contract_addresses.txt");

if (!fs.existsSync(CONTRACTS_FILE)) {
  // If the file doesn't exist, create an empty file
  fs.writeFileSync(CONTRACTS_FILE, "");
}

const BLOCK_START = parseInt(process.env.START_BLOCK, 10) || 20150670; // Starting block to scan for contracts
const BLOCK_END = 21036668; // Ending block or use a specific block number

async function main() {
  // Connect to the local Hardhat fork
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  let currentBlock = await provider.getBlockNumber();
  console.log(`Current block number: ${currentBlock}`);

  const startBlock = BLOCK_START || 0;
  const endBlock = BLOCK_END === "latest" ? currentBlock : BLOCK_END;

  console.log(
    `Scanning for contracts between blocks ${startBlock} and ${endBlock}...`
  );

  for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
    const block = await provider.getBlock(blockNumber);

    if (block && block.transactions) {
      for (const txHash of block.transactions) {
        // Retrieve the transaction receipt using the hash
        const receipt = await provider.getTransactionReceipt(txHash);

        if (receipt) {
          if (receipt.contractAddress) {
            console.log("[CONTRACT CREATION] - ", JSON.stringify(receipt));

            const contractAddress = receipt.contractAddress;
            console.log(`Contract created at: ${contractAddress}`);

            // Append the contract address and block number to contract_addresses.txt
            fs.appendFileSync(
              CONTRACTS_FILE,
              `${contractAddress}\t${blockNumber}\n`
            );
            console.log(
              `Appended contract address and block number to: ${CONTRACTS_FILE}`
            );
          }
        } else {
          console.error(`Transaction receipt not found for hash: ${txHash}`);
        }
      }
    } else {
      console.error(`No transactions in block ${blockNumber}`);
    }
  }
}

// Run the script
main().catch((error) => {
  console.error("Error:", error);
});

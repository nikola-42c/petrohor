import { ethers } from "ethers";
import fs from "fs";
import path from "path";

// Ensure the directories and files exist
const CONTRACTS_DIR = path.join(process.cwd(), "contracts_bytecode");
const CONTRACTS_FILE = path.join(process.cwd(), "contract_addresses.txt");

if (!fs.existsSync(CONTRACTS_DIR)) {
  fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
}

if (!fs.existsSync(CONTRACTS_FILE)) {
  // If the file doesn't exist, create an empty file
  fs.writeFileSync(CONTRACTS_FILE, "");
}

const BLOCK_START = parseInt(process.env.START_BLOCK, 10) || 20150670; // Starting block to scan for contracts
const BLOCK_END = "latest"; // Ending block or use a specific block number

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
    const block = await provider.getBlockWithTransactions(blockNumber);

    for (const tx of block.transactions) {
      // If `to` is null, it's a contract creation transaction
      if (tx.to === null) {
        const contractAddress = tx.creates;
        console.log(`Contract created at: ${contractAddress}`);

        // Fetch the contract bytecode
        const bytecode = await provider.getCode(contractAddress);

        if (bytecode === "0x") {
          console.log(`No bytecode found for contract at: ${contractAddress}`);
          continue;
        }

        // Save the bytecode to the contracts_bytecode directory
        const bytecodeFilename = `${contractAddress}.bytecode`;
        const bytecodeFilePath = path.join(CONTRACTS_DIR, bytecodeFilename);
        fs.writeFileSync(bytecodeFilePath, bytecode);
        console.log(`Saved contract bytecode to: ${bytecodeFilePath}`);

        // Append the contract address to contract_addresses.txt
        fs.appendFileSync(CONTRACTS_FILE, `${contractAddress}\n`);
        console.log(`Appended contract address to: ${CONTRACTS_FILE}`);
      }
    }
  }
}

// Run the script
main().catch((error) => {
  console.error("Error:", error);
});

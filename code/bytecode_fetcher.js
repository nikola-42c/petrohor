import axios from "axios"; // Importing axios
import fs from "fs"; // Importing fs
import csv from "csv-parser"; // Importing csv-parser
import path from "path"; // Importing path
import dotenv from "dotenv"; // Importing dotenv

dotenv.config();

const apiKey = process.env.ETHERSCAN_API_KEY; // Etherscan API key
const inputFilePath = path.join(process.cwd(), "/contracts.csv"); // Path to your CSV file
const bytecodeOutputDir = path.join(process.cwd(), "/contracts_bytecode"); // Directory for bytecode

// Ensure output directory exists
if (!fs.existsSync(bytecodeOutputDir)) {
  fs.mkdirSync(bytecodeOutputDir);
}

// Function to fetch the bytecode for a contract
async function getContractBytecode(contractAddress, contractName) {
  const url = `https://api.etherscan.io/api?module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest&apikey=${apiKey}`;
  try {
    const response = await axios.get(url);

    if (response.data.result) {
      const bytecode = response.data.result;

      if (bytecode === "0x") {
        console.log(
          `Contract ${contractName} (${contractAddress}) has no bytecode found.`
        );
        return;
      }

      const bytecodeFilePath = `${bytecodeOutputDir}/${contractName}_${contractAddress}.bytecode`;
      fs.writeFileSync(bytecodeFilePath, bytecode);
      console.log(`Saved bytecode for ${contractName} (${contractAddress})`);
    } else {
      console.log(
        `Failed to fetch bytecode for ${contractAddress}: ${response.data.message}`
      );
      console.log(
        `Reason: ${response.data.result[0]?.Error || "Unknown error"}`
      );
    }
  } catch (error) {
    console.error(
      `Error fetching bytecode for ${contractAddress}:`,
      error.message
    );
  }
}

async function fetchContracts() {
  const contracts = [];

  // Load the contracts from CSV into an array
  await new Promise((resolve, reject) => {
    fs.createReadStream(inputFilePath)
      .pipe(csv())
      .on("data", (row) => {
        contracts.push(row); // Collect all contracts
      })
      .on("end", resolve)
      .on("error", reject);
  });

  for (const row of contracts) {
    const { ContractAddress, ContractName } = row;
    await getContractBytecode(ContractAddress, ContractName);

    await sleep(250); // To avoid hitting rate limits
  }

  console.log("Finished processing all contracts.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

fetchContracts();

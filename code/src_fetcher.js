import axios from "axios"; // Importing axios
import fs from "fs"; // Importing fs
import csv from "csv-parser"; // Importing csv-parser
import path from "path"; // Importing path
import dotenv from "dotenv"; // Importing dotenv

dotenv.config();
import parser from "@solidity-parser/parser";

const apiKey = process.env.ETHERSCAN_API_KEY; // Etherscan API key
const inputFilePath = path.join(process.cwd(), "/contracts.csv"); // Path to your CSV file
const sourceOutputDir = path.join(process.cwd(), "/contracts_src"); // Directory for source code
const astOutputDir = path.join(process.cwd(), "/contracts_ast"); // Directory for AST

// Ensure output directories exist
if (!fs.existsSync(sourceOutputDir)) {
  fs.mkdirSync(sourceOutputDir);
}
if (!fs.existsSync(astOutputDir)) {
  fs.mkdirSync(astOutputDir);
}

// Function to fetch the source code and generate AST for a contract
async function getContractSource(contractAddress, contractName) {
  const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
  try {
    const response = await axios.get(url);

    if (response.data.status === "1" && response.data.result.length > 0) {
      const contractData = response.data.result[0];
      const sourceCode = contractData.SourceCode || "No source code found.";

      if (!sourceCode || sourceCode === "") {
        console.log(
          `Contract ${contractName} (${contractAddress}) is not verified.`
        );
        return;
      }

      const sourceFilePath = `${sourceOutputDir}/${contractName}_${contractAddress}.sol`;
      fs.writeFileSync(sourceFilePath, sourceCode);
      console.log(`Saved source code for ${contractName} (${contractAddress})`);

      const ast = parser.parse(sourceCode);

      const astFilePath = `${astOutputDir}/${contractName}_${contractAddress}.json`;
      fs.writeFileSync(astFilePath, JSON.stringify(ast, null, 2));
      console.log(`Saved AST for ${contractName} (${contractAddress})`);
    } else {
      console.log(
        `Failed to fetch source for ${contractAddress}: ${response.data.message}`
      );
      console.log(
        `Reason: ${response.data.result[0]?.Error || "Unknown error"}`
      );
    }
  } catch (error) {
    console.error(`Error fetching contract ${contractAddress}:`, error.message);
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
    await getContractSource(ContractAddress, ContractName);

    await sleep(250);
  }

  console.log("Finished processing all contracts.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

fetchContracts();

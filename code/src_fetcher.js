import axios from "axios";
import fs from "fs";
import csv from "csv-parser";
import path from "path";
import dotenv from "dotenv";
import parser from "@solidity-parser/parser";

dotenv.config({ path: "../.env" });

const apiKey = process.env.ETHERSCAN_API_KEY;
const inputFilePath = path.join(process.cwd(), "../contracts.csv");
const sourceOutputDir = path.join(process.cwd(), "../contracts_src");
const astOutputDir = path.join(process.cwd(), "../contracts_ast");

// Ensure output directories exist
if (!fs.existsSync(sourceOutputDir)) {
  fs.mkdirSync(sourceOutputDir);
}
if (!fs.existsSync(astOutputDir)) {
  fs.mkdirSync(astOutputDir);
}

// Function to fetch the source code and generate AST for a contract
async function getContractSource(contractAddress, contractName) {
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
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
      .pipe(csv({ separator: "\t" })) // Specify tab as the delimiter
      .on("data", (row) => {
        if (row.ContractAddress && row.ContractName) {
          contracts.push(row);
        } else {
          console.log("Missing ContractAddress or ContractName in row:", row);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // Create a set of already existing contract addresses in sourceOutputDir
  const existingContracts = new Set(
    fs
      .readdirSync(sourceOutputDir)
      .filter((file) => file.endsWith(".sol"))
      .map((file) => file.split("_").pop().replace(".sol", ""))
  );

  for (const row of contracts) {
    const { ContractAddress, ContractName } = row;

    if (!ContractAddress || !ContractName) {
      console.error("Missing ContractAddress or ContractName in row:", row);
      continue;
    }

    // Check if the contract address already exists in the set
    if (existingContracts.has(ContractAddress)) continue;

    await getContractSource(ContractAddress, ContractName);
    await sleep(250); // Adding delay to avoid API rate limits
  }

  console.log("Finished processing all contracts.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

fetchContracts();

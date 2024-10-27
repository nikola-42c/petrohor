import fetch from "node-fetch";
import csv from "csv-parser";
import dotenv from "dotenv";
import fs from "fs"; // Import the file system module
import path from "path"; // Import the path module

dotenv.config({ path: "../.env" });

const apiKey = process.env.ETHERSCAN_API_KEY;

const inputFilePath = path.join(process.cwd(), "../contracts.csv");
const txOutputDir = path.join(process.cwd(), "../contracts_txs");

if (!fs.existsSync(txOutputDir)) {
  fs.mkdirSync(txOutputDir);
}

// Function to fetch transactions from Etherscan
const fetchTransactions = async (contractAddress, contractName) => {
  const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "1") {
      console.log(
        `Contract name: ${contractName} - number of transactions: ${data.result.length}`
      );
      const txFilePath = `${txOutputDir}/${contractName}_${contractAddress}_txs.json`;
      fs.writeFileSync(
        txFilePath,
        JSON.stringify(data.result.slice(0, 127), null, 2)
      );
    } else {
      console.log("Error fetching transactions: ", data.message);
    }
  } catch (error) {
    console.error("Error fetching transactions: ", error);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Main function to fetch transactions and trace them for SSTORE gas usage
const main = async () => {
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

  const existingContracts = new Set(
    fs
      .readdirSync(txOutputDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.split("_")[1])
  );

  for (const row of contracts) {
    const { ContractAddress, ContractName } = row;

    if (!ContractAddress || !ContractName) {
      console.error("Missing ContractAddress or ContractName in row:", row);
      continue;
    }

    // Check if the contract address already exists in the set
    if (existingContracts.has(ContractAddress)) {
      console.log(
        `Contract with address ${ContractAddress} has already been processed.`
      );
      continue;
    }

    await fetchTransactions(ContractAddress, ContractName);
    await sleep(250); // Adding delay to avoid API rate limits
  }

  console.log("Finished processing all contracts.");
};

main();

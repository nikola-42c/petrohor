import fetch from "node-fetch";
import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs"; // Import the file system module
import path from "path"; // Import the path module

dotenv.config({ path: "../.env" });

const apiKey = process.env.ETHERSCAN_API_KEY;
const contractName =
  "OdosLimitOrderRouter_0x0f26b03961eb5d625bd6001278f0db13f3e583d8";
const contractAddress = "0x0f26b03961eb5d625bd6001278f0db13f3e583d8";

const txOutputDir = path.join(process.cwd(), "../contracts_tx_traces");
const logFilePath = path.join(txOutputDir, `${contractName}_logs.json`); // Path for log file

// Need to start a local hardhat node with `npx hardhat node`
const provider = new ethers.JsonRpcProvider("http://localhost:8545");

// Function to fetch transactions from Etherscan
const fetchTransactions = async (contractAddress) => {
  const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "1") {
      console.log(
        `Contract name: ${contractName} - number of transactions: ${data.result.length}`
      );
      return data.result.slice(0, 127); // This returns an array of transactions
    } else {
      console.log("Error fetching transactions: ", data.message);
      return [];
    }
  } catch (error) {
    console.error("Error fetching transactions: ", error);
    return [];
  }
};

const traceTransactionWithTimeout = async (txHash, timeout = 120000) => {
  const tracePromise = traceTransaction(txHash);

  // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`Timeout after ${timeout / 1000} seconds`)),
      timeout
    )
  );

  // Use Promise.race to await the tracePromise or timeoutPromise
  return Promise.race([tracePromise, timeoutPromise]);
};

const traceTransaction = async (txHash) => {
  try {
    console.log(`Tracing transaction: ${txHash}`);
    const traceResult = await provider.send("debug_traceTransaction", [txHash]);

    const logData = {
      transactionHash: txHash,
      failed: traceResult.failed,
      gas: traceResult.gas,
      structLogs: traceResult.structLogs || [], // Ensure structLogs exists
    };

    if (!fs.existsSync(txOutputDir)) {
      fs.mkdirSync(txOutputDir, { recursive: true });
    }

    let existingData = [];
    if (fs.existsSync(logFilePath)) {
      const rawData = fs.readFileSync(logFilePath);
      existingData = JSON.parse(rawData);
    }

    existingData.push(logData);
    fs.writeFileSync(logFilePath, JSON.stringify(existingData, null, 2));
    console.log(
      `Trace logs for transaction ${txHash} have been saved to ${logFilePath}`
    );
  } catch (error) {
    console.error(`Error tracing transaction ${txHash}: `, error);
  }
};

// Function to calculate SSTORE gas usage in a transaction trace
const calculateSSTOREGas = () => {
  let sstoreGasUsed = 0;

  if (fs.existsSync(logFilePath)) {
    const rawData = fs.readFileSync(logFilePath);
    const traceLogs = JSON.parse(rawData); // Parse the JSON data

    // Loop through the trace logs and filter for SSTORE operations
    traceLogs.forEach((log) => {
      if (log.structLogs) {
        // Ensure structLogs exists
        log.structLogs.forEach((structLog) => {
          if (structLog.op === "SSTORE") {
            sstoreGasUsed += structLog.gasCost; // Add the gas cost for each SSTORE operation
          }
        });
        console.log("Total gas used:", log.gas);
        console.log(`SSTORE Gas Used: ${sstoreGasUsed}`);
        console.log(
          "Percentage of gas that went to SSTORE:",
          sstoreGasUsed / log.gas
        );
      }
    });
  } else {
    console.error(`File not found: ${logFilePath}`);
  }

  return sstoreGasUsed;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Main function to fetch transactions and trace them for SSTORE gas usage
const main = async () => {
  const transactions = await fetchTransactions(contractAddress);

  // Load existing transaction hashes into a Set
  const existingHashes = new Set();

  if (fs.existsSync(logFilePath)) {
    const rawData = fs.readFileSync(logFilePath);
    const existingData = JSON.parse(rawData);
    existingData.forEach((log) => existingHashes.add(log.transactionHash));
  }

  for (const tx of transactions) {
    if (existingHashes.has(tx.hash)) {
      console.log(
        `Transaction ${tx.hash} already exists in the log file. Skipping...`
      );
      continue;
    }
    await sleep(200);

    try {
      await traceTransactionWithTimeout(tx.hash);
    } catch (error) {
      console.error(`Error tracing transaction ${tx.hash}: ${error.message}`);
    }
  }

  // Calculate SSTORE gas after all transactions are traced
  calculateSSTOREGas();
};

main();

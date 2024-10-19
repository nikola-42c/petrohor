import fetch from "node-fetch";
import { ethers } from "ethers";
import "dotenv/config";
import fs from "fs"; // Import the file system module

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const contractAddress = "0x0f26b03961eb5d625bd6001278f0db13f3e583d8";

const provider = new ethers.JsonRpcProvider("http://localhost:8545");

// Function to fetch transactions from Etherscan
const fetchTransactions = async (contractAddress) => {
  const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "1") {
      return data.result; // This returns an array of transactions
    } else {
      console.log("Error fetching transactions: ", data.message);
      return [];
    }
  } catch (error) {
    console.error("Error fetching transactions: ", error);
    return [];
  }
};

const traceTransaction = async (txHash) => {
  try {
    console.log(`Tracing transaction: ${txHash}`);
    const traceResult = await provider.send("debug_traceTransaction", [txHash]);

    // Store trace logs in tx_logs.json
    const logFilePath = "tx_logs.json";

    // Prepare the data to be stored, excluding returnValue
    const logData = {
      transactionHash: txHash,
      failed: traceResult.failed,
      gas: traceResult.gas,
      structLogs: traceResult.structLogs || [], // Ensure structLogs exists
    };

    // Check if the file already exists to append or create a new one
    let existingData = [];
    if (fs.existsSync(logFilePath)) {
      const rawData = fs.readFileSync(logFilePath);
      existingData = JSON.parse(rawData); // Parse existing data
    }

    // Append new trace log to existing data
    existingData.push(logData);

    // Write the updated data back to tx_logs.json
    fs.writeFileSync(logFilePath, JSON.stringify(existingData, null, 2)); // Pretty print JSON
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

  const logFilePath = "tx_logs.json";
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

// Main function to fetch transactions and trace them for SSTORE gas usage
const main = async () => {
  //   const transactions = await fetchTransactions(contractAddress);

  //   for (const tx of transactions) {
  //     console.log(`Tracing transaction: ${tx.hash}`);
  //     const traceLogs = await traceTransaction(tx.hash);

  //     if (traceLogs && traceLogs.length > 0) {
  //       const sstoreGasUsed = calculateSSTOREGas(traceLogs);
  //       console.log(`Transaction Hash: ${tx.hash}`);
  //       console.log(`Block Number: ${tx.blockNumber}`);
  //       console.log(`SSTORE Gas Used: ${sstoreGasUsed}`);
  //     } else {
  //       console.log(`No trace logs found for transaction: ${tx.hash}`);
  //     }
  //   }

  const txHash =
    "0x523fa38226934039fd9d6bfe0eb0fc10b01dfe725344e5afc78dfc164542d0fe";

  console.log(`Tracing transaction: ${txHash}`);
  //   const traceLogs = await traceTransaction(txHash);

  const sstoreGasUsed = calculateSSTOREGas();
};

main();

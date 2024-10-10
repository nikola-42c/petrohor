const axios = require("axios");
const fs = require("fs");
const csv = require("csv-parser");
require("dotenv").config(); // Make sure your .env file contains the ETHERSCAN_API_KEY

const apiKey = process.env.ETHERSCAN_API_KEY; // Your Etherscan API key
const inputFilePath = "../contracts.csv"; // Path to your CSV file
const outputDir = path.join(__dirname, "../contracts-source"); // Directory where source code will be saved
const delayBetweenRequests = 500; // Half a second delay between each API request

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Function to get the source code for a contract address
async function getContractSource(contractAddress, contractName) {
  const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.status === "1" && response.data.result.length > 0) {
      const contractData = response.data.result[0];
      const sourceCode = contractData.SourceCode || "No source code found.";

      // Save the source code to a file named after the contract
      fs.writeFileSync(
        `${outputDir}/${contractName}_${contractAddress}.sol`,
        sourceCode
      );
      console.log(`Saved source code for ${contractName} (${contractAddress})`);
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

// Function to introduce a delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Read the CSV and fetch source code for the first 10 contracts with a delay
async function processContracts() {
  let contractCount = 0;
  fs.createReadStream(inputFilePath)
    .pipe(csv())
    .on("data", async (row) => {
      if (contractCount < 10) {
        const { ContractAddress, ContractName } = row;

        // Fetch the contract source and wait for the delay
        await getContractSource(ContractAddress, ContractName);
        await delay(delayBetweenRequests);

        contractCount++;
      }
    })
    .on("end", () => {
      console.log("Finished processing CSV.");
      console.log(`${contractCount} fetched.`);
    });
}

processContracts();

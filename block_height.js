import { ethers } from "ethers";
import dotenv from "dotenv"; // Importing dotenv

dotenv.config();

async function getBlockFromTimestamp(timestamp) {
  // Load Alchemy API key from environment variable
  const alchemyApiKey = process.env.ALCHEMY_API_KEY;

  // Connect to the Ethereum mainnet (or forked node, if applicable)
  const provider = new ethers.JsonRpcProvider(
    `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
  );

  // Use a binary search approach to find the block closest to the timestamp
  const latestBlock = await provider.getBlock("latest"); // Get the latest block to start with
  let low = 0;
  let high = latestBlock.number;
  let closestBlock = null;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const block = await provider.getBlock(mid);

    if (block.timestamp < timestamp) {
      low = mid + 1;
    } else {
      high = mid - 1;
      closestBlock = block;
    }
  }

  if (closestBlock) {
    console.log(
      `Closest block number to timestamp ${timestamp} is: ${closestBlock.number}`
    );
    return closestBlock.number;
  } else {
    console.log(`No block found for the given timestamp ${timestamp}`);
  }
}

// Run the function with your timestamp
getBlockFromTimestamp(1719100800); // Replace with your timestamp

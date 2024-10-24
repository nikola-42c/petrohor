require("dotenv").config();

module.exports = {
  solidity: "0.8.27",
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        block: process.env.parseInt(process.env.START_BLOCK, 10) || 20150670,
      },
    },
  },
};

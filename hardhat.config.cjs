require("dotenv").config();

module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        loggingEnabled: true,
      },
    },
  },
};

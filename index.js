const { readContracts } = require("./code/reader");
const { analyzeContracts } = require("./code/analyzer");

const main = async () => {
  const contracts = readContracts();
  analyzeContracts(contracts);
};

main().catch((err) => console.error(err));

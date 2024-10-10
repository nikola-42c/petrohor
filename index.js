const { readContracts } = require("./code/reader");
const { parseContracts } = require("./code/parser");
const { analyzeContracts } = require("./code/analyzer");

const contracts = readContracts();
const parsedContracts = parseContracts(contracts);
analyzeContracts(parsedContracts);

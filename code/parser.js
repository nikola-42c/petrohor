const parser = require("@solidity-parser/parser");

// ostaviti u JS
const parseContracts = (contracts) => {
  return contracts.map(({ file, input }) => {
    try {
      const ast = parser.parse(input);
      return { file, ast };
    } catch (e) {
      console.error(`Error parsing ${file}:`, e.message);
      return { file, ast: null };
    }
  });
};

// prepisati u C
const parseLoops = (loopTypes, statements, maxNested) => {
  let nestedLevels = 0;

  for (const statement of statements) {
    if (loopTypes.has(statement.type)) {
      nestedLevels =
        1 + parseLoops(loopTypes, statement.body.statements || [], maxNested);

      maxNested.value = Math.max(maxNested.value, nestedLevels);
    }
  }

  return nestedLevels;
};

module.exports = {
  parseContracts,
  parseLoops,
};

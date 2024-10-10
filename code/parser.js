const parser = require("@solidity-parser/parser");

const parseContracts = (contracts) => {
  return contracts.map(({ file, input }) => {
    try {
      const ast = parser.parse(input);
      return { file, ast };
    } catch (e) {
      console.error(`Error parsing ${file}:`, e.message);
      return { file, ast: null }; // Return null AST on error
    }
  });
};

const parseLoops = (loopTypes, statements, maxNested) => {
  let nestedLevels = 0;
  for (const statement of statements) {
    if (loopTypes.has(statement.type)) {
      nestedLevels++;
      nestedLevels += parseLoops(
        loopTypes,
        statement.body.statements || [], // Use empty array if body.statements is undefined
        maxNested
      );
    }
  }

  maxNested.value = Math.max(maxNested.value, nestedLevels);
  return nestedLevels;
};

module.exports = {
  parseContracts,
  parseLoops,
};

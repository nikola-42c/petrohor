const parser = require("@solidity-parser/parser");

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

const parseLoops = (loopTypes, statements, maxNested) => {
  let currentNesting = 0;
  let maxCurrentNesting = 0;

  for (const statement of statements) {
    if (loopTypes.has(statement.type)) {
      currentNesting++;

      const bodyNested = parseLoops(
        loopTypes,
        statement.body.statements || [],
        maxNested
      );

      maxCurrentNesting = Math.max(
        currentNesting + bodyNested,
        maxCurrentNesting
      );

      maxNested.value = Math.max(maxNested.value, currentNesting + bodyNested);
    }
    currentNesting = 0;
  }

  return maxCurrentNesting;
};

module.exports = {
  parseContracts,
  parseLoops,
};

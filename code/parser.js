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
  let maxNestedInCurrent = 0;

  for (const statement of statements) {
    if (loopTypes.has(statement.type)) {
      currentNesting++;

      const bodyNested = parseLoops(
        loopTypes,
        statement.body.statements || [],
        maxNested
      );

      // since curerntNesting has to be reset,
      // in order to return the amount of nesting found
      // we need to keep track of it
      maxNestedInCurrent = Math.max(
        currentNesting + bodyNested,
        maxNestedInCurrent
      );

      // cannot return this as then same loop will get counter multiple times
      maxNested.value = Math.max(maxNested.value, currentNesting + bodyNested);
    }
    // needs to reset after every loop so loops
    // do not get added together
    currentNesting = 0;
  }

  return maxNestedInCurrent;
};

module.exports = {
  parseContracts,
  parseLoops,
};

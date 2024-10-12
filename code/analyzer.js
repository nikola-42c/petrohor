const { parseLoops } = require("./parser");

const analyzeContracts = (contracts) => {
  const loopTypes = new Set([
    "WhileStatement",
    "DoWhileStatement",
    "ForStatement",
  ]);

  let overallMaxNesting = 0;

  contracts.forEach(({ file, ast }) => {
    if (!ast) return;

    let maxNestingForContract = { value: 0 };
    try {
      for (const node of ast.children) {
        if (node.type === "PragmaDirective") {
          continue;
        }

        for (const subNode of node.subNodes) {
          if (
            subNode.type === "FunctionDefinition" &&
            subNode.body &&
            subNode.body.type === "Block"
          ) {
            parseLoops(
              loopTypes,
              subNode.body.statements,
              maxNestingForContract
            );
          }
        }
      }

      console.log(`Max nesting in ${file}:`, maxNestingForContract.value);

      overallMaxNesting = Math.max(
        overallMaxNesting,
        maxNestingForContract.value
      );
    } catch (err) {
      console.error(`Error: ${err} - file: ${file}`);
    }
  });

  console.log("Overall max nesting across contracts:", overallMaxNesting);
};

module.exports = {
  analyzeContracts,
};

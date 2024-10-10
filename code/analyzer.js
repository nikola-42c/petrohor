const { parseLoops } = require("./parser");

const analyzeContracts = (contracts) => {
  const loopTypes = new Set([
    "WhileStatement",
    "DoWhileStatement",
    "ForStatement",
  ]);

  let overallMaxNesting = { value: 0 };

  contracts.forEach(({ file, ast }) => {
    if (!ast) return;

    let maxNesting = { value: 0 };

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
          parseLoops(loopTypes, subNode.body.statements, maxNesting);
        }
      }
    }

    console.log(`Max nesting in ${file}:`, maxNesting.value);
    overallMaxNesting.value = Math.max(
      overallMaxNesting.value,
      maxNesting.value
    );
  });

  console.log("Overall max nesting across contracts:", overallMaxNesting.value);
};

module.exports = {
  analyzeContracts,
};

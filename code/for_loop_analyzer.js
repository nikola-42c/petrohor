const { parseLoops } = require("./parser");
const { readContractASTs } = require("./ast_reader");

const analyzeForLoops = (contracts) => {
  const loopTypes = new Set([
    "WhileStatement",
    "DoWhileStatement",
    "ForStatement",
  ]);

  let overallMaxNesting = 0;
  let overallMaxNestingFile = "";
  let maxNestingHist = new Array(5).fill(0);
  let totalContractCount = 0;

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
      maxNestingHist[maxNestingForContract.value]++;
      totalContractCount++;

      if (maxNestingForContract.value > overallMaxNesting) {
        overallMaxNesting = maxNestingForContract.value;
        overallMaxNestingFile = file;
      }
    } catch (err) {
      console.error(`${err} - file: ${file}`);
    }
  });

  console.log("-------------------------------------------");
  console.log("---------- FOR LOOP STAT SUMMARY ----------");
  console.log("-------------------------------------------");
  console.log("Overall max nesting across contracts:", overallMaxNesting);
  console.log("File name with max nesting:", overallMaxNestingFile);

  console.log("Max nesting histogram:");
  maxNestingHist.forEach((count, depth) => {
    console.log(`Nesting depth ${depth}: ${count}`);
  });
  console.log("Total:", totalContractCount);
};

async function main() {
  const contractASTs = readContractASTs();
  analyzeForLoops(contractASTs);
}

async function main() {
  const contractASTs = readContractASTs();
  analyzeForLoops(contractASTs);
  return Promise.resolve();
}

module.exports = main;

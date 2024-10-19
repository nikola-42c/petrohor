import parseLoops from "./parser.js";
import readContractASTs from "./ast_reader.js";
import { createObjectCsvWriter } from "csv-writer"; // Use ES module import

const analyzeForLoops = async (contracts) => {
  const loopTypes = new Set([
    "WhileStatement",
    "DoWhileStatement",
    "ForStatement",
  ]);

  let overallMaxNesting = 0;
  let overallMaxNestingFile = "";
  let maxNestingHist = new Array(5).fill(0);
  let totalContractCount = 0;

  // Set up CSV writer
  const writer = createObjectCsvWriter({
    path: "./for_loop_output.csv", // Path to the CSV file
    header: [
      { id: "file", title: "File Name" },
      { id: "maxNesting", title: "Max Nesting" },
    ],
  });

  const records = []; // Array to hold records for CSV writing

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

      // Add record to array for CSV writing
      records.push({ file, maxNesting: maxNestingForContract.value });

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

  // Write records to CSV
  await writer.writeRecords(records);

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
  await analyzeForLoops(contractASTs); // Ensure the function is awaited
}

export default main;

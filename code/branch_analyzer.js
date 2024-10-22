import parseLoops from "./for_loop_parser.js";
import readContractASTs from "./ast_reader.js";
import { createObjectCsvWriter } from "csv-writer"; // Use ES module import
import parser from "@solidity-parser/parser";
import fs from "fs";

const parseBranch = (branch, maxNested) => {
  console.log("[PARSE BRANCH] - ", branch);
  let maxLocal = 0;
  if (branch.type === "Block") {
    for (const statement of branch.statements) {
      console.log("[LOOPING OVER STATEMENTS] -", statement);
      let local = parseIfStatements(statement, maxNested);
      maxLocal = Math.max(maxLocal, local);
    }

    return maxLocal;
  } else {
    return parseIfStatements(branch, maxNested);
  }
};

const parseIfStatements = (statement, maxNested) => {
  if (statement.type !== "IfStatement") return 0;

  let nestedLevels = 0;
  let nestedTrue = 0;
  let nestedFalse = 0;

  console.log("Parsing true...");
  nestedTrue = 1 + parseBranch(statement.trueBody, maxNested);
  console.log("[NESTED TRUE] - ", nestedTrue);
  if (statement.falseBody) {
    console.log("Parsing false...");
    nestedFalse = 1 + parseBranch(statement.falseBody, maxNested);
    console.log("[NESTED FALSE] - ", nestedFalse);
  }

  nestedLevels = Math.max(nestedLevels, nestedTrue, nestedFalse);
  console.log("[MAX NESTED IN CONTRACT] - ", nestedLevels);
  maxNested.value = Math.max(maxNested.value, nestedLevels);
  console.log("[OVERALL MAX] - ", maxNested.value);

  return nestedLevels;
};

const analyzeBranches = async () => {
  const solidityFilePath = "./test.sol";
  const fileContent = fs.readFileSync(solidityFilePath, "utf-8");

  try {
    const ast = parser.parse(fileContent);

    let maxNestingForContract = { value: 0 };

    for (const node of ast.children) {
      if (node.type === "PragmaDirective") continue;

      for (const subnode of node.subNodes) {
        if (
          subnode.type === "FunctionDefinition" &&
          subnode.body.type === "Block"
        ) {
          for (const statement of subnode.body.statements) {
            if (statement.type !== "IfStatement") continue;
            console.log(statement);
            parseIfStatements(statement, maxNestingForContract);
          }
        }
      }
    }

    console.log("Max nesting:", maxNestingForContract.value);
  } catch (error) {
    console.error(`Failed to parse Solidity file: ${solidityFilePath}`, error);
  }
};

async function main() {
  await analyzeBranches();
}

main();

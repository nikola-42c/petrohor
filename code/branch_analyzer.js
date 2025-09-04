import { createObjectCsvWriter } from "csv-writer"; // Use ES module import
import fs from "fs";
import path from "path";

var verbose = false;

const sourceDir = path.join(process.cwd(), "../contracts_ast");

const readContractASTs = () => {
  const files = fs.readdirSync(sourceDir);
  const contracts = [];

  files.forEach((file) => {
    if (path.extname(file) === ".json") {
      const filePath = path.join(sourceDir, file);
      try {
        const input = fs.readFileSync(filePath, "utf-8");

        const ast = JSON.parse(input);

        contracts.push({ file, ast });
      } catch (e) {
        console.error(`Error reading or parsing ${file}:`, e.message);
      }
    }
  });

  return contracts;
};

const isAssert = (statement) => {
  return (
    statement.expression &&
    statement.expression.expression &&
    statement.expression.expression.name === "assert"
  );
};

const isRequire = (statement) => {
  return (
    statement.expression &&
    statement.expression.expression &&
    statement.expression.expression.name === "require"
  );
};

const isTernaryBranch = (statement) => {
  return statement.type === "Conditional";
};

const isTernaryExpression = (statement) => {
  return (
    statement.type === "ExpressionStatement" &&
    statement.expression &&
    statement.expression.right &&
    statement.expression.right.type === "Conditional"
  );
};

const isTernaryReturn = (statement) => {
  return (
    statement.type === "ReturnStatement" &&
    statement.expression &&
    statement.expression.type === "Conditional"
  );
};

/* Ternary:
  - expression ako:
    statement.type === "ExpressionStatement" && statement.expression.right.type === "Conditional"
    - ako je type === "Conditional" onda ce imati "trueExpression" i "falseExpression" rekurzivno
  
  - return ako:
    statement.type === "ReturnStatement" && statement.expression.type === "Conditional"
*/

const parseTernaryBranch = (branch, maxNested) => {
  if (verbose) console.log("[PARSE TERNARY BRANCH] - ", branch);
  if (branch.type !== "Conditional") return 0;
  return parseTernaryStatement(branch, maxNested);
};

const parseTernaryStatement = (statement, maxNested) => {
  if (isTernaryExpression(statement)) {
    statement = statement.expression.right;
  }

  if (isTernaryReturn(statement)) {
    statement = statement.expression;
  }

  if (false == isTernaryBranch(statement)) return 0;

  if (verbose) console.log("[PARSING TERNARY]");
  if (verbose) console.log("[STATEMENT] - ", statement);
  if (verbose) console.log("Parsing ternary true...");

  let nestedTrue = 1 + parseTernaryBranch(statement.trueExpression, maxNested);

  if (verbose) console.log("[NESTED TRUE TERNARY] - ", nestedTrue);
  if (verbose) console.log("Parsing ternary false...");
  let nestedFalse =
    1 + parseTernaryBranch(statement.falseExpression, maxNested);
  if (verbose) console.log("[NESTED FALSE TERNARY] - ", nestedFalse);

  let nestedLevels = Math.max(nestedTrue, nestedFalse);
  if (verbose)
    console.log("[MAX NESTED TERNARIES IN CONTRACT] - ", nestedLevels);
  maxNested.value = Math.max(maxNested.value, nestedLevels);
  if (verbose) console.log("[OVERALL TERNARY MAX] - ", maxNested.value);

  return nestedLevels;
};

const parseIfBranch = (branch, maxNested) => {
  if (verbose) console.log("[PARSE IF BRANCH] - ", branch);

  let maxLocal = 0;
  if (branch.type === "Block") {
    for (const statement of branch.statements) {
      if (verbose) console.log("[LOOPING OVER STATEMENTS] -", statement);

      const localIf = parseIfStatements(statement, maxNested);
      const localTernary = parseTernaryStatement(statement, maxNested);

      maxLocal = Math.max(maxLocal, localIf, localTernary);
    }

    return maxLocal;
  } else {
    return parseIfStatements(branch, maxNested);
  }
};

const parseIfStatements = (statement, maxNested) => {
  if (isAssert(statement) || isRequire(statement)) {
    if (verbose) console.log("[FOUND ASSERT OR REQUIRE]");
    return 1;
  }

  if (statement.type !== "IfStatement") return 0;
  if (verbose) console.log("[PARSING IF]");

  let nestedFalse = 0;

  if (verbose) console.log("Parsing if true...");
  let nestedTrue = 1 + parseIfBranch(statement.trueBody, maxNested);
  if (verbose) console.log("[NESTED TRUE IF] - ", nestedTrue);
  if (statement.falseBody) {
    if (verbose) console.log("Parsing if false...");
    nestedFalse = 1 + parseIfBranch(statement.falseBody, maxNested);
    if (verbose) console.log("[NESTED FALSE IF] - ", nestedFalse);
  }

  let nestedLevels = Math.max(nestedTrue, nestedFalse);
  if (verbose) console.log("[MAX NESTED IFS IN CONTRACT] - ", nestedLevels);
  maxNested.value = Math.max(maxNested.value, nestedLevels);
  if (verbose) console.log("[OVERALL IF MAX] - ", maxNested.value);

  return nestedLevels;
};

const analyzeBranches = async (contracts) => {
  if (process.argv[2] && process.argv[2] === "-v") {
    verbose = true;
  } else if (process.argv[2] && process.argv[2] === "-vv") {
    verbose = true;
    console.log("AST:", JSON.stringify(ast, null, 2));
    console.log("*********************************************");
  }

  let overallMaxNesting = 0;
  let overallMaxNestingFile = "";
  let maxNestingHist = new Array(15).fill(0);
  let totalContractCount = 0;

  // Set up CSV writer
  const writer = createObjectCsvWriter({
    path: "../branching_output.csv",
    header: [
      { id: "file", title: "File Name" },
      { id: "contract", title: "Contract Name" },
      { id: "maxNesting", title: "Max Nesting" },
    ],
  });

  const records = [];

  contracts.forEach(({ file, ast }) => {
    if (!ast) return;

    try {
      let maxNestingForContract = { value: 0 };

      for (const node of ast.children) {
        if (node.type === "PragmaDirective") continue;
        if (node.type !== "ContractDefinition" && node.type !== "LibraryDefinition") {
          continue;
        }
        if (node.kind && node.kind == "interface") {
          continue;
        }

        let maxNestingForThisContract = { value: 0 }

        // if (!node.subNodes) continue;

        for (const subnode of node.subNodes || []) {
          if (
            subnode.type === "FunctionDefinition" &&
            subnode.body &&
            subnode.body.type === "Block"
          ) {
            for (const statement of subnode.body.statements) {
              if (verbose) console.log("[CURRENT STATEMENT] - ", statement);
              const ifDepth = parseIfStatements(statement, maxNestingForThisContract);
              const ternaryDepth = parseTernaryStatement(statement, maxNestingForThisContract);

              const localMax = Math.max(ifDepth, ternaryDepth);
              maxNestingForThisContract.value = Math.max(
                maxNestingForThisContract.value,
                localMax
              )
            }
          }
        }

        records.push({ file, contract:node.name, maxNesting: maxNestingForThisContract.value });

        maxNestingHist[maxNestingForThisContract.value]++;
        totalContractCount++;

        if (maxNestingForThisContract.value > overallMaxNesting) {
          overallMaxNesting = maxNestingForThisContract.value;
          overallMaxNestingFile = file;
        }
      }
    } catch (err) {
      console.error(`${err} - file: ${file}`);
    }
  });

  await writer.writeRecords(records);

  console.log("-------------------------------------------");
  console.log("--------- BRANCHING STAT SUMMARY ----------");
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
  await analyzeBranches(contractASTs);
}

main();

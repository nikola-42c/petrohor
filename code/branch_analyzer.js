import parseLoops from "./for_loop_parser.js";
import readContractASTs from "./ast_reader.js";
import { createObjectCsvWriter } from "csv-writer"; // Use ES module import
import parser from "@solidity-parser/parser";
import fs from "fs";

var verbose = false;

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

const analyzeBranches = async () => {
  const solidityFilePath = "./test.sol";
  const fileContent = fs.readFileSync(solidityFilePath, "utf-8");

  try {
    const ast = parser.parse(fileContent);

    if (process.argv[2] && process.argv[2] === "-v") {
      verbose = true;
    } else if (process.argv[2] && process.argv[2] === "-vv") {
      verbose = true;
      console.log("AST for test.sol:", JSON.stringify(ast, null, 2));
      console.log("*********************************************");
    }

    let maxNestingForContract = { value: 0 };

    for (const node of ast.children) {
      if (node.type === "PragmaDirective") continue;

      for (const subnode of node.subNodes) {
        if (
          subnode.type === "FunctionDefinition" &&
          subnode.body.type === "Block"
        ) {
          for (const statement of subnode.body.statements) {
            if (verbose) console.log("[CURRENT STATEMENT] - ", statement);
            parseIfStatements(statement, maxNestingForContract);
            parseTernaryStatement(statement, maxNestingForContract);
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

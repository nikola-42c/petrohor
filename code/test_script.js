// scripts/build-test-ast.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import parser from "@solidity-parser/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const testCodeDir = path.join(projectRoot, "test_code"); // input dir
const astOutputDir = path.join(projectRoot, "test_ast"); // output dir for JSONs

// Ensure output dir exists
if (!fs.existsSync(astOutputDir)) {
  fs.mkdirSync(astOutputDir, { recursive: true });
}

// Read all .sol files in test-code dir
const files = fs.readdirSync(testCodeDir).filter((f) => f.endsWith(".sol"));

if (files.length === 0) {
  console.log("No .sol files found in test_code/");
  process.exit(0);
}

for (const file of files) {
  const filePath = path.join(testCodeDir, file);
  const astFilePath = path.join(astOutputDir, file.replace(/\.sol$/, ".json"));

  try {
    const sourceCode = fs.readFileSync(filePath, "utf8");
    const ast = parser.parse(sourceCode);

    fs.writeFileSync(astFilePath, JSON.stringify(ast, null, 2), "utf8");
    console.log(`Parsed ${file} → ${path.relative(projectRoot, astFilePath)}`);
  } catch (err) {
    console.error(`Failed to parse ${file}:`);
    if (err.errors && Array.isArray(err.errors)) {
      for (const e of err.errors) {
        console.error(`- ${e.message} at line ${e.line}, column ${e.column}`);
      }
    } else {
      console.error(err.message);
    }
  }
}

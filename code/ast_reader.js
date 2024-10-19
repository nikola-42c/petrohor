import fs from "fs";
import path from "path";

const sourceDir = path.join(process.cwd(), "/contracts_ast");

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

export default readContractASTs;

const fs = require("fs");
const path = require("path");

const sourceDir = path.join(__dirname, "../contracts-source");

const readContracts = () => {
  const files = fs.readdirSync(sourceDir);
  const contracts = [];

  files.forEach((file) => {
    if (path.extname(file) === ".sol") {
      const filePath = path.join(sourceDir, file);
      try {
        const input = fs.readFileSync(filePath, "utf-8");
        contracts.push({ file, input });
      } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
      }
    }
  });

  return contracts;
};

module.exports = {
  readContracts,
};

import fs from "fs";
import path from "path";
import { createObjectCsvWriter } from "csv-writer"; // Import the CSV writer

// Function to count SSTORE occurrences in bytecode
function countSstoreOccurrences(bytecode) {
  try {
    bytecode = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
    const sstoreOpcode = 0x55; // Hex value for SSTORE opcode

    let sstoreCount = 0;

    // Loop through the bytecode and count SSTORE occurrences
    for (let i = 0; i < bytecode.length; i += 2) {
      const opcode = parseInt(bytecode.slice(i, i + 2), 16); // Read byte by byte

      if (opcode === sstoreOpcode) {
        sstoreCount++;
      }
    }

    return sstoreCount;
  } catch (error) {
    console.error("[COUNT SSTORE ERROR]:", error.message);
    return 0; // Return 0 on error to avoid breaking the counting logic
  }
}

async function main() {
  const bytecodesDir = path.join(process.cwd(), "../contracts_bytecode");
  const bytecodeFiles = fs.readdirSync(bytecodesDir); // Read files from the directory

  let successfulSstoreCount = 0; // Counter for successful SSTORE counts
  let totalSstoreCount = 0; // Total SSTORE counts for averaging
  let maxSstoreCount = -Infinity; // Maximum SSTORE count
  let maxFileName = ""; // File name with maximum SSTORE count
  let sstoreHist = new Array(210).fill(0);

  // Set up CSV writer
  const writer = createObjectCsvWriter({
    path: "../sstore_output.csv", // Path to the CSV file
    header: [
      { id: "fileName", title: "File Name" },
      { id: "sstoreCount", title: "SSTORE Count" },
    ],
  });

  const records = []; // Array to hold records for CSV writing

  for (const fileName of bytecodeFiles) {
    const filePath = path.join(bytecodesDir, fileName); // Construct full file path
    const bytecode = fs.readFileSync(filePath, "utf-8").trim(); // Read bytecode file

    try {
      const sstoreCount = countSstoreOccurrences(bytecode);

      totalSstoreCount += sstoreCount;
      successfulSstoreCount++;
      sstoreHist[sstoreCount]++;

      if (sstoreCount > maxSstoreCount) {
        maxSstoreCount = sstoreCount;
        maxFileName = fileName;
      }

      // Add record to array for CSV writing
      records.push({ fileName, sstoreCount });
    } catch (error) {
      console.error(`Error processing ${fileName}: ${error.message}`);
    }
  }

  // Write records to CSV
  await writer.writeRecords(records);

  const averageSstoreCount =
    successfulSstoreCount > 0 ? totalSstoreCount / successfulSstoreCount : 0;

  console.log("-------------------------------------------");
  console.log("---------- SSTORE STAT SUMMARY ------------");
  console.log("-------------------------------------------");
  console.log(`Total successful SSTORE counts: ${successfulSstoreCount}`);
  console.log(`Maximum SSTORE count: ${maxSstoreCount} in ${maxFileName}`);
  console.log(`Average SSTORE count: ${averageSstoreCount}`);
  // console.log("SSTORE histogram:");
  // sstoreHist.forEach((count, sstores) => {
  //   if (count > 0)
  //     console.log(`${sstores} SSTOREs found in ${count} contracts.`);
  // });
}

main();

import forLoopAnalyzer from "./code/for_loop_analyzer.js";
import sstoreAnalyzer from "./code/sstore_analyzer.js";

forLoopAnalyzer()
  .then(() => {
    console.log("For loops analyzing completed successfully.");
    return sstoreAnalyzer();
  })
  .then(() => {
    console.log("SSTORE analyzing completed successfully.");
  })
  .catch((error) => {
    console.error("An error occurred:", error.message);
  });

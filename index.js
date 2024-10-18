const forLoopAnalyzer = require("./code/for_loop_analyzer");
const sstoreAnalyzer = require("./code/sstore_analyzer");

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

// scripts/analyze-ast.js
// Usage: node scripts/analyze-ast.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const astDir = path.join(projectRoot, "test_ast");
if (!fs.existsSync(astDir)) {
  console.error(`Directory not found: ${astDir}`);
  process.exit(1);
}

const BASE_CALL_DEPTH = 0;
const IDENT_WEIGHT_0 = new Set([
  "assert",
  "require",
  "blockhash",
  "blobhash",
  "gasleft",
  "addmod",
  "mulmod",
  "mullmod",
  "keccak256",
  "revert",
]);
const IDENT_WEIGHT_1 = new Set([
  "sha256",
  "ripemd160",
  "ecrecover",
  "selfdestruct",
]);

// MemberAccess helpers
const ABI_1 = new Set(["decode"]);
const ABI_2 = new Set([
  "encode",
  "encodePacked",
  "encodeWithSelector",
  "encodeWithSignature",
  "encodeCall",
]);
const BYTES_2 = new Set(["concat"]);
const STRING_2 = new Set(["concat"]);
const ADDR_1 = new Set(["call", "delegatecall", "staticcall"]);
const ADDR_2 = new Set(["transfer", "send"]);

/* ------------------------------- AST helpers ------------------------------ */
function children(node) {
  if (!node) return [];
  if (Array.isArray(node)) return node;
  if (typeof node === "object") {
    const out = [];
    for (const [k, v] of Object.entries(node)) {
      if (k === "type") continue;
      if (v && typeof v === "object") out.push(v);
    }
    return out.flat();
  }
  return [];
}

// regex for `bytes` and `u/int` casts
function isElementaryTypeIdentifier(expr) {
  // Matches: address, payable, bool, string, bytes, byte, bytes1..bytes32, uint, uint8..uint256, int, int8..int256
  if (!expr || expr.type !== "Identifier") return false;
  const n = expr.name;
  if (
    n === "address" ||
    n === "payable" ||
    n === "bool" ||
    n === "string" ||
    n === "bytes" ||
    n === "byte"
  )
    return true;
  if (/^bytes(?:[1-9]|1[0-9]|2[0-9]|3[0-2])$/.test(n)) return true;
  if (
    /^(?:u?int)(?:8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/.test(
      n
    )
  )
    return true;
  return false;
}

// makes casts cost 0
function isTypeConversionCall(node) {
  // True for: payable(x), address(y), uint256(z), bytes32(t), etc.
  if (!node || node.type !== "FunctionCall") return false;
  const expr = node.expression;
  if (!expr || typeof expr !== "object") return false;
  return (
    expr.type === "ElementaryTypeNameExpression" ||
    expr.type === "TypeNameExpression" ||
    expr.type === "ElementaryTypeName" ||
    isElementaryTypeIdentifier(expr)
  );
}

// Name for user-defined calls.
// We now return Identifier name OR MemberAccess.memberName
// (so `Lib.foo(...)` counts as user-defined if there's a function named `foo`)
function calleeNameForUserDefined(expr, userFuncs) {
  if (!expr || typeof expr !== "object") return null;
  if (expr.type === "Identifier")
    return userFuncs.has(expr.name) ? expr.name : null;
  if (expr.type === "MemberAccess") {
    const m = expr.memberName;
    return userFuncs.has(m) ? m : null;
  }
  return null;
}

// Builtin weight by callee expression (Identifier or MemberAccess)
function builtinWeight(expr) {
  if (!expr || typeof expr !== "object") return null;

  if (expr.type === "Identifier") {
    const name = expr.name || "";
    if (IDENT_WEIGHT_0.has(name)) return 0;
    if (IDENT_WEIGHT_1.has(name)) return 1;
    // Not listed → unknown identifier builtin
    return null;
  }

  if (expr.type === "MemberAccess") {
    const member = expr.memberName || "";
    const base = expr.expression;

    // abi.*
    if (base && base.type === "Identifier" && base.name === "abi") {
      if (ABI_1.has(member)) return 1;
      if (ABI_2.has(member)) return 2;
      return null;
    }

    // bytes.concat / string.concat
    if (
      base &&
      base.type === "Identifier" &&
      base.name === "bytes" &&
      BYTES_2.has(member)
    )
      return 2;
    if (
      base &&
      base.type === "Identifier" &&
      base.name === "string" &&
      STRING_2.has(member)
    )
      return 2;

    // low-level address ops: .call/.delegatecall/.staticcall (1), .transfer/.send (2)
    if (ADDR_1.has(member)) return 1;
    if (ADDR_2.has(member)) return 2;

    return null;
  }

  return null;
}

function isCallNode(node) {
  return (
    node &&
    (node.type === "FunctionCall" || node.type === "FunctionCallOptions")
  );
}

// All call-argument-ish children except the callee `expression` itself
function callArgishChildren(node) {
  if (!node || typeof node !== "object") return [];
  const out = [];
  for (const [k, v] of Object.entries(node)) {
    if (k === "type" || k === "expression") continue;
    if (v && typeof v === "object") out.push(v);
  }
  return out.flat();
}

/* ---------------------------- Analyzer per file --------------------------- */
function analyzeAst(ast, filename) {
  const functions = new Map();
  (function collect(node) {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(collect);
    if (typeof node === "object") {
      if (node.type === "FunctionDefinition" && node.name) {
        functions.set(node.name, node);
      }
      for (const v of Object.values(node)) collect(v);
    }
  })(ast);

  const userFuncs = new Set(functions.keys());
  const memo = new Map();
  const inProgress = new Set();

  function countFuncDepth(funcName) {
    if (!functions.has(funcName)) return 0;
    if (memo.has(funcName)) return memo.get(funcName);
    if (inProgress.has(funcName)) return 1; // recursion guard: count the edge, stop expanding

    inProgress.add(funcName);
    const fdef = functions.get(funcName);
    const body = fdef.body || {};

    function walk(node) {
      if (!node || typeof node !== "object") return BASE_CALL_DEPTH;

      if (isCallNode(node)) {
        const expr = node.expression;
        // Depth in call args (values, nested calls inside args/options)
        const argDepth = Math.max(
          BASE_CALL_DEPTH,
          ...callArgishChildren(node).map(walk)
        );

        // Depth in callee expression (covers odd cases like (factory())())
        const exprDepth = walk(expr);

        // If callee is a user-defined function, expand into it
        const udName = calleeNameForUserDefined(expr, userFuncs);
        const calleeDepth = udName ? countFuncDepth(udName) : BASE_CALL_DEPTH;

        // Weight of THIS call (user-defined → 1, builtin → table, unknown → 1)
        let w;
        if (isTypeConversionCall(node)) {
          w = 0; // casts don't add to depth
        } else if (udName) {
          w = 1; // user-defined calls
        } else {
          const bw = builtinWeight(expr);
          w = bw !== null && bw !== undefined ? bw : 1; // unknown external/lib → defaults to 1
        }

        // Weighted depth of this node is its weight plus the deepest child path
        return w + Math.max(argDepth, exprDepth, calleeDepth);
      }

      // Non-call node: take max over children
      return Math.max(BASE_CALL_DEPTH, ...children(node).map(walk));
    }

    const d = walk(body);
    memo.set(funcName, d);
    inProgress.delete(funcName);
    return d;
  }

  const rows = [];
  for (const name of [...userFuncs].sort()) {
    const fdef = functions.get(name);
    rows.push({
      file: path.basename(filename),
      function: name,
      visibility: fdef.visibility || "",
      stateMutability: fdef.stateMutability || "",
      expanded_max_depth: countFuncDepth(name),
    });
  }
  return rows;
}

/* -------------------------- Process all AST JSONs ------------------------- */
let allRows = [];
const files = fs.readdirSync(astDir).filter((f) => f.endsWith(".json"));
for (const file of files) {
  const fullPath = path.join(astDir, file);
  try {
    const ast = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const rows = analyzeAst(ast, file);
    allRows.push(...rows);
  } catch (err) {
    console.error(`Failed to analyze ${file}: ${err.message}`);
  }
}

if (allRows.length === 0) {
  console.log("No functions found.");
  process.exit(0);
}

console.table(
  allRows.sort(
    (a, b) =>
      b.expanded_max_depth - a.expanded_max_depth ||
      a.file.localeCompare(b.file) ||
      a.function.localeCompare(b.function)
  )
);

const outFile = path.join(astDir, "depths.json");
fs.writeFileSync(outFile, JSON.stringify(allRows, null, 2));
console.log(`\nSaved combined depths → ${outFile}`);

/*
CLI args:
MIN_DEPTH - minimum function depth for table print (default is 0)
TRACE=1 - print stack trace instead of table
TARGET_FUNC=<function name> - the function for which theh stack trace is to be printed
*/

// Usage:
//   MIN_DEPTH=0 node function_analyzer.js
//   TRACE=1 TARGET_FUNC=enterRedemptionQueueWithPermit node code/function_analyzer.js
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

// Flags
const DEBUG_CALLS = process.env.DEBUG_CALLS === "1";
const TRACE = process.env.TRACE === "1";
const TARGET_FUNC = process.env.TARGET_FUNC || "";
const MIN_DEPTH = process.env.MIN_DEPTH ? Number(process.env.MIN_DEPTH) : 0;

// Pretty labels for expressions (for debug/trace printing)
function prettyExpr(expr) {
  if (!expr || typeof expr !== "object") return String(expr);
  if (expr.type === "Identifier") return expr.name;
  if (expr.type === "MemberAccess")
    return `${prettyExpr(expr.expression)}.${expr.memberName}`;
  if (expr.type === "ElementaryTypeName") return expr.name;
  if (expr.type === "ElementaryTypeNameExpression")
    return expr.typeName?.name || "<etype>";
  if (expr.type === "FunctionCall")
    return `${prettyExpr(expr.expression)}(...)`;
  if (expr.type === "FunctionCallOptions")
    return `${prettyExpr(expr.expression)}{...}(...)`;
  if (expr.type === "TupleExpression") return "(...)";
  return expr.type;
}

// Floor for non-call nodes
const BASE_CALL_DEPTH = 0;

/* ----------------------------- Builtin weights -----------------------------
  0 calls: blockhash, blobhash, gasleft, addmod, mulmod, mullmod, keccak256, revert, assert, require
  1 call : sha256, ripemd160, ecrecover, selfdestruct, abi.decode,
           <addr>.call, <addr>.delegatecall, <addr>.staticcall
  2 calls: abi.encode, abi.encodePacked, abi.encodeWithSelector,
           abi.encodeWithSignature, abi.encodeCall,
           bytes.concat, string.concat,
           <address payable>.transfer, <address payable>.send
--------------------------------------------------------------------------- */
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

/* -------------------------------- Helpers -------------------------------- */
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

// Casts are depth 0 (address(x), payable(y), uint256(z), bytes32(t), etc.)
function isElementaryTypeIdentifier(expr) {
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
function isTypeConversionCall(node) {
  if (!node || node.type !== "FunctionCall") return false;
  const expr = node.expression;
  if (!expr || typeof expr !== "object") return false;
  return (
    expr.type === "ElementaryTypeName" ||
    expr.type === "ElementaryTypeNameExpression" ||
    expr.type === "TypeNameExpression" ||
    isElementaryTypeIdentifier(expr)
  );
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

// Heuristic so ERC-20 token.transfer(...) is NOT overcounted as 2:
// treat .transfer/.send as 2 only when the base is clearly an address-like cast.
function isAddressLikeBase(expr) {
  // e.g., payable(target).transfer(...) or address(x).send(...)
  return expr && expr.type === "FunctionCall" && isTypeConversionCall(expr);
}

function builtinWeight(expr) {
  if (!expr || typeof expr !== "object") return null;

  if (expr.type === "Identifier") {
    const name = expr.name || "";
    if (IDENT_WEIGHT_0.has(name)) return 0;
    if (IDENT_WEIGHT_1.has(name)) return 1;
    return null; // unknown identifier
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

    // low-level address ops
    if (ADDR_1.has(member)) return 1;
    if (ADDR_2.has(member)) return isAddressLikeBase(base) ? 2 : 1;

    return null;
  }

  return null;
}

function paramTypes(paramList) {
  if (!Array.isArray(paramList)) return [];
  return paramList.map((p) => {
    if (!p || !p.typeName) return "";
    // Try to normalize names like uint256 vs uint
    if (p.typeName.type === "ElementaryTypeName") {
      return p.typeName.name || "";
    }
    if (p.typeName.type === "UserDefinedTypeName") {
      return p.typeName.namePath || "";
    }
    return p.typeName.name || p.typeName.type || "";
  });
}

function argsMatch(callNode, fi) {
  if (!callNode || !Array.isArray(callNode.arguments)) return true;

  const argCount = callNode.arguments.length;
  const params = fi.node?.parameters?.parameters || [];

  if (params.length !== argCount) return false;

  // Optional: check types (basic match, may need refinement)
  const fnTypes = paramTypes(params);
  // NOTE: the AST for expressions doesn't always give argument types
  // (only for parameters). So we conservatively check only count.
  // You could integrate a type inference pass if you want exact matches.
  return true;
}


/* ---------------------------- Analyzer per file --------------------------- */
function analyzeAst(ast, filename) {
  // We collect function nodes with owner (contract/library) so we can resolve by node, not name.
  const functionInfos = []; // { node, name, owner }
  const functionsByName = new Map(); // name -> FunctionInfo[]
  const libraryNames = new Set();
  const structNames = new Set();
  const eventNames = new Set();

  // For inheritance scoping
  const contractBases = new Map(); // owner -> Set(base names)
  const reachableOwners = new Map(); // owner -> Set(owner ∪ bases ∪ transitive)

  (function collect(node, owner = null) {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach((n) => collect(n, owner));
    if (typeof node === "object") {
      if (
        (node.type === "ContractDefinition" ||
          node.type === "LibraryDefinition") &&
        node.name
      ) {
        owner = node.name;
        // collect base contracts (for contracts only)
        if (node.type === "ContractDefinition") {
          const bases = new Set();
          for (const spec of node.baseContracts || []) {
            // Ethers-solidity-parser usually: spec.baseName: { type: 'UserDefinedTypeName', namePath: 'ERC721' }
            const bn = spec && spec.baseName;
            const base =
              (bn && (bn.name || bn.namePath)) || spec.name || spec.namePath;
            if (base) bases.add(base);
          }
          contractBases.set(owner, bases);
        }
      }
      if (node.type === "LibraryDefinition" && node.name) {
        libraryNames.add(node.name);
      }
      if (node.type === "StructDefinition" && node.name) {
        structNames.add(node.name);
      }
      if (node.type === "EventDefinition" && node.name) {
        eventNames.add(node.name);
      }
      if (node.type === "FunctionDefinition" && node.name) {
        const info = { node, name: node.name, owner: owner || "" };
        functionInfos.push(info);
        const arr = functionsByName.get(node.name) || [];
        arr.push(info);
        functionsByName.set(node.name, arr);
      }
      for (const v of Object.values(node)) collect(v, owner);
    }
  })(ast, null);

  // Compute reachable owners = owner ∪ all bases (transitively)
  function computeReachable(owner) {
    if (reachableOwners.has(owner)) return reachableOwners.get(owner);
    const seen = new Set([owner]);
    const stack = [owner];
    while (stack.length) {
      const cur = stack.pop();
      const bases = contractBases.get(cur);
      if (!bases) continue;
      for (const b of bases) {
        if (!seen.has(b)) {
          seen.add(b);
          stack.push(b);
        }
      }
    }
    reachableOwners.set(owner, seen);
    return seen;
  }
  for (const owner of contractBases.keys()) computeReachable(owner);

  // Treat struct ctor and event emit as 0 (optional; remove if you want them to count)
  function specialNodeWeight(expr) {
    if (!expr || typeof expr !== "object") return null;
    if (expr.type === "Identifier") {
      if (structNames.has(expr.name)) return 0;
      if (eventNames.has(expr.name)) return 0;
    }
    return null;
  }

  // Resolve possible user-defined callee nodes for a call expression.
  // NOTE: we also try to prune by argument count when possible.
  function resolveUserCallees(expr, currentOwner, callNode) {
    if (!expr || typeof expr !== "object") return [];

    // Helper: try to find the single correct overload
    function pickOne(candidates) {
      if (!candidates.length) return [];
      if (candidates.length === 1) return candidates;

      // Strict filter by arg count
      const argCount = Array.isArray(callNode?.arguments)
        ? callNode.arguments.length
        : null;
      if (argCount !== null) {
        const byCount = candidates.filter((fi) => {
          const params = fi.node?.parameters?.parameters || [];
        return params.length === argCount;
      });
        if (byCount.length === 1) return byCount;
        if (byCount.length > 1) candidates = byCount;
      }

      // Fallback: just pick the most-derived (currentOwner first, then first base)
      const own = candidates.filter((fi) => fi.owner === currentOwner);
      if (own.length) return [own[0]];

      // Pick the first base contract match deterministically
      return [candidates[0]];
    }

    // foo(...)
    if (expr.type === "Identifier") {
      const all = functionsByName.get(expr.name) || [];
      if (!currentOwner) return pickOne(all);

      const reach = reachableOwners.get(currentOwner);
      if (reach && reach.size) {
        const scoped = all.filter((fi) => reach.has(fi.owner));
        return pickOne(scoped);
      }
        return pickOne(all);
    }

    // base.member(...)
    if (expr.type === "MemberAccess") {
      const base = expr.expression;
      const member = expr.memberName;

      // Lib.func(...) — only expand into that library's functions
      if (base && base.type === "Identifier" && libraryNames.has(base.name)) {
        const arr = functionsByName.get(member) || [];
        return pickOne(arr.filter((fi) => fi.owner === base.name));
      }

      // this.func(...) — prefer the current contract
      if (base && base.type === "This") {
        const arr = functionsByName.get(member) || [];
        const scoped = arr.filter((fi) => fi.owner === currentOwner);
        return pickOne(scoped.length ? scoped : arr);
      }

      // Any other obj.func(...) is treated as external (no expansion)
      return [];
    }

    // Unknown callee shape
    return [];
  }

  // Memo by NODE (not by name) to avoid conflating different functions
  const memoByNode = new Map(); // node -> { d, t }
  const inProgress = new Set(); // Set<node>

  function countFuncNode(funcInfo) {
    const node = funcInfo.node;
    const owner = funcInfo.owner;

    if (memoByNode.has(node)) return memoByNode.get(node);
    if (inProgress.has(node)) {
      // recursion guard: count the edge; minimal trace
      return { d: 1, t: { kind: "recursion", function: funcInfo.name, owner } };
    }

    inProgress.add(node);
    const fdef = node;
    const body = fdef.body || {};
    const isTarget = !TARGET_FUNC || TARGET_FUNC === funcInfo.name;

    function walk(n) {
      if (!n || typeof n !== "object") return { d: BASE_CALL_DEPTH, t: null };

      if (isCallNode(n)) {
        const expr = n.expression;

        // Recurse into args/expression
        const argTraces = callArgishChildren(n).map(walk);
        const argDepth = Math.max(
          BASE_CALL_DEPTH,
          ...argTraces.map((x) => x.d)
        );
        const argPick = argTraces.sort((a, b) => b.d - a.d)[0] || {
          d: BASE_CALL_DEPTH,
          t: null,
        };

        const exprTrace = walk(expr);
        const exprDepth = exprTrace.d;

        // Resolve user-defined candidates and take the MAX depth among them
        const candidates = resolveUserCallees(expr, owner, n);
        let calleeDepth = BASE_CALL_DEPTH;
        let calleeTrace = { d: BASE_CALL_DEPTH, t: null };
        if (candidates.length) {
          let best = { d: -1, t: null };
          for (const cand of candidates) {
            const res = countFuncNode(cand);
            if (res.d > best.d) best = res;
          }
          calleeDepth = best.d;
          calleeTrace = best;
        }

        // Weight for this call node
        let w;
        if (isTypeConversionCall(n)) {
          w = 0; // casts don't add to depth
        } else {
          const special = specialNodeWeight(expr);
          if (special !== null && special !== undefined) {
            w = special; // struct ctor / event emit → 0
          } else if (candidates.length) {
            w = 1; // user-defined call
          } else {
            const bw = builtinWeight(expr);
            w = bw !== null && bw !== undefined ? bw : 1; // external/unknown
          }
        }

        const maxChild = Math.max(argDepth, exprDepth, calleeDepth);
        const total = w + maxChild;

        let via = "args";
        let child = argPick.t;
        if (calleeDepth >= argDepth && calleeDepth >= exprDepth) {
          via = "callee";
          child = calleeTrace.t;
        } else if (exprDepth > argDepth) {
          via = "expr";
          child = exprTrace.t;
        }

        const traceNode = {
          kind: "call",
          expr: prettyExpr(expr),
          weight: w,
          parts: { arg: argDepth, expr: exprDepth, callee: calleeDepth },
          via,
          callee: candidates.length ? "(user-defined)" : null,
          child,
        };

        if (DEBUG_CALLS && isTarget) {
          console.log(
            `[CALL] ${traceNode.expr}  w=${w}  arg=${argDepth}  expr=${exprDepth}  callee=${calleeDepth}  -> total=${total}  via:${via}`
          );
        }

        return { d: total, t: TRACE ? traceNode : null };
      }

      // Non-call node: pick deepest child
      const kids = children(n).map(walk);
      const best = kids.sort((a, b) => b.d - a.d)[0];
      return best || { d: BASE_CALL_DEPTH, t: null };
    }

    const res = walk(body);
    memoByNode.set(node, res);
    inProgress.delete(node);
    return res;
  }

  // Build rows + traces
  const rows = [];
  const traces = []; // list of { file, contract, function, depth, trace }

  for (const fi of functionInfos) {
    const { d, t } = countFuncNode(fi);
    const fdef = fi.node;
    rows.push({
      file: path.basename(filename),
      contract: fi.owner || "",
      function: fi.name,
      visibility: fdef.visibility || "",
      stateMutability: fdef.stateMutability || "",
      expanded_max_depth: d,
    });
    if (TRACE) {
      traces.push({
        file: path.basename(filename),
        contract: fi.owner || "",
        function: fi.name,
        depth: d,
        trace: t,
      });
    }
  }

  return { rows, traces };
}

/* -------------------------- Process all AST JSONs ------------------------- */
let allRows = [];
let allTraces = []; // flat list across files
const files = fs.readdirSync(astDir).filter((f) => f.endsWith(".json"));
for (const file of files) {
  const fullPath = path.join(astDir, file);
  try {
    const ast = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const { rows, traces } = analyzeAst(ast, file);
    allRows.push(...rows);
    if (TRACE) allTraces.push(...traces.map((t) => ({ ...t, file })));
  } catch (err) {
    console.error(`Failed to analyze ${file}: ${err.message}`);
  }
}

if (allRows.length === 0) {
  console.log("No functions found.");
  process.exit(0);
}

// Always save depths JSON
const depthsPath = path.join(astDir, "depths.json");
fs.writeFileSync(depthsPath, JSON.stringify(allRows, null, 2));
console.log(`Saved combined depths → ${depthsPath}`);

if (TRACE) {
  // Save traces JSON
  const tracePath = path.join(astDir, "depth_traces.json");
  fs.writeFileSync(tracePath, JSON.stringify(allTraces, null, 2));
  console.log(`Saved call traces → ${tracePath}`);

  // Pretty-print the deepest match for TARGET_FUNC (if provided)
  if (TARGET_FUNC) {
    const matches = allTraces.filter((t) => t.function === TARGET_FUNC);
    if (matches.length === 0) {
      console.log(
        `\nNo function named '${TARGET_FUNC}' found in collected ASTs.`
      );
    } else {
      matches.sort((a, b) => b.depth - a.depth);
      const top = matches[0];
      console.log(
        `\nMax-depth trace for ${TARGET_FUNC} (${top.file.replace(
          /^.*\//,
          ""
        )} / ${top.contract || "<no contract>"}): depth=${top.depth}`
      );
      const printTrace = (node, indent = 0) => {
        if (!node) return;
        const pad = "  ".repeat(indent);
        if (node.kind === "call") {
          console.log(
            `${pad}• ${node.expr}  [w=${node.weight}]  parts(arg=${
              node.parts.arg
            }, expr=${node.parts.expr}, callee=${node.parts.callee}) via:${
              node.via
            }${node.callee ? ` -> ${node.callee}` : ""}`
          );
          printTrace(node.child, indent + 1);
        } else if (node.kind === "recursion") {
          console.log(`${pad}↪ recursion(${node.function})`);
        }
      };
      printTrace(top.trace, 0);
    }
  } else {
    console.log(
      "\nTRACE mode is on. Set TARGET_FUNC=<name> to pretty-print one function's max-depth path."
    );
  }
} else {
  // Table mode (no trace printed)
  const rowsToPrint = allRows
    .filter((r) => r.expanded_max_depth >= MIN_DEPTH)
    .sort(
      (a, b) =>
        b.expanded_max_depth - a.expanded_max_depth ||
        a.file.localeCompare(b.file) ||
        a.contract.localeCompare(b.contract) ||
        a.function.localeCompare(b.function)
    );

  console.table(
    rowsToPrint.map((r) => ({
      file: r.file,
      contract: r.contract,
      function: r.function,
      visibility: r.visibility,
      stateMutability: r.stateMutability,
      expanded_max_depth: r.expanded_max_depth,
    }))
  );
}

const parser = require("@solidity-parser/parser");

const input = `
    contract test {
        uint256 a;

        function f() external view {
            uint256 i = 0;

            while (i < 5) {
                uint256 j = 0;

                while (j < 5) {
                    uint256 k = 0;

                    while (k < 5) {
                        unchecked {
                            k++;
                        }
                    }
                    unchecked {
                        j++;
                    }
                }

                unchecked {
                    i++;
                }
            }
        }

        function g() external pure {
            for(uint256 i = 0; i < 10;) {
                unchecked { i++; }
            }
        }

        function h() external pure {
            uint256 i = 0;
            do {
                unchecked { i++; }
            } while (i < 10);
        }
    }
`;

const max = (one, two) => (one > two ? one : two);

const parseLoops = (loopTypes, statements, maxNested) => {
  let nestedLevels = 0;
  for (const statement of statements) {
    if (loopTypes.has(statement.type)) {
      nestedLevels++;

      nestedLevels += parseLoops(
        loopTypes,
        statement.body.statements,
        maxNested
      );
    }
  }

  maxNested.value = max(maxNested.value, nestedLevels);
  return nestedLevels;
};

try {
  const ast = parser.parse(input);

  const loopTypes = new Set([
    "WhileStatement",
    "DoWhileStatement",
    "ForStatement",
  ]);

  let maxNesting = { value: 0 };

  for (const node of ast.children) {
    for (const subNode of node.subNodes) {
      if (
        subNode.type === "FunctionDefinition" &&
        subNode.body.type === "Block"
      ) {
        parseLoops(loopTypes, subNode.body.statements, maxNesting);
      }
    }
  }

  console.log("Max nesting:", maxNesting.value);
} catch (e) {
  if (e instanceof parser.ParserError) {
    console.error(e.errors);
  }
}

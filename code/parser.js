const parseLoops = (loopTypes, statements, maxNested) => {
  let nestedLevels = 0;

  for (const statement of statements) {
    if (loopTypes.has(statement.type)) {
      nestedLevels =
        1 + parseLoops(loopTypes, statement.body.statements || [], maxNested);

      maxNested.value = Math.max(maxNested.value, nestedLevels);
    }
  }

  return nestedLevels;
};

module.exports = {
  parseLoops,
};

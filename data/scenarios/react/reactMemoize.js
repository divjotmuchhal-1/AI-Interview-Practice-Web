// ─── useMemo Dependency Bug ───────────────────────────────────────────────────
// Inspired by: Meta / React performance interviews
// Two parts: reference-equality cache miss → partial dependency check

const README_P1 = `# useMemo Dependency Bug, Part 1: Cache Never Hits

## Background

\`countComputations(callSets)\` runs a memoized function with each argument set in \`callSets\` (an array of argument arrays) and returns how many times the underlying computation actually ran. The \`memoize\` wrapper should skip recomputation when called with the same arguments as the previous call.

## Bug Report

The cache never returns a cached result. Every call triggers a full recomputation, even when called with identical arguments back to back.

## What to Implement

- **\`countComputations(callSets)\`** in \`solution.js\`: fix \`memoize\` so repeated calls with the same argument values return the cached result without recomputing.

## Notes

- Arguments are compared by value, not by reference: \`[1, 2]\` and \`[1, 2]\` are different array objects but represent the same arguments.
`;

const README_P2 = `# useMemo Dependency Bug, Part 2: Only the First Argument Is Checked

## Background

Part 1 is complete. The same \`countComputations(callSets)\` function is used.

## Bug Report

A change in any argument after the first is not detected as a cache miss. Calling with \`(1, 2)\` then \`(1, 3)\` counts as one computation instead of two.

## What to Implement

- **\`countComputations(callSets)\`** in \`solution.js\`: fix the argument comparison so every position is checked, not just the first.
`;

const STARTER_P1 = {
  'solution.js': `function memoize(fn) {
  var lastArgs = null;
  var lastResult;
  return function () {
    var args = Array.prototype.slice.call(arguments);
    // BUG: compares array references, always false, cache never hits
    if (lastArgs !== null && lastArgs === args) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = fn.apply(this, args);
    return lastResult;
  };
}

module.exports = {
  countComputations: function (callSets) {
    var computeCount = 0;
    var expensive = function () {
      computeCount++;
      return Array.prototype.slice.call(arguments).reduce(function (a, b) { return a + b; }, 0);
    };
    var memoized = memoize(expensive);
    for (var i = 0; i < callSets.length; i++) {
      memoized.apply(null, callSets[i]);
    }
    return computeCount;
  },
};
`,
};

const STARTER_P2 = {
  'solution.js': `function memoize(fn) {
  var lastArgs = null;
  var lastResult;
  return function () {
    var args = Array.prototype.slice.call(arguments);
    // BUG: only compares the first argument
    if (lastArgs !== null && lastArgs[0] === args[0]) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = fn.apply(this, args);
    return lastResult;
  };
}

module.exports = {
  countComputations: function (callSets) {
    var computeCount = 0;
    var expensive = function () {
      computeCount++;
      return Array.prototype.slice.call(arguments).reduce(function (a, b) { return a + b; }, 0);
    };
    var memoized = memoize(expensive);
    for (var i = 0; i < callSets.length; i++) {
      memoized.apply(null, callSets[i]);
    }
    return computeCount;
  },
};
`,
};

const VIS_P1 = [
  {
    description: 'Same args called twice: should hit cache (1 computation)',
    input: { callSets: [[1, 2], [1, 2]] },
    expectedOutput: 1,
  },
  {
    description: 'Different args each call: all must recompute (3 computations)',
    input: { callSets: [[1, 2], [3, 4], [5, 6]] },
    expectedOutput: 3,
  },
];

const HID_P1 = [
  {
    description: 'Same args repeated four times: only 1 computation total',
    input: { callSets: [[10, 20], [10, 20], [10, 20], [10, 20]] },
    expectedOutput: 1,
  },
  {
    description: 'Cache miss on change, then hit on repeat: [1,1], [2,2], [2,2], [1,1]',
    input: { callSets: [[1, 1], [2, 2], [2, 2], [1, 1]] },
    expectedOutput: 3,
  },
  {
    description: 'Single call always computes once',
    input: { callSets: [[7, 8]] },
    expectedOutput: 1,
  },
];

const VIS_P2 = [
  {
    description: 'Different second arg must trigger a recompute (2 computations)',
    input: { callSets: [[1, 2], [1, 3]] },
    expectedOutput: 2,
  },
  {
    description: 'Identical args both calls: should cache (1 computation)',
    input: { callSets: [[5, 5], [5, 5]] },
    expectedOutput: 1,
  },
];

const HID_P2 = [
  {
    description: 'Third arg change is caught: [1,2,3] then [1,2,4] then [1,2,3]',
    input: { callSets: [[1, 2, 3], [1, 2, 4], [1, 2, 3]] },
    expectedOutput: 3,
  },
  {
    description: 'First arg change also triggers recompute',
    input: { callSets: [[1, 2], [2, 2], [2, 3]] },
    expectedOutput: 3,
  },
  {
    description: 'Change in second arg of two-arg call is not a cache hit',
    input: { callSets: [[4, 1], [4, 2], [4, 2]] },
    expectedOutput: 2,
  },
];

export const reactMemoize = {
  id: 'react-memoize',
  title: 'useMemo Dependency Bug',
  difficulty: 'Medium',
  durationMinutes: 25,
  tags: ['react', 'useMemo', 'useCallback', 'memoization', 'closures'],
  description:
    'Fix two bugs in a memoize utility that mirrors how useMemo works: a reference-equality check that always misses the cache, then a partial dependency check that only inspects the first argument.',
  testRunner: {
    entryFile: 'solution.js',
    functionName: 'countComputations',
    inputKeys: ['callSets'],
  },
  parts: [
    {
      id: 'part-1', number: 1, title: 'Cache Never Hits',
      readme: README_P1,
      starterFiles: STARTER_P1,
      visibleTests: VIS_P1,
      hiddenTests: HID_P1,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function memoize(fn) {
  var lastArgs = null;
  var lastResult;
  return function () {
    var args = Array.prototype.slice.call(arguments);
    if (
      lastArgs !== null &&
      lastArgs.length === args.length &&
      lastArgs.every(function (v, i) { return v === args[i]; })
    ) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = fn.apply(this, args);
    return lastResult;
  };
}

module.exports = {
  countComputations: function (callSets) {
    var computeCount = 0;
    var expensive = function () {
      computeCount++;
      return Array.prototype.slice.call(arguments).reduce(function (a, b) { return a + b; }, 0);
    };
    var memoized = memoize(expensive);
    for (var i = 0; i < callSets.length; i++) {
      memoized.apply(null, callSets[i]);
    }
    return computeCount;
  },
};
\`\`\`

The fix: the \`===\` reference check on the args array is replaced with an element-wise comparison, so calls with the same argument values hit the cache.`,
    },
    {
      id: 'part-2', number: 2, title: 'Only First Dependency Is Checked',
      readme: README_P2,
      starterFiles: STARTER_P2,
      visibleTests: VIS_P2,
      hiddenTests: HID_P2,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function memoize(fn) {
  var lastArgs = null;
  var lastResult;
  return function () {
    var args = Array.prototype.slice.call(arguments);
    if (
      lastArgs !== null &&
      lastArgs.length === args.length &&
      lastArgs.every(function (v, i) { return v === args[i]; })
    ) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = fn.apply(this, args);
    return lastResult;
  };
}

module.exports = {
  countComputations: function (callSets) {
    var computeCount = 0;
    var expensive = function () {
      computeCount++;
      return Array.prototype.slice.call(arguments).reduce(function (a, b) { return a + b; }, 0);
    };
    var memoized = memoize(expensive);
    for (var i = 0; i < callSets.length; i++) {
      memoized.apply(null, callSets[i]);
    }
    return computeCount;
  },
};
\`\`\`

The fix: the cache check compares every argument position with \`every\`, not just \`lastArgs[0]\`, so a change in any argument is a cache miss.`,
    },
  ],
};

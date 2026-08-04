// ─── Stale Closure / Effect Cleanup ──────────────────────────────────────────
// Inspired by: Stripe payment state / real-time interviews
// Two parts: stale closure in batched updates → missing effect cleanup

const README_P1 = `# Stale Closure, Part 1: Batched Updates Read Stale State

## Background

\`applyBatchedIncrements(initial, amounts)\` schedules all increment updates before running any of them, then executes them in sequence and returns the final count. Each update is a closure that should add its amount to the current running total.

## Bug Report

When multiple amounts are scheduled, only the last one takes effect. Starting from 0 with amounts \`[1, 2, 3]\` returns \`3\` instead of \`6\`.

## What to Implement

- **\`applyBatchedIncrements(initial, amounts)\`** in \`solution.js\`: fix the update closures so each one reads the current value of \`state\` at the time it executes, not at the time it was scheduled.
`;

const README_P2 = `# Stale Closure, Part 2: Effect Cleanup Is Missing

## Background

\`runPollingRounds(ticksPerRound, rounds)\` runs \`rounds\` iterations. Each iteration registers a new callback, fires \`ticksPerRound\` ticks, records how many times the callback was called (\`activeCalls\`), and returns an array of per-round counts.

## Bug Report

Each round's count is higher than expected. By round 3, callbacks from rounds 1 and 2 are still firing, so \`activeCalls\` reflects all accumulated callbacks rather than only the current round's.

## What to Implement

- **\`runPollingRounds(ticksPerRound, rounds)\`** in \`solution.js\`: fix the end-of-round cleanup so the callback registered for the current round stops firing in subsequent rounds.
`;

const STARTER_P1 = {
  'solution.js': `module.exports = {
  applyBatchedIncrements: function (initial, amounts) {
    var state = initial;

    // Schedule all updates before running any (mirrors React batching).
    var queue = amounts.map(function (amount) {
      var captured = state; // BUG: captures state at scheduling time, not execution time
      return function () { return captured + amount; };
    });

    for (var i = 0; i < queue.length; i++) {
      state = queue[i]();
    }

    return state;
  },
};
`,
};

const STARTER_P2 = {
  'solution.js': `module.exports = {
  runPollingRounds: function (ticksPerRound, rounds) {
    var activeCalls = 0;
    var callbacks = [];

    function tick() {
      for (var i = 0; i < callbacks.length; i++) {
        if (callbacks[i]) callbacks[i]();
      }
    }

    var results = [];

    for (var r = 0; r < rounds; r++) {
      activeCalls = 0;
      var idx = callbacks.length;
      callbacks.push(function () { activeCalls++; });

      for (var t = 0; t < ticksPerRound; t++) {
        tick();
      }

      // BUG: missing cleanup: callbacks[idx] = null;
      results.push(activeCalls);
    }

    return results;
  },
};
`,
};

const VIS_P1 = [
  {
    description: 'Three increments starting from 0: should sum to 6',
    input: { initial: 0, amounts: [1, 2, 3] },
    expectedOutput: 6,
  },
  {
    description: 'Increments starting from a non-zero base',
    input: { initial: 10, amounts: [5, 5] },
    expectedOutput: 20,
  },
];

const HID_P1 = [
  {
    description: 'Single increment',
    input: { initial: 0, amounts: [7] },
    expectedOutput: 7,
  },
  {
    description: 'Four increments of 1 each from 0: should be 4',
    input: { initial: 0, amounts: [1, 1, 1, 1] },
    expectedOutput: 4,
  },
  {
    description: 'Larger amounts starting from a base',
    input: { initial: 100, amounts: [10, 20, 30] },
    expectedOutput: 160,
  },
];

const VIS_P2 = [
  {
    description: 'Two rounds of 3 ticks each: each round should record 3',
    input: { ticksPerRound: 3, rounds: 2 },
    expectedOutput: [3, 3],
  },
  {
    description: 'Single round of 5 ticks',
    input: { ticksPerRound: 5, rounds: 1 },
    expectedOutput: [5],
  },
];

const HID_P2 = [
  {
    description: 'Three rounds of 2 ticks: each should record exactly 2',
    input: { ticksPerRound: 2, rounds: 3 },
    expectedOutput: [2, 2, 2],
  },
  {
    description: 'Four rounds of 4 ticks: leaked callbacks would inflate later rounds',
    input: { ticksPerRound: 4, rounds: 4 },
    expectedOutput: [4, 4, 4, 4],
  },
  {
    description: 'One tick per round, three rounds',
    input: { ticksPerRound: 1, rounds: 3 },
    expectedOutput: [1, 1, 1],
  },
];

export const reactStaleCounter = {
  id: 'react-stale-counter',
  title: 'Stale Closure Bugs',
  difficulty: 'Hard',
  durationMinutes: 30,
  tags: ['react', 'closures', 'useEffect', 'useState', 'batching', 'cleanup'],
  description:
    'Fix two stale-closure bugs: a batched update scheduler that captures state too early (mirrors the setCount(count+1) mistake), and a polling utility that leaks callbacks across rounds (mirrors a missing useEffect cleanup).',
  testRunner: {
    entryFile: 'solution.js',
  },
  parts: [
    {
      id: 'part-1', number: 1, title: 'Batched Updates Read Stale State',
      readme: README_P1,
      starterFiles: STARTER_P1,
      visibleTests: VIS_P1,
      hiddenTests: HID_P1,
      testRunner: { functionName: 'applyBatchedIncrements', inputKeys: ['initial', 'amounts'] },
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
module.exports = {
  applyBatchedIncrements: function (initial, amounts) {
    var state = initial;

    var queue = amounts.map(function (amount) {
      return function () { return state + amount; };
    });

    for (var i = 0; i < queue.length; i++) {
      state = queue[i]();
    }

    return state;
  },
};
\`\`\`

The fix: the early \`captured\` snapshot is removed, so each closure reads the current \`state\` at execution time (the functional-update form of \`setCount(prev => prev + 1)\`).`,
    },
    {
      id: 'part-2', number: 2, title: 'Effect Cleanup Is Missing',
      readme: README_P2,
      starterFiles: STARTER_P2,
      visibleTests: VIS_P2,
      hiddenTests: HID_P2,
      testRunner: { functionName: 'runPollingRounds', inputKeys: ['ticksPerRound', 'rounds'] },
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
module.exports = {
  runPollingRounds: function (ticksPerRound, rounds) {
    var activeCalls = 0;
    var callbacks = [];

    function tick() {
      for (var i = 0; i < callbacks.length; i++) {
        if (callbacks[i]) callbacks[i]();
      }
    }

    var results = [];

    for (var r = 0; r < rounds; r++) {
      activeCalls = 0;
      var idx = callbacks.length;
      callbacks.push(function () { activeCalls++; });

      for (var t = 0; t < ticksPerRound; t++) {
        tick();
      }

      callbacks[idx] = null;
      results.push(activeCalls);
    }

    return results;
  },
};
\`\`\`

The fix: \`callbacks[idx] = null;\` at the end of each round stops the old callback from firing in later rounds (mirrors \`return () => clearInterval(id)\` in a \`useEffect\`).`,
    },
  ],
};

// ─── Debounced Effect Simulation ──────────────────────────────────────────────
// Inspired by: Vercel search-input / real-time autocomplete interviews
// Two parts: timer accumulation (too many fire) → ignore-after-set (wrong value fires)

const README_P1 = `# Debounced Effect, Part 1: Timer Accumulation

## Background

\`runDebouncedSimulation(ops, delay)\` models a debounce mechanism. It processes two operation types: \`{ type: 'TRIGGER', value }\` representing user input, and \`{ type: 'TICK' }\` representing one unit of elapsed time. A value fires when \`delay\` ticks elapse without a new trigger. Returns an array of values that fired, in order.

## Bug Report

Issuing multiple triggers in succession causes all of them to fire instead of only the last one. Each trigger adds a new timer without cancelling the previous one, so every accumulated timer expires and fires.

## What to Implement

- **\`runDebouncedSimulation(ops, delay)\`** in \`solution.js\`: each \`TRIGGER\` must cancel any pending timer before scheduling a new one.
`;

const README_P2 = `# Debounced Effect, Part 2: New Triggers Ignored While Timer Is Running

## Background

Part 1 is complete. The same \`runDebouncedSimulation(ops, delay)\` function is used.

## Bug Report

When multiple triggers arrive while a timer is already pending, all but the first are silently dropped. The debouncer fires with the value from the first trigger rather than the most recent one.

## What to Implement

- **\`runDebouncedSimulation(ops, delay)\`** in \`solution.js\`: every \`TRIGGER\` must replace the pending timer with a new one carrying the latest value.
`;

const STARTER_P1 = {
  'solution.js': `module.exports = {
  runDebouncedSimulation: function (ops, delay) {
    var timers = [];
    var fired  = [];

    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];

      if (op.type === 'TRIGGER') {
        timers.push({ value: op.value, remaining: delay });

      } else if (op.type === 'TICK') {
        var next = [];
        for (var j = 0; j < timers.length; j++) {
          var remaining = timers[j].remaining - 1;
          if (remaining <= 0) {
            fired.push(timers[j].value);
          } else {
            next.push({ value: timers[j].value, remaining: remaining });
          }
        }
        timers = next;
      }
    }

    return fired;
  },
};
`,
};

const STARTER_P2 = {
  'solution.js': `module.exports = {
  runDebouncedSimulation: function (ops, delay) {
    var timers = [];
    var fired  = [];

    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];

      if (op.type === 'TRIGGER') {
        if (timers.length > 0) continue;
        timers = [{ value: op.value, remaining: delay }];

      } else if (op.type === 'TICK') {
        var next = [];
        for (var j = 0; j < timers.length; j++) {
          var remaining = timers[j].remaining - 1;
          if (remaining <= 0) {
            fired.push(timers[j].value);
          } else {
            next.push({ value: timers[j].value, remaining: remaining });
          }
        }
        timers = next;
      }
    }

    return fired;
  },
};
`,
};

// delay = 2 in all tests for simplicity

const VIS_P1 = [
  {
    description: 'Two triggers then 2 ticks: only the last value fires',
    input: {
      ops: [
        { type: 'TRIGGER', value: 'a' },
        { type: 'TRIGGER', value: 'ab' },
        { type: 'TICK' },
        { type: 'TICK' },
      ],
      delay: 2,
    },
    expectedOutput: ['ab'],
  },
  {
    description: 'Single trigger fires after delay ticks',
    input: {
      ops: [
        { type: 'TRIGGER', value: 'hello' },
        { type: 'TICK' },
        { type: 'TICK' },
      ],
      delay: 2,
    },
    expectedOutput: ['hello'],
  },
];

const HID_P1 = [
  {
    description: 'Three triggers: only the third value fires once',
    input: {
      ops: [
        { type: 'TRIGGER', value: 'a' },
        { type: 'TRIGGER', value: 'ab' },
        { type: 'TRIGGER', value: 'abc' },
        { type: 'TICK' },
        { type: 'TICK' },
        { type: 'TICK' },
      ],
      delay: 3,
    },
    expectedOutput: ['abc'],
  },
  {
    description: 'Trigger mid-countdown resets the timer: fires later with new value',
    input: {
      ops: [
        { type: 'TRIGGER', value: 'first' },
        { type: 'TICK' },
        { type: 'TRIGGER', value: 'second' },
        { type: 'TICK' },
        { type: 'TICK' },
      ],
      delay: 2,
    },
    expectedOutput: ['second'],
  },
  {
    description: 'Trigger fires, then new trigger fires separately',
    input: {
      ops: [
        { type: 'TRIGGER', value: 'x' },
        { type: 'TICK' },
        { type: 'TICK' },
        { type: 'TRIGGER', value: 'y' },
        { type: 'TICK' },
        { type: 'TICK' },
      ],
      delay: 2,
    },
    expectedOutput: ['x', 'y'],
  },
  {
    description: 'No ticks: nothing fires',
    input: {
      ops: [
        { type: 'TRIGGER', value: 'never' },
        { type: 'TRIGGER', value: 'also never' },
      ],
      delay: 2,
    },
    expectedOutput: [],
  },
];

const VIS_P2 = [
  {
    description: 'Three triggers: last value fires (not first)',
    input: {
      ops: [
        { type: 'TRIGGER', value: 'a' },
        { type: 'TRIGGER', value: 'ab' },
        { type: 'TRIGGER', value: 'abc' },
        { type: 'TICK' },
        { type: 'TICK' },
      ],
      delay: 2,
    },
    expectedOutput: ['abc'],
  },
  {
    description: 'Single trigger still fires correctly',
    input: {
      ops: [
        { type: 'TRIGGER', value: 'solo' },
        { type: 'TICK' },
        { type: 'TICK' },
      ],
      delay: 2,
    },
    expectedOutput: ['solo'],
  },
];

const HID_P2 = [
  {
    description: 'Trigger mid-countdown fires the new value, not the original',
    input: {
      ops: [
        { type: 'TRIGGER', value: 'stale' },
        { type: 'TICK' },
        { type: 'TRIGGER', value: 'fresh' },
        { type: 'TICK' },
        { type: 'TICK' },
      ],
      delay: 2,
    },
    expectedOutput: ['fresh'],
  },
  {
    description: 'Rapid triggers followed by silence: only latest fires',
    input: {
      ops: [
        { type: 'TRIGGER', value: 'r' },
        { type: 'TRIGGER', value: 're' },
        { type: 'TRIGGER', value: 'rea' },
        { type: 'TRIGGER', value: 'reac' },
        { type: 'TRIGGER', value: 'react' },
        { type: 'TICK' },
        { type: 'TICK' },
        { type: 'TICK' },
      ],
      delay: 3,
    },
    expectedOutput: ['react'],
  },
  {
    description: 'Two bursts of typing: each burst fires its own final value',
    input: {
      ops: [
        { type: 'TRIGGER', value: 'foo' },
        { type: 'TRIGGER', value: 'food' },
        { type: 'TICK' },
        { type: 'TICK' },
        { type: 'TRIGGER', value: 'bar' },
        { type: 'TRIGGER', value: 'bars' },
        { type: 'TICK' },
        { type: 'TICK' },
      ],
      delay: 2,
    },
    expectedOutput: ['food', 'bars'],
  },
  {
    description: 'No triggers: fired list is empty',
    input: {
      ops: [
        { type: 'TICK' },
        { type: 'TICK' },
        { type: 'TICK' },
      ],
      delay: 2,
    },
    expectedOutput: [],
  },
];

export const reactDebouncedEffect = {
  id: 'react-debounced-effect',
  title: 'Debounced Effect Bugs',
  difficulty: 'Medium',
  durationMinutes: 25,
  tags: ['react', 'useEffect', 'debounce', 'closures', 'cleanup', 'timers'],
  description:
    'Fix two opposite debounce bugs: a timer that accumulates on every keystroke so multiple callbacks fire, and a guard that ignores all keystrokes after the first so the wrong value fires.',
  testRunner: {
    entryFile:    'solution.js',
    functionName: 'runDebouncedSimulation',
    inputKeys:    ['ops', 'delay'],
  },
  parts: [
    {
      id: 'part-1', number: 1, title: 'Timer Accumulation: Too Many Values Fire',
      readme: README_P1,
      starterFiles: STARTER_P1,
      visibleTests: VIS_P1,
      hiddenTests: HID_P1,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
module.exports = {
  runDebouncedSimulation: function (ops, delay) {
    var timers = [];
    var fired  = [];

    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];

      if (op.type === 'TRIGGER') {
        timers = [{ value: op.value, remaining: delay }];

      } else if (op.type === 'TICK') {
        var next = [];
        for (var j = 0; j < timers.length; j++) {
          var remaining = timers[j].remaining - 1;
          if (remaining <= 0) {
            fired.push(timers[j].value);
          } else {
            next.push({ value: timers[j].value, remaining: remaining });
          }
        }
        timers = next;
      }
    }

    return fired;
  },
};
\`\`\`

The fix: each \`TRIGGER\` replaces the timer array instead of pushing to it, cancelling any pending timer. In a \`useEffect\` this is \`const id = setTimeout(...); return () => clearTimeout(id);\`.`,
    },
    {
      id: 'part-2', number: 2, title: 'Ignore-After-Set: Wrong Value Fires',
      readme: README_P2,
      starterFiles: STARTER_P2,
      visibleTests: VIS_P2,
      hiddenTests: HID_P2,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
module.exports = {
  runDebouncedSimulation: function (ops, delay) {
    var timers = [];
    var fired  = [];

    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];

      if (op.type === 'TRIGGER') {
        timers = [{ value: op.value, remaining: delay }];

      } else if (op.type === 'TICK') {
        var next = [];
        for (var j = 0; j < timers.length; j++) {
          var remaining = timers[j].remaining - 1;
          if (remaining <= 0) {
            fired.push(timers[j].value);
          } else {
            next.push({ value: timers[j].value, remaining: remaining });
          }
        }
        timers = next;
      }
    }

    return fired;
  },
};
\`\`\`

The fix: the early-return guard \`if (timers.length > 0) continue;\` is removed. Every trigger replaces the pending timer with one carrying the latest value, rather than being dropped.`,
    },
  ],
};

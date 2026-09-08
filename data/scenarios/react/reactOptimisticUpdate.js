// ─── Optimistic Update Reducer ────────────────────────────────────────────────
// Inspired by: Linear task editor / Vercel deployment dashboard interviews
// Two parts: ROLLBACK restores the wrong value → CONFIRM leaks pending state

const README_P1 = `# Optimistic Update, Part 1: ROLLBACK Restores the Wrong Value

## Background

\`applyOptimisticActions(initialState, actions)\` applies \`OPTIMISTIC_UPDATE\`, \`CONFIRM\`, and \`ROLLBACK\` actions to a state of \`{ items, pending }\`. \`OPTIMISTIC_UPDATE\` immediately changes an item's \`text\` and stores both the original and optimistic text in \`pending[id]\`. \`ROLLBACK\` is meant to undo that change.

## Bug Report

After \`ROLLBACK\`, the item's text appears unchanged. The rollback has no visible effect.

## What to Implement

- **\`applyOptimisticActions(initialState, actions)\`** in \`solution.js\`: fix \`ROLLBACK\` so it restores the item's text to the value it had before \`OPTIMISTIC_UPDATE\` was applied.
`;

const README_P2 = `# Optimistic Update, Part 2: CONFIRM Leaks the Pending Entry

## Background

Part 1 is complete. \`ROLLBACK\` contains a guard: if \`pending[id]\` does not exist, it returns state unchanged. This guard exists so that a stale server error arriving after a \`CONFIRM\` is safely ignored.

## Bug Report

A \`ROLLBACK\` that arrives after \`CONFIRM\` still overwrites the item's text with the original value. The guard never fires because \`CONFIRM\` never removes the entry from \`pending\`.

## What to Implement

- **\`applyOptimisticActions(initialState, actions)\`** in \`solution.js\`: fix \`CONFIRM\` so it removes \`action.id\` from \`pending\`, allowing the \`ROLLBACK\` guard to correctly ignore stale responses.
`;

const STARTER_P1 = {
  'solution.js': `function optimisticReducer(state, action) {
  switch (action.type) {
    case 'OPTIMISTIC_UPDATE': {
      var item = state.items.find(function (i) { return i.id === action.id; });
      var pending = Object.assign({}, state.pending);
      pending[action.id] = { original: item.text, optimistic: action.newText };
      return {
        items: state.items.map(function (i) {
          return i.id === action.id ? Object.assign({}, i, { text: action.newText }) : i;
        }),
        pending: pending,
      };
    }
    case 'CONFIRM': {
      var p = Object.assign({}, state.pending);
      delete p[action.id];
      return Object.assign({}, state, { pending: p });
    }
    case 'ROLLBACK': {
      var op = state.pending[action.id];
      if (!op) return state;
      var p2 = Object.assign({}, state.pending);
      delete p2[action.id];
      return {
        items: state.items.map(function (i) {
          return i.id === action.id ? Object.assign({}, i, { text: op.optimistic }) : i;
        }),
        pending: p2,
      };
    }
    default:
      return state;
  }
}

module.exports = {
  applyOptimisticActions: function (initialState, actions) {
    return actions.reduce(optimisticReducer, initialState);
  },
};
`,
};

const STARTER_P2 = {
  'solution.js': `function optimisticReducer(state, action) {
  switch (action.type) {
    case 'OPTIMISTIC_UPDATE': {
      var item = state.items.find(function (i) { return i.id === action.id; });
      var pending = Object.assign({}, state.pending);
      pending[action.id] = { original: item.text, optimistic: action.newText };
      return {
        items: state.items.map(function (i) {
          return i.id === action.id ? Object.assign({}, i, { text: action.newText }) : i;
        }),
        pending: pending,
      };
    }
    case 'CONFIRM': {
      return state;
    }
    case 'ROLLBACK': {
      var op = state.pending[action.id];
      if (!op) return state;           // guard: ignore if already confirmed/removed
      var p = Object.assign({}, state.pending);
      delete p[action.id];
      return {
        items: state.items.map(function (i) {
          return i.id === action.id ? Object.assign({}, i, { text: op.original }) : i;
        }),
        pending: p,
      };
    }
    default:
      return state;
  }
}

module.exports = {
  applyOptimisticActions: function (initialState, actions) {
    return actions.reduce(optimisticReducer, initialState);
  },
};
`,
};

const VIS_P1 = [
  {
    description: 'Rollback restores the original text, not the optimistic one',
    input: {
      initialState: {
        items:   [{ id: 1, text: 'Buy milk' }],
        pending: {},
      },
      actions: [
        { type: 'OPTIMISTIC_UPDATE', id: 1, newText: 'Buy oat milk' },
        { type: 'ROLLBACK', id: 1 },
      ],
    },
    expectedOutput: {
      items:   [{ id: 1, text: 'Buy milk' }],
      pending: {},
    },
  },
  {
    description: 'CONFIRM keeps the optimistic text; pending entry is removed',
    input: {
      initialState: {
        items:   [{ id: 1, text: 'Draft title' }],
        pending: {},
      },
      actions: [
        { type: 'OPTIMISTIC_UPDATE', id: 1, newText: 'Published title' },
        { type: 'CONFIRM', id: 1 },
      ],
    },
    expectedOutput: {
      items:   [{ id: 1, text: 'Published title' }],
      pending: {},
    },
  },
];

const HID_P1 = [
  {
    description: 'Rolling back one item does not affect another',
    input: {
      initialState: {
        items:   [{ id: 1, text: 'Task A' }, { id: 2, text: 'Task B' }],
        pending: {},
      },
      actions: [
        { type: 'OPTIMISTIC_UPDATE', id: 1, newText: 'Task A - edited' },
        { type: 'OPTIMISTIC_UPDATE', id: 2, newText: 'Task B - edited' },
        { type: 'ROLLBACK', id: 1 },
      ],
    },
    expectedOutput: {
      items:   [{ id: 1, text: 'Task A' }, { id: 2, text: 'Task B - edited' }],
      pending: { 2: { original: 'Task B', optimistic: 'Task B - edited' } },
    },
  },
  {
    description: 'ROLLBACK with no pending entry is a no-op',
    input: {
      initialState: {
        items:   [{ id: 1, text: 'Note' }],
        pending: {},
      },
      actions: [
        { type: 'ROLLBACK', id: 1 },
      ],
    },
    expectedOutput: {
      items:   [{ id: 1, text: 'Note' }],
      pending: {},
    },
  },
  {
    description: 'Double optimistic update: rollback reverts to the original, not the intermediate',
    input: {
      initialState: {
        items:   [{ id: 1, text: 'v1' }],
        pending: {},
      },
      actions: [
        { type: 'OPTIMISTIC_UPDATE', id: 1, newText: 'v2' },
        { type: 'OPTIMISTIC_UPDATE', id: 1, newText: 'v3' },
        { type: 'ROLLBACK', id: 1 },
      ],
    },
    expectedOutput: {
      items:   [{ id: 1, text: 'v2' }],
      pending: {},
    },
  },
];

const VIS_P2 = [
  {
    description: 'ROLLBACK after CONFIRM is ignored: confirmed text persists',
    input: {
      initialState: {
        items:   [{ id: 1, text: 'Original' }],
        pending: {},
      },
      actions: [
        { type: 'OPTIMISTIC_UPDATE', id: 1, newText: 'Updated' },
        { type: 'CONFIRM', id: 1 },
        { type: 'ROLLBACK', id: 1 },   // stale error, should be ignored
      ],
    },
    expectedOutput: {
      items:   [{ id: 1, text: 'Updated' }],
      pending: {},
    },
  },
  {
    description: 'CONFIRM removes entry; a second CONFIRM for same id is also a no-op',
    input: {
      initialState: {
        items:   [{ id: 1, text: 'A' }],
        pending: {},
      },
      actions: [
        { type: 'OPTIMISTIC_UPDATE', id: 1, newText: 'B' },
        { type: 'CONFIRM', id: 1 },
        { type: 'CONFIRM', id: 1 },
      ],
    },
    expectedOutput: {
      items:   [{ id: 1, text: 'B' }],
      pending: {},
    },
  },
];

const HID_P2 = [
  {
    description: 'Confirm one, rollback arrives for the other: correct item is rolled back',
    input: {
      initialState: {
        items:   [{ id: 1, text: 'Alpha' }, { id: 2, text: 'Beta' }],
        pending: {},
      },
      actions: [
        { type: 'OPTIMISTIC_UPDATE', id: 1, newText: 'Alpha v2' },
        { type: 'OPTIMISTIC_UPDATE', id: 2, newText: 'Beta v2' },
        { type: 'CONFIRM', id: 1 },
        { type: 'ROLLBACK', id: 1 },   // stale, should be ignored
        { type: 'ROLLBACK', id: 2 },   // valid, should apply
      ],
    },
    expectedOutput: {
      items:   [{ id: 1, text: 'Alpha v2' }, { id: 2, text: 'Beta' }],
      pending: {},
    },
  },
  {
    description: 'Pending is empty after all operations settle',
    input: {
      initialState: {
        items:   [{ id: 1, text: 'X' }, { id: 2, text: 'Y' }],
        pending: {},
      },
      actions: [
        { type: 'OPTIMISTIC_UPDATE', id: 1, newText: 'X2' },
        { type: 'OPTIMISTIC_UPDATE', id: 2, newText: 'Y2' },
        { type: 'CONFIRM', id: 1 },
        { type: 'CONFIRM', id: 2 },
      ],
    },
    expectedOutput: {
      items:   [{ id: 1, text: 'X2' }, { id: 2, text: 'Y2' }],
      pending: {},
    },
  },
];

export const reactOptimisticUpdate = {
  id: 'react-optimistic-update',
  title: 'Optimistic Update Bugs',
  difficulty: 'Medium',
  durationMinutes: 25,
  tags: ['react', 'useReducer', 'optimistic-ui', 'state', 'async'],
  description:
    'Fix two bugs in an optimistic-update reducer: a ROLLBACK that restores the new text instead of the original, and a CONFIRM that leaks its pending entry so stale rollbacks still apply.',
  testRunner: {
    entryFile:    'solution.js',
    functionName: 'applyOptimisticActions',
    inputKeys:    ['initialState', 'actions'],
  },
  parts: [
    {
      id: 'part-1', number: 1, title: 'ROLLBACK Restores the Wrong Value',
      readme: README_P1,
      starterFiles: STARTER_P1,
      visibleTests: VIS_P1,
      hiddenTests: HID_P1,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function optimisticReducer(state, action) {
  switch (action.type) {
    case 'OPTIMISTIC_UPDATE': {
      var item = state.items.find(function (i) { return i.id === action.id; });
      var pending = Object.assign({}, state.pending);
      pending[action.id] = { original: item.text, optimistic: action.newText };
      return {
        items: state.items.map(function (i) {
          return i.id === action.id ? Object.assign({}, i, { text: action.newText }) : i;
        }),
        pending: pending,
      };
    }
    case 'CONFIRM': {
      var p = Object.assign({}, state.pending);
      delete p[action.id];
      return Object.assign({}, state, { pending: p });
    }
    case 'ROLLBACK': {
      var op = state.pending[action.id];
      if (!op) return state;
      var p2 = Object.assign({}, state.pending);
      delete p2[action.id];
      return {
        items: state.items.map(function (i) {
          return i.id === action.id ? Object.assign({}, i, { text: op.original }) : i;
        }),
        pending: p2,
      };
    }
    default:
      return state;
  }
}

module.exports = {
  applyOptimisticActions: function (initialState, actions) {
    return actions.reduce(optimisticReducer, initialState);
  },
};
\`\`\`

The fix: \`ROLLBACK\` restores \`op.original\` instead of \`op.optimistic\`, so the item returns to its pre-update text.`,
    },
    {
      id: 'part-2', number: 2, title: 'CONFIRM Leaks the Pending Entry',
      readme: README_P2,
      starterFiles: STARTER_P2,
      visibleTests: VIS_P2,
      hiddenTests: HID_P2,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function optimisticReducer(state, action) {
  switch (action.type) {
    case 'OPTIMISTIC_UPDATE': {
      var item = state.items.find(function (i) { return i.id === action.id; });
      var pending = Object.assign({}, state.pending);
      pending[action.id] = { original: item.text, optimistic: action.newText };
      return {
        items: state.items.map(function (i) {
          return i.id === action.id ? Object.assign({}, i, { text: action.newText }) : i;
        }),
        pending: pending,
      };
    }
    case 'CONFIRM': {
      var p = Object.assign({}, state.pending);
      delete p[action.id];
      return Object.assign({}, state, { pending: p });
    }
    case 'ROLLBACK': {
      var op = state.pending[action.id];
      if (!op) return state;
      var p2 = Object.assign({}, state.pending);
      delete p2[action.id];
      return {
        items: state.items.map(function (i) {
          return i.id === action.id ? Object.assign({}, i, { text: op.original }) : i;
        }),
        pending: p2,
      };
    }
    default:
      return state;
  }
}

module.exports = {
  applyOptimisticActions: function (initialState, actions) {
    return actions.reduce(optimisticReducer, initialState);
  },
};
\`\`\`

The fix: \`CONFIRM\` deletes the pending entry, so a later stale \`ROLLBACK\` hits the \`if (!op) return state\` guard and is ignored. This mirrors the \`useEffect\` cleanup pattern where a \`cancelled\` flag drops stale async responses.`,
    },
  ],
};

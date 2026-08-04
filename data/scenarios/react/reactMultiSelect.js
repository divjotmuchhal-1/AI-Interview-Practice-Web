// ─── Multi-Select Reducer ──────────────────────────────────────────────────────
// Inspired by: Figma layer panel / Linear bulk-action interviews
// Two parts: inverted TOGGLE condition → wrong SELECT_ALL threshold

const README_P1 = `# Multi-Select, Part 1: TOGGLE Condition Is Inverted

## Background

\`applySelectActions(initialState, actions)\` applies an array of \`TOGGLE\`, \`SELECT_ALL_TOGGLE\`, and \`CLEAR\` actions to a state of \`{ items, selected }\` and returns the final state. \`selected\` is an array of item IDs (integers).

## Bug Report

Clicking an unselected item does nothing. Clicking an already-selected item adds it again as a duplicate. Items can never be deselected.

## What to Implement

- **\`applySelectActions(initialState, actions)\`** in \`solution.js\`: fix \`TOGGLE\` so it deselects an item that is already in \`selected\` and selects one that is not.
`;

const README_P2 = `# Multi-Select, Part 2: SELECT_ALL Uses Wrong Threshold

## Background

Part 1 is complete. \`SELECT_ALL_TOGGLE\` should select all items when none or some are selected, and deselect all only when every item is already selected.

## Bug Report

\`SELECT_ALL_TOGGLE\` deselects all whenever any items are selected, not only when all items are selected. Clicking the header checkbox with a partial selection clears the selection instead of completing it.

## What to Implement

- **\`applySelectActions(initialState, actions)\`** in \`solution.js\`: fix \`SELECT_ALL_TOGGLE\` so it only deselects when every item in \`state.items\` is already in \`state.selected\`.
`;

const STARTER_P1 = {
  'solution.js': `function selectReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE': {
      // BUG: condition is inverted. Removes when NOT selected, adds when IS selected
      if (!state.selected.includes(action.id)) {
        return { ...state, selected: state.selected.filter(function (id) { return id !== action.id; }) };
      }
      return { ...state, selected: [...state.selected, action.id] };
    }
    case 'SELECT_ALL_TOGGLE': {
      var allSelected = state.items.every(function (i) { return state.selected.includes(i.id); });
      if (allSelected) {
        return { ...state, selected: [] };
      }
      return { ...state, selected: state.items.map(function (i) { return i.id; }) };
    }
    case 'CLEAR':
      return { ...state, selected: [] };
    default:
      return state;
  }
}

module.exports = {
  applySelectActions: function (initialState, actions) {
    return actions.reduce(selectReducer, initialState);
  },
};
`,
};

const STARTER_P2 = {
  'solution.js': `function selectReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE': {
      if (state.selected.includes(action.id)) {
        return { ...state, selected: state.selected.filter(function (id) { return id !== action.id; }) };
      }
      return { ...state, selected: [...state.selected, action.id] };
    }
    case 'SELECT_ALL_TOGGLE': {
      // BUG: deselects whenever any item is selected instead of only when ALL are selected
      if (state.selected.length > 0) {
        return { ...state, selected: [] };
      }
      return { ...state, selected: state.items.map(function (i) { return i.id; }) };
    }
    case 'CLEAR':
      return { ...state, selected: [] };
    default:
      return state;
  }
}

module.exports = {
  applySelectActions: function (initialState, actions) {
    return actions.reduce(selectReducer, initialState);
  },
};
`,
};

const ITEMS_3 = [{ id: 1, name: 'Layer A' }, { id: 2, name: 'Layer B' }, { id: 3, name: 'Layer C' }];

const VIS_P1 = [
  {
    description: 'Toggling an unselected item selects it',
    input: {
      initialState: { items: ITEMS_3, selected: [] },
      actions: [{ type: 'TOGGLE', id: 1 }],
    },
    expectedOutput: { items: ITEMS_3, selected: [1] },
  },
  {
    description: 'Toggling a selected item deselects it',
    input: {
      initialState: { items: ITEMS_3, selected: [1, 2] },
      actions: [{ type: 'TOGGLE', id: 1 }],
    },
    expectedOutput: { items: ITEMS_3, selected: [2] },
  },
];

const HID_P1 = [
  {
    description: 'Two toggles of the same item return to empty selection',
    input: {
      initialState: { items: ITEMS_3, selected: [] },
      actions: [
        { type: 'TOGGLE', id: 2 },
        { type: 'TOGGLE', id: 2 },
      ],
    },
    expectedOutput: { items: ITEMS_3, selected: [] },
  },
  {
    description: 'Toggling three items individually selects all three',
    input: {
      initialState: { items: ITEMS_3, selected: [] },
      actions: [
        { type: 'TOGGLE', id: 1 },
        { type: 'TOGGLE', id: 2 },
        { type: 'TOGGLE', id: 3 },
      ],
    },
    expectedOutput: { items: ITEMS_3, selected: [1, 2, 3] },
  },
  {
    description: 'Toggle select, toggle deselect, toggle select again',
    input: {
      initialState: { items: ITEMS_3, selected: [] },
      actions: [
        { type: 'TOGGLE', id: 1 },
        { type: 'TOGGLE', id: 1 },
        { type: 'TOGGLE', id: 1 },
      ],
    },
    expectedOutput: { items: ITEMS_3, selected: [1] },
  },
  {
    description: 'CLEAR removes all selections',
    input: {
      initialState: { items: ITEMS_3, selected: [1, 3] },
      actions: [{ type: 'CLEAR' }],
    },
    expectedOutput: { items: ITEMS_3, selected: [] },
  },
];

const VIS_P2 = [
  {
    description: 'SELECT_ALL_TOGGLE with partial selection selects all (not deselects)',
    input: {
      initialState: { items: ITEMS_3, selected: [1] },
      actions: [{ type: 'SELECT_ALL_TOGGLE' }],
    },
    expectedOutput: { items: ITEMS_3, selected: [1, 2, 3] },
  },
  {
    description: 'SELECT_ALL_TOGGLE with all selected deselects all',
    input: {
      initialState: { items: ITEMS_3, selected: [1, 2, 3] },
      actions: [{ type: 'SELECT_ALL_TOGGLE' }],
    },
    expectedOutput: { items: ITEMS_3, selected: [] },
  },
];

const HID_P2 = [
  {
    description: 'SELECT_ALL_TOGGLE with nothing selected selects all',
    input: {
      initialState: { items: ITEMS_3, selected: [] },
      actions: [{ type: 'SELECT_ALL_TOGGLE' }],
    },
    expectedOutput: { items: ITEMS_3, selected: [1, 2, 3] },
  },
  {
    description: 'Select all, deselect all, select all again: three toggles',
    input: {
      initialState: { items: ITEMS_3, selected: [] },
      actions: [
        { type: 'SELECT_ALL_TOGGLE' },
        { type: 'SELECT_ALL_TOGGLE' },
        { type: 'SELECT_ALL_TOGGLE' },
      ],
    },
    expectedOutput: { items: ITEMS_3, selected: [1, 2, 3] },
  },
  {
    description: 'Partial select then SELECT_ALL, then one deselect: not all selected anymore',
    input: {
      initialState: { items: ITEMS_3, selected: [2] },
      actions: [
        { type: 'SELECT_ALL_TOGGLE' },  // should select all (partial → all)
        { type: 'TOGGLE', id: 3 },      // deselect 3
      ],
    },
    expectedOutput: { items: ITEMS_3, selected: [1, 2] },
  },
  {
    description: 'SELECT_ALL_TOGGLE on two-item list selects both',
    input: {
      initialState: {
        items: [{ id: 10, name: 'X' }, { id: 20, name: 'Y' }],
        selected: [10],
      },
      actions: [{ type: 'SELECT_ALL_TOGGLE' }],
    },
    expectedOutput: {
      items: [{ id: 10, name: 'X' }, { id: 20, name: 'Y' }],
      selected: [10, 20],
    },
  },
];

export const reactMultiSelect = {
  id: 'react-multi-select',
  title: 'Multi-Select Reducer Bugs',
  difficulty: 'Medium',
  durationMinutes: 25,
  tags: ['react', 'useReducer', 'state', 'immutability', 'toggle'],
  description:
    'Fix two bugs in a layer-panel multi-select reducer: an inverted toggle condition that prevents deselecting items, and a select-all threshold that fires on any selection instead of only when all items are already selected.',
  testRunner: {
    entryFile:    'solution.js',
    functionName: 'applySelectActions',
    inputKeys:    ['initialState', 'actions'],
  },
  parts: [
    {
      id: 'part-1', number: 1, title: 'TOGGLE Condition Is Inverted',
      readme: README_P1,
      starterFiles: STARTER_P1,
      visibleTests: VIS_P1,
      hiddenTests: HID_P1,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function selectReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE': {
      if (state.selected.includes(action.id)) {
        return { ...state, selected: state.selected.filter(function (id) { return id !== action.id; }) };
      }
      return { ...state, selected: [...state.selected, action.id] };
    }
    case 'SELECT_ALL_TOGGLE': {
      var allSelected = state.items.every(function (i) { return state.selected.includes(i.id); });
      if (allSelected) {
        return { ...state, selected: [] };
      }
      return { ...state, selected: state.items.map(function (i) { return i.id; }) };
    }
    case 'CLEAR':
      return { ...state, selected: [] };
    default:
      return state;
  }
}

module.exports = {
  applySelectActions: function (initialState, actions) {
    return actions.reduce(selectReducer, initialState);
  },
};
\`\`\`

The fix: the \`!\` is removed from the \`TOGGLE\` condition, so a selected item is removed and an unselected item is added.`,
    },
    {
      id: 'part-2', number: 2, title: 'SELECT_ALL Uses Wrong Threshold',
      readme: README_P2,
      starterFiles: STARTER_P2,
      visibleTests: VIS_P2,
      hiddenTests: HID_P2,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function selectReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE': {
      if (state.selected.includes(action.id)) {
        return { ...state, selected: state.selected.filter(function (id) { return id !== action.id; }) };
      }
      return { ...state, selected: [...state.selected, action.id] };
    }
    case 'SELECT_ALL_TOGGLE': {
      var allSelected = state.items.every(function (i) { return state.selected.includes(i.id); });
      if (allSelected) {
        return { ...state, selected: [] };
      }
      return { ...state, selected: state.items.map(function (i) { return i.id; }) };
    }
    case 'CLEAR':
      return { ...state, selected: [] };
    default:
      return state;
  }
}

module.exports = {
  applySelectActions: function (initialState, actions) {
    return actions.reduce(selectReducer, initialState);
  },
};
\`\`\`

The fix: \`SELECT_ALL_TOGGLE\` deselects only when \`every\` item is already selected (\`length > 0\` is the "any selected" predicate; \`every(...includes)\` is the "all selected" predicate).`,
    },
  ],
};

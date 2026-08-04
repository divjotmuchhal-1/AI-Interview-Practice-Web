// ─── Cart State Reducer ───────────────────────────────────────────────────────
// Inspired by: Shopify storefront cart interviews
// Two parts: ADD_ITEM overwrite → stale total calculation

const README_P1 = `# Cart State Reducer, Part 1: ADD_ITEM Overwrites the Cart

## Background

\`cartReducer\` manages a shopping cart, handling \`ADD_ITEM\`, \`REMOVE_ITEM\`, and \`CLEAR\` actions. \`applyCartActions(initialState, actions)\` applies an array of these actions in sequence and returns the final state.

## Bug Report

Adding a second item silently removes the first. The cart never holds more than one item at a time.

## What to Implement

- **\`applyCartActions(initialState, actions)\`** in \`solution.js\`: fix \`ADD_ITEM\` so each new item is appended to the existing list rather than replacing it.
`;

const README_P2 = `# Cart State Reducer, Part 2: Total Computed from Stale Data

## Background

Part 1 is complete. The reducer now also tracks a \`total\` field: the sum of \`price * qty\` for every item. \`UPDATE_QTY\` changes the quantity of a single item and must recalculate \`total\`. Each item has \`id\`, \`name\`, \`price\`, and \`qty\` fields.

## Bug Report

After \`UPDATE_QTY\`, the \`total\` in the returned state always reflects the quantity before the change, not after.

## What to Implement

- **\`applyCartActions(initialState, actions)\`** in \`solution.js\`: fix \`UPDATE_QTY\` so \`total\` is computed from the post-update items array.
`;

const STARTER_P1 = {
  'solution.js': `function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM':
      // BUG: replaces all items instead of appending
      return { ...state, items: [action.item] };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'CLEAR':
      return { ...state, items: [] };
    default:
      return state;
  }
}

module.exports = {
  applyCartActions(initialState, actions) {
    return actions.reduce(cartReducer, initialState);
  },
};
`,
};

const STARTER_P2 = {
  'solution.js': `function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const items = [...state.items, action.item];
      return { ...state, items, total: items.reduce((s, i) => s + i.price * i.qty, 0) };
    }
    case 'REMOVE_ITEM': {
      const items = state.items.filter((i) => i.id !== action.id);
      return { ...state, items, total: items.reduce((s, i) => s + i.price * i.qty, 0) };
    }
    case 'UPDATE_QTY': {
      const updated = state.items.map((i) =>
        i.id === action.id ? { ...i, qty: action.qty } : i
      );
      return {
        ...state,
        items: updated,
        // BUG: uses state.items (old array) instead of updated (new array)
        total: state.items.reduce((s, i) => s + i.price * i.qty, 0),
      };
    }
    case 'CLEAR':
      return { ...state, items: [], total: 0 };
    default:
      return state;
  }
}

module.exports = {
  applyCartActions(initialState, actions) {
    return actions.reduce(cartReducer, initialState);
  },
};
`,
};

const VIS_P1 = [
  {
    description: 'Adding one item to an empty cart',
    input: {
      initialState: { items: [] },
      actions: [{ type: 'ADD_ITEM', item: { id: 1, name: 'T-Shirt', price: 29 } }],
    },
    expectedOutput: { items: [{ id: 1, name: 'T-Shirt', price: 29 }] },
  },
  {
    description: 'Adding two items: both should remain in the cart',
    input: {
      initialState: { items: [] },
      actions: [
        { type: 'ADD_ITEM', item: { id: 1, name: 'T-Shirt', price: 29 } },
        { type: 'ADD_ITEM', item: { id: 2, name: 'Hat', price: 19 } },
      ],
    },
    expectedOutput: {
      items: [
        { id: 1, name: 'T-Shirt', price: 29 },
        { id: 2, name: 'Hat', price: 19 },
      ],
    },
  },
];

const HID_P1 = [
  {
    description: 'Three sequential adds preserve all items',
    input: {
      initialState: { items: [] },
      actions: [
        { type: 'ADD_ITEM', item: { id: 1, name: 'T-Shirt', price: 29 } },
        { type: 'ADD_ITEM', item: { id: 2, name: 'Hat', price: 19 } },
        { type: 'ADD_ITEM', item: { id: 3, name: 'Jacket', price: 89 } },
      ],
    },
    expectedOutput: {
      items: [
        { id: 1, name: 'T-Shirt', price: 29 },
        { id: 2, name: 'Hat', price: 19 },
        { id: 3, name: 'Jacket', price: 89 },
      ],
    },
  },
  {
    description: 'Add two items then remove the first',
    input: {
      initialState: { items: [] },
      actions: [
        { type: 'ADD_ITEM', item: { id: 1, name: 'T-Shirt', price: 29 } },
        { type: 'ADD_ITEM', item: { id: 2, name: 'Hat', price: 19 } },
        { type: 'REMOVE_ITEM', id: 1 },
      ],
    },
    expectedOutput: { items: [{ id: 2, name: 'Hat', price: 19 }] },
  },
  {
    description: 'CLEAR empties the cart after adds',
    input: {
      initialState: { items: [] },
      actions: [
        { type: 'ADD_ITEM', item: { id: 1, name: 'T-Shirt', price: 29 } },
        { type: 'CLEAR' },
      ],
    },
    expectedOutput: { items: [] },
  },
];

const VIS_P2 = [
  {
    description: 'Increasing qty updates the total',
    input: {
      initialState: { items: [{ id: 1, name: 'Mug', price: 10, qty: 1 }], total: 10 },
      actions: [{ type: 'UPDATE_QTY', id: 1, qty: 3 }],
    },
    expectedOutput: { items: [{ id: 1, name: 'Mug', price: 10, qty: 3 }], total: 30 },
  },
  {
    description: 'Decreasing qty updates the total',
    input: {
      initialState: { items: [{ id: 1, name: 'Mug', price: 10, qty: 5 }], total: 50 },
      actions: [{ type: 'UPDATE_QTY', id: 1, qty: 2 }],
    },
    expectedOutput: { items: [{ id: 1, name: 'Mug', price: 10, qty: 2 }], total: 20 },
  },
];

const HID_P2 = [
  {
    description: 'Total reflects the updated item in a multi-item cart',
    input: {
      initialState: {
        items: [
          { id: 1, name: 'Mug', price: 10, qty: 2 },
          { id: 2, name: 'Plate', price: 15, qty: 1 },
        ],
        total: 35,
      },
      actions: [{ type: 'UPDATE_QTY', id: 2, qty: 4 }],
    },
    expectedOutput: {
      items: [
        { id: 1, name: 'Mug', price: 10, qty: 2 },
        { id: 2, name: 'Plate', price: 15, qty: 4 },
      ],
      total: 80,
    },
  },
  {
    description: 'Setting qty to 1 recalculates total correctly',
    input: {
      initialState: { items: [{ id: 1, name: 'Candle', price: 8, qty: 6 }], total: 48 },
      actions: [{ type: 'UPDATE_QTY', id: 1, qty: 1 }],
    },
    expectedOutput: { items: [{ id: 1, name: 'Candle', price: 8, qty: 1 }], total: 8 },
  },
  {
    description: 'Two sequential UPDATE_QTY calls both update correctly',
    input: {
      initialState: {
        items: [
          { id: 1, name: 'Mug', price: 10, qty: 1 },
          { id: 2, name: 'Plate', price: 5, qty: 1 },
        ],
        total: 15,
      },
      actions: [
        { type: 'UPDATE_QTY', id: 1, qty: 2 },
        { type: 'UPDATE_QTY', id: 2, qty: 3 },
      ],
    },
    expectedOutput: {
      items: [
        { id: 1, name: 'Mug', price: 10, qty: 2 },
        { id: 2, name: 'Plate', price: 5, qty: 3 },
      ],
      total: 35,
    },
  },
];

export const reactCartReducer = {
  id: 'react-cart-reducer',
  title: 'Cart State Reducer',
  difficulty: 'Medium',
  durationMinutes: 25,
  tags: ['react', 'useReducer', 'immutability', 'state'],
  description:
    'Fix two bugs in a useReducer-based shopping cart: an ADD_ITEM that overwrites existing items, and an UPDATE_QTY that computes total from the stale pre-update array.',
  testRunner: {
    entryFile: 'solution.js',
    functionName: 'applyCartActions',
    inputKeys: ['initialState', 'actions'],
  },
  parts: [
    {
      id: 'part-1', number: 1, title: 'ADD_ITEM Overwrites the Cart',
      readme: README_P1,
      starterFiles: STARTER_P1,
      visibleTests: VIS_P1,
      hiddenTests: HID_P1,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.item] };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'CLEAR':
      return { ...state, items: [] };
    default:
      return state;
  }
}

module.exports = {
  applyCartActions(initialState, actions) {
    return actions.reduce(cartReducer, initialState);
  },
};
\`\`\`

The fix: \`ADD_ITEM\` spreads the existing items before appending the new one instead of replacing the whole list.`,
    },
    {
      id: 'part-2', number: 2, title: 'Total Computed from Stale Data',
      readme: README_P2,
      starterFiles: STARTER_P2,
      visibleTests: VIS_P2,
      hiddenTests: HID_P2,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const items = [...state.items, action.item];
      return { ...state, items, total: items.reduce((s, i) => s + i.price * i.qty, 0) };
    }
    case 'REMOVE_ITEM': {
      const items = state.items.filter((i) => i.id !== action.id);
      return { ...state, items, total: items.reduce((s, i) => s + i.price * i.qty, 0) };
    }
    case 'UPDATE_QTY': {
      const updated = state.items.map((i) =>
        i.id === action.id ? { ...i, qty: action.qty } : i
      );
      return {
        ...state,
        items: updated,
        total: updated.reduce((s, i) => s + i.price * i.qty, 0),
      };
    }
    case 'CLEAR':
      return { ...state, items: [], total: 0 };
    default:
      return state;
  }
}

module.exports = {
  applyCartActions(initialState, actions) {
    return actions.reduce(cartReducer, initialState);
  },
};
\`\`\`

The fix: \`UPDATE_QTY\` computes \`total\` from \`updated\` (the post-update array) instead of \`state.items\`.`,
    },
  ],
};

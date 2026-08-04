// ─── Paginated Feed Reducer ────────────────────────────────────────────────────
// Inspired by: Meta News Feed / TikTok For You Page engineering interviews
// Two parts: FETCH_SUCCESS overwrites items → RESET forgets to reset page counter

const README_P1 = `# Paginated Feed, Part 1: FETCH_SUCCESS Overwrites Existing Items

## Background

\`applyFeedActions(initialState, actions)\` applies \`FETCH_START\`, \`FETCH_SUCCESS\`, and \`RESET\` actions to a state of \`{ items, page, hasMore, loading }\`. Each \`FETCH_SUCCESS\` delivers one page of results and increments \`page\` by 1.

## Bug Report

Fetching a second page causes the first page's items to disappear. Only the most recently fetched page is ever visible.

## What to Implement

- **\`applyFeedActions(initialState, actions)\`** in \`solution.js\`: fix \`FETCH_SUCCESS\` so new items are appended to \`state.items\` rather than replacing them.
`;

const README_P2 = `# Paginated Feed, Part 2: RESET Doesn't Reset the Page Counter

## Background

Part 1 is complete. \`RESET\` is used when the user starts a new search: it clears the item list and sets \`loading\` and \`hasMore\` back to their initial values so the feed can fetch from the beginning. \`page\` starts at \`0\` and increments by 1 on every \`FETCH_SUCCESS\`.

## Bug Report

After a \`RESET\`, the next \`FETCH_SUCCESS\` increments \`page\` from its pre-reset value instead of from 0. A feed on page 5 before the reset would treat the first response of the new search as page 6.

## What to Implement

- **\`applyFeedActions(initialState, actions)\`** in \`solution.js\`: fix \`RESET\` so \`page\` is set to \`0\`.
`;

const STARTER_P1 = {
  'solution.js': `function feedReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        items:   action.items,  // BUG: replaces all items instead of appending
        page:    state.page + 1,
        loading: false,
        hasMore: action.items.length > 0,
      };
    case 'RESET':
      return { ...state, items: [], page: 0, hasMore: true, loading: false };
    default:
      return state;
  }
}

module.exports = {
  applyFeedActions: function (initialState, actions) {
    return actions.reduce(feedReducer, initialState);
  },
};
`,
};

const STARTER_P2 = {
  'solution.js': `function feedReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        items:   [...state.items, ...action.items],
        page:    state.page + 1,
        loading: false,
        hasMore: action.items.length > 0,
      };
    case 'RESET':
      return {
        ...state,
        items:   [],
        hasMore: true,
        loading: false,
        // BUG: page not reset to 0
      };
    default:
      return state;
  }
}

module.exports = {
  applyFeedActions: function (initialState, actions) {
    return actions.reduce(feedReducer, initialState);
  },
};
`,
};

const VIS_P1 = [
  {
    description: 'Two page fetches accumulate: both pages of items present',
    input: {
      initialState: { items: [], page: 0, hasMore: true, loading: false },
      actions: [
        { type: 'FETCH_SUCCESS', items: [{ id: 1, title: 'Post A' }, { id: 2, title: 'Post B' }] },
        { type: 'FETCH_SUCCESS', items: [{ id: 3, title: 'Post C' }, { id: 4, title: 'Post D' }] },
      ],
    },
    expectedOutput: {
      items: [
        { id: 1, title: 'Post A' },
        { id: 2, title: 'Post B' },
        { id: 3, title: 'Post C' },
        { id: 4, title: 'Post D' },
      ],
      page: 2,
      hasMore: true,
      loading: false,
    },
  },
  {
    description: 'Single fetch: items and page both update correctly',
    input: {
      initialState: { items: [], page: 0, hasMore: true, loading: false },
      actions: [
        { type: 'FETCH_SUCCESS', items: [{ id: 1, title: 'Only Post' }] },
      ],
    },
    expectedOutput: {
      items: [{ id: 1, title: 'Only Post' }],
      page: 1,
      hasMore: true,
      loading: false,
    },
  },
];

const HID_P1 = [
  {
    description: 'Three page fetches: all 6 items present at the end',
    input: {
      initialState: { items: [], page: 0, hasMore: true, loading: false },
      actions: [
        { type: 'FETCH_SUCCESS', items: [{ id: 1 }, { id: 2 }] },
        { type: 'FETCH_SUCCESS', items: [{ id: 3 }, { id: 4 }] },
        { type: 'FETCH_SUCCESS', items: [{ id: 5 }, { id: 6 }] },
      ],
    },
    expectedOutput: {
      items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }],
      page: 3,
      hasMore: true,
      loading: false,
    },
  },
  {
    description: 'FETCH_START then FETCH_SUCCESS: loading flag clears',
    input: {
      initialState: { items: [], page: 0, hasMore: true, loading: false },
      actions: [
        { type: 'FETCH_START' },
        { type: 'FETCH_SUCCESS', items: [{ id: 1, title: 'A' }] },
      ],
    },
    expectedOutput: {
      items: [{ id: 1, title: 'A' }],
      page: 1,
      hasMore: true,
      loading: false,
    },
  },
  {
    description: 'Empty items page sets hasMore to false',
    input: {
      initialState: { items: [{ id: 1 }], page: 1, hasMore: true, loading: false },
      actions: [
        { type: 'FETCH_SUCCESS', items: [] },
      ],
    },
    expectedOutput: {
      items: [{ id: 1 }],
      page: 2,
      hasMore: false,
      loading: false,
    },
  },
  {
    description: 'Items already in state are not lost on subsequent fetch',
    input: {
      initialState: {
        items: [{ id: 10 }, { id: 11 }],
        page: 1,
        hasMore: true,
        loading: false,
      },
      actions: [
        { type: 'FETCH_SUCCESS', items: [{ id: 12 }, { id: 13 }] },
      ],
    },
    expectedOutput: {
      items: [{ id: 10 }, { id: 11 }, { id: 12 }, { id: 13 }],
      page: 2,
      hasMore: true,
      loading: false,
    },
  },
];

const VIS_P2 = [
  {
    description: 'Reset then fetch: page should be 1, not 2',
    input: {
      initialState: { items: [], page: 0, hasMore: true, loading: false },
      actions: [
        { type: 'FETCH_SUCCESS', items: [{ id: 1 }] },
        { type: 'RESET' },
        { type: 'FETCH_SUCCESS', items: [{ id: 99 }] },
      ],
    },
    expectedOutput: {
      items: [{ id: 99 }],
      page: 1,
      hasMore: true,
      loading: false,
    },
  },
  {
    description: 'Multiple fetches then reset: page counter starts over',
    input: {
      initialState: { items: [], page: 0, hasMore: true, loading: false },
      actions: [
        { type: 'FETCH_SUCCESS', items: [{ id: 1 }] },
        { type: 'FETCH_SUCCESS', items: [{ id: 2 }] },
        { type: 'FETCH_SUCCESS', items: [{ id: 3 }] },
        { type: 'RESET' },
        { type: 'FETCH_SUCCESS', items: [{ id: 10 }] },
      ],
    },
    expectedOutput: {
      items: [{ id: 10 }],
      page: 1,
      hasMore: true,
      loading: false,
    },
  },
];

const HID_P2 = [
  {
    description: 'Reset clears items even if they were accumulated across pages',
    input: {
      initialState: { items: [], page: 0, hasMore: true, loading: false },
      actions: [
        { type: 'FETCH_SUCCESS', items: [{ id: 1 }, { id: 2 }] },
        { type: 'FETCH_SUCCESS', items: [{ id: 3 }, { id: 4 }] },
        { type: 'RESET' },
      ],
    },
    expectedOutput: {
      items: [],
      page: 0,
      hasMore: true,
      loading: false,
    },
  },
  {
    description: 'Two resets in a row: page stays 0',
    input: {
      initialState: { items: [], page: 0, hasMore: true, loading: false },
      actions: [
        { type: 'FETCH_SUCCESS', items: [{ id: 1 }] },
        { type: 'RESET' },
        { type: 'RESET' },
      ],
    },
    expectedOutput: {
      items: [],
      page: 0,
      hasMore: true,
      loading: false,
    },
  },
  {
    description: 'Fetch, reset, fetch, fetch: second and third fetches of new search are pages 1 and 2',
    input: {
      initialState: { items: [], page: 0, hasMore: true, loading: false },
      actions: [
        { type: 'FETCH_SUCCESS', items: [{ id: 1 }] },
        { type: 'FETCH_SUCCESS', items: [{ id: 2 }] },
        { type: 'RESET' },
        { type: 'FETCH_SUCCESS', items: [{ id: 10 }] },
        { type: 'FETCH_SUCCESS', items: [{ id: 11 }] },
      ],
    },
    expectedOutput: {
      items: [{ id: 10 }, { id: 11 }],
      page: 2,
      hasMore: true,
      loading: false,
    },
  },
];

export const reactPaginatedFeed = {
  id: 'react-paginated-feed',
  title: 'Paginated Feed Reducer',
  difficulty: 'Medium',
  durationMinutes: 25,
  tags: ['react', 'useReducer', 'pagination', 'immutability', 'state'],
  description:
    'Fix two bugs in an infinite-scroll feed reducer: a FETCH_SUCCESS that overwrites accumulated items instead of appending to them, and a RESET that forgets to clear the page counter.',
  testRunner: {
    entryFile: 'solution.js',
    functionName: 'applyFeedActions',
    inputKeys: ['initialState', 'actions'],
  },
  parts: [
    {
      id: 'part-1', number: 1, title: 'FETCH_SUCCESS Overwrites Existing Items',
      readme: README_P1,
      starterFiles: STARTER_P1,
      visibleTests: VIS_P1,
      hiddenTests: HID_P1,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function feedReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        items:   [...state.items, ...action.items],
        page:    state.page + 1,
        loading: false,
        hasMore: action.items.length > 0,
      };
    case 'RESET':
      return { ...state, items: [], page: 0, hasMore: true, loading: false };
    default:
      return state;
  }
}

module.exports = {
  applyFeedActions: function (initialState, actions) {
    return actions.reduce(feedReducer, initialState);
  },
};
\`\`\`

The fix: \`FETCH_SUCCESS\` spreads the existing items before the new page instead of replacing the list.`,
    },
    {
      id: 'part-2', number: 2, title: 'RESET Forgets to Clear the Page Counter',
      readme: README_P2,
      starterFiles: STARTER_P2,
      visibleTests: VIS_P2,
      hiddenTests: HID_P2,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function feedReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        items:   [...state.items, ...action.items],
        page:    state.page + 1,
        loading: false,
        hasMore: action.items.length > 0,
      };
    case 'RESET':
      return { ...state, items: [], page: 0, hasMore: true, loading: false };
    default:
      return state;
  }
}

module.exports = {
  applyFeedActions: function (initialState, actions) {
    return actions.reduce(feedReducer, initialState);
  },
};
\`\`\`

The fix: \`RESET\` sets \`page: 0\` so the next fetch of a new search starts from the first page.`,
    },
  ],
};

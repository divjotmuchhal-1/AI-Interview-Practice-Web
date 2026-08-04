// ─── Search + Filter Reducer ──────────────────────────────────────────────────
// Inspired by: Google Workspace file browser / Notion database-view interviews
// Two parts: case-sensitive filter misses results → sort discards the active filter

const README_P1 = `# Search Filter, Part 1: Case-Sensitive Match Misses Results

## Background

\`applySearchActions(initialState, actions)\` applies \`SET_QUERY\` and \`SORT_BY\` actions to a state of \`{ allItems, query, sortBy, filteredItems }\`. \`SET_QUERY\` updates \`query\` and recomputes \`filteredItems\` by matching item names against the query.

## Bug Report

Searching "report" returns no results even though the list contains "Q3 Report". Searches only succeed when the query's casing exactly matches the item name.

## What to Implement

- **\`applySearchActions(initialState, actions)\`** in \`solution.js\`: fix \`SET_QUERY\` so item name matching is case-insensitive.
`;

const README_P2 = `# Search Filter, Part 2: SORT_BY Drops the Active Filter

## Background

Part 1 is complete. \`SORT_BY\` should sort \`filteredItems\` while keeping the active query applied.

## Bug Report

Sorting after a search shows all items in sorted order, ignoring the current query. Items that were filtered out reappear after sorting.

## What to Implement

- **\`applySearchActions(initialState, actions)\`** in \`solution.js\`: fix \`SORT_BY\` so it applies both the current query filter and the new sort order when computing \`filteredItems\`.
`;

const STARTER_P1 = {
  'solution.js': `function searchReducer(state, action) {
  switch (action.type) {
    case 'SET_QUERY': {
      return {
        ...state,
        query: action.query,
        filteredItems: state.allItems.filter(function (item) {
          // BUG: case-sensitive. 'Q3 Report'.includes('report') is false
          return item.name.includes(action.query);
        }),
      };
    }
    case 'SORT_BY': {
      var sorted = [...state.filteredItems].sort(function (a, b) {
        return a[action.field].localeCompare(b[action.field]);
      });
      return { ...state, sortBy: action.field, filteredItems: sorted };
    }
    default:
      return state;
  }
}

module.exports = {
  applySearchActions: function (initialState, actions) {
    return actions.reduce(searchReducer, initialState);
  },
};
`,
};

const STARTER_P2 = {
  'solution.js': `function computeVisible(allItems, query, sortBy) {
  var filtered = allItems.filter(function (item) {
    return item.name.toLowerCase().includes(query.toLowerCase());
  });
  return filtered.slice().sort(function (a, b) {
    return a[sortBy].localeCompare(b[sortBy]);
  });
}

function searchReducer(state, action) {
  switch (action.type) {
    case 'SET_QUERY': {
      return {
        ...state,
        query: action.query,
        filteredItems: computeVisible(state.allItems, action.query, state.sortBy),
      };
    }
    case 'SORT_BY': {
      // BUG: ignores active query, sorts allItems directly instead of calling computeVisible
      var sorted = [...state.allItems].sort(function (a, b) {
        return a[action.field].localeCompare(b[action.field]);
      });
      return { ...state, sortBy: action.field, filteredItems: sorted };
    }
    default:
      return state;
  }
}

module.exports = {
  applySearchActions: function (initialState, actions) {
    return actions.reduce(searchReducer, initialState);
  },
};
`,
};

const ALL_ITEMS = [
  { id: 1, name: 'Widget',  type: 'product' },
  { id: 2, name: 'Gadget',  type: 'product' },
  { id: 3, name: 'Wand',    type: 'accessory' },
  { id: 4, name: 'Trinket', type: 'accessory' },
];

const INIT = {
  allItems:      ALL_ITEMS,
  query:         '',
  sortBy:        'name',
  filteredItems: ALL_ITEMS,
};

const VIS_P1 = [
  {
    description: 'Lowercase query matches uppercase item name',
    input: {
      initialState: INIT,
      actions: [{ type: 'SET_QUERY', query: 'widget' }],
    },
    expectedOutput: {
      allItems:      ALL_ITEMS,
      query:         'widget',
      sortBy:        'name',
      filteredItems: [{ id: 1, name: 'Widget', type: 'product' }],
    },
  },
  {
    description: 'Mixed-case query matches regardless of item casing',
    input: {
      initialState: INIT,
      actions: [{ type: 'SET_QUERY', query: 'W' }],
    },
    expectedOutput: {
      allItems:      ALL_ITEMS,
      query:         'W',
      sortBy:        'name',
      filteredItems: [
        { id: 1, name: 'Widget', type: 'product' },
        { id: 3, name: 'Wand',   type: 'accessory' },
      ],
    },
  },
];

const HID_P1 = [
  {
    description: 'Uppercase query matches lowercase portion of name',
    input: {
      initialState: INIT,
      actions: [{ type: 'SET_QUERY', query: 'ADGET' }],
    },
    expectedOutput: {
      allItems:      ALL_ITEMS,
      query:         'ADGET',
      sortBy:        'name',
      filteredItems: [{ id: 2, name: 'Gadget', type: 'product' }],
    },
  },
  {
    description: 'Empty query returns all items',
    input: {
      initialState: INIT,
      actions: [{ type: 'SET_QUERY', query: '' }],
    },
    expectedOutput: {
      allItems:      ALL_ITEMS,
      query:         '',
      sortBy:        'name',
      filteredItems: ALL_ITEMS,
    },
  },
  {
    description: 'Query with no matches returns empty filteredItems',
    input: {
      initialState: INIT,
      actions: [{ type: 'SET_QUERY', query: 'xyz' }],
    },
    expectedOutput: {
      allItems:      ALL_ITEMS,
      query:         'xyz',
      sortBy:        'name',
      filteredItems: [],
    },
  },
  {
    description: 'Two sequential queries: second replaces first',
    input: {
      initialState: INIT,
      actions: [
        { type: 'SET_QUERY', query: 'w' },
        { type: 'SET_QUERY', query: 'g' },
      ],
    },
    expectedOutput: {
      allItems:      ALL_ITEMS,
      query:         'g',
      sortBy:        'name',
      filteredItems: [
        { id: 1, name: 'Widget', type: 'product' },
        { id: 2, name: 'Gadget', type: 'product' },
      ],
    },
  },
];

const ITEMS_P2 = [
  { id: 1, name: 'Widget',  type: 'product' },
  { id: 2, name: 'Gadget',  type: 'product' },
  { id: 3, name: 'Wand',    type: 'accessory' },
];

const INIT_P2 = {
  allItems:      ITEMS_P2,
  query:         '',
  sortBy:        'name',
  filteredItems: ITEMS_P2,
};

const VIS_P2 = [
  {
    description: 'Filter then sort: sorted results respect the active query',
    input: {
      initialState: INIT_P2,
      actions: [
        { type: 'SET_QUERY', query: 'w' },
        { type: 'SORT_BY',   field: 'name' },
      ],
    },
    expectedOutput: {
      allItems:      ITEMS_P2,
      query:         'w',
      sortBy:        'name',
      filteredItems: [
        { id: 3, name: 'Wand',   type: 'accessory' },
        { id: 1, name: 'Widget', type: 'product' },
      ],
    },
  },
  {
    description: 'Empty query with sort shows all items sorted',
    input: {
      initialState: INIT_P2,
      actions: [{ type: 'SORT_BY', field: 'name' }],
    },
    expectedOutput: {
      allItems:      ITEMS_P2,
      query:         '',
      sortBy:        'name',
      filteredItems: [
        { id: 2, name: 'Gadget', type: 'product' },
        { id: 3, name: 'Wand',   type: 'accessory' },
        { id: 1, name: 'Widget', type: 'product' },
      ],
    },
  },
];

const HID_P2 = [
  {
    description: 'Sort then filter: filter respects the current sortBy',
    input: {
      initialState: INIT_P2,
      actions: [
        { type: 'SORT_BY',   field: 'name' },
        { type: 'SET_QUERY', query: 'w' },
      ],
    },
    expectedOutput: {
      allItems:      ITEMS_P2,
      query:         'w',
      sortBy:        'name',
      filteredItems: [
        { id: 3, name: 'Wand',   type: 'accessory' },
        { id: 1, name: 'Widget', type: 'product' },
      ],
    },
  },
  {
    description: 'Changing query after sort still produces sorted filtered results',
    input: {
      initialState: INIT_P2,
      actions: [
        { type: 'SORT_BY',   field: 'name' },
        { type: 'SET_QUERY', query: 'g' },
        { type: 'SET_QUERY', query: '' },
      ],
    },
    expectedOutput: {
      allItems:      ITEMS_P2,
      query:         '',
      sortBy:        'name',
      filteredItems: [
        { id: 2, name: 'Gadget', type: 'product' },
        { id: 3, name: 'Wand',   type: 'accessory' },
        { id: 1, name: 'Widget', type: 'product' },
      ],
    },
  },
  {
    description: 'Query returning one item is unaffected by sort (trivially correct)',
    input: {
      initialState: INIT_P2,
      actions: [
        { type: 'SET_QUERY', query: 'gadget' },
        { type: 'SORT_BY',   field: 'name' },
      ],
    },
    expectedOutput: {
      allItems:      ITEMS_P2,
      query:         'gadget',
      sortBy:        'name',
      filteredItems: [{ id: 2, name: 'Gadget', type: 'product' }],
    },
  },
  {
    description: 'No-match query returns empty list regardless of sort',
    input: {
      initialState: INIT_P2,
      actions: [
        { type: 'SET_QUERY', query: 'zzz' },
        { type: 'SORT_BY',   field: 'name' },
      ],
    },
    expectedOutput: {
      allItems:      ITEMS_P2,
      query:         'zzz',
      sortBy:        'name',
      filteredItems: [],
    },
  },
];

export const reactSearchFilter = {
  id: 'react-search-filter',
  title: 'Search & Filter Reducer Bugs',
  difficulty: 'Medium',
  durationMinutes: 25,
  tags: ['react', 'useMemo', 'derived-state', 'useState', 'filter', 'sort'],
  description:
    'Fix two bugs in a file-browser reducer: a case-sensitive filter that silently drops valid results, and a sort operation that discards the active search query by reading from allItems instead of re-applying both filter and sort together.',
  testRunner: {
    entryFile:    'solution.js',
    functionName: 'applySearchActions',
    inputKeys:    ['initialState', 'actions'],
  },
  parts: [
    {
      id: 'part-1', number: 1, title: 'Case-Sensitive Filter Misses Results',
      readme: README_P1,
      starterFiles: STARTER_P1,
      visibleTests: VIS_P1,
      hiddenTests: HID_P1,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function searchReducer(state, action) {
  switch (action.type) {
    case 'SET_QUERY': {
      return {
        ...state,
        query: action.query,
        filteredItems: state.allItems.filter(function (item) {
          return item.name.toLowerCase().includes(action.query.toLowerCase());
        }),
      };
    }
    case 'SORT_BY': {
      var sorted = [...state.filteredItems].sort(function (a, b) {
        return a[action.field].localeCompare(b[action.field]);
      });
      return { ...state, sortBy: action.field, filteredItems: sorted };
    }
    default:
      return state;
  }
}

module.exports = {
  applySearchActions: function (initialState, actions) {
    return actions.reduce(searchReducer, initialState);
  },
};
\`\`\`

The fix: both the item name and the query are lower-cased before comparing, making the match case-insensitive.`,
    },
    {
      id: 'part-2', number: 2, title: 'SORT_BY Discards the Active Filter',
      readme: README_P2,
      starterFiles: STARTER_P2,
      visibleTests: VIS_P2,
      hiddenTests: HID_P2,
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function computeVisible(allItems, query, sortBy) {
  var filtered = allItems.filter(function (item) {
    return item.name.toLowerCase().includes(query.toLowerCase());
  });
  return filtered.slice().sort(function (a, b) {
    return a[sortBy].localeCompare(b[sortBy]);
  });
}

function searchReducer(state, action) {
  switch (action.type) {
    case 'SET_QUERY': {
      return {
        ...state,
        query: action.query,
        filteredItems: computeVisible(state.allItems, action.query, state.sortBy),
      };
    }
    case 'SORT_BY': {
      return {
        ...state,
        sortBy: action.field,
        filteredItems: computeVisible(state.allItems, state.query, action.field),
      };
    }
    default:
      return state;
  }
}

module.exports = {
  applySearchActions: function (initialState, actions) {
    return actions.reduce(searchReducer, initialState);
  },
};
\`\`\`

The fix: \`SORT_BY\` calls \`computeVisible\` with the current query, so filter and sort always compose. This is the reducer equivalent of \`useMemo(() => computeVisible(items, query, sortBy), [items, query, sortBy])\`.`,
    },
  ],
};

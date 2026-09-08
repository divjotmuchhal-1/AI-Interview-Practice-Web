export const sqlUserSpend = {
  id: 'sql-user-spend',
  title: 'User Spend Report',
  difficulty: 'Medium',
  description:
    'Fix broken SQL aggregation queries in a per-user spend report.',
  tags: ['sql', 'aggregation', 'group-by', 'having'],
  durationMinutes: 25,
  testRunner: {
    language: 'sql',
    entryFile: 'query.sql',
    schema: `CREATE TABLE orders (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  amount     INTEGER NOT NULL,
  status     TEXT    NOT NULL,
  created_at TEXT    NOT NULL
);`,
  },

  parts: [
    // ── Part 1: Missing GROUP BY ──────────────────────────────────────────────
    {
      id: 'part-1',
      title: 'Per-User Totals',
      readme: `# User Spend Report, Part 1: Per-User Totals

## Background

The \`orders\` table has columns \`user_id\`, \`amount\`, \`status\` (\`'completed'\`, \`'refunded'\`, \`'pending'\`), and \`created_at\`. The query should return each user's total completed spend as \`user_id\` and \`total_spend\`, ordered by \`total_spend\` descending.

## Bug Report

The query returns a single row with a grand total instead of one row per user.

## What to Implement

- **\`query.sql\`**: fix the query so it returns one row per \`user_id\` with that user's total completed spend as \`total_spend\`, ordered by \`total_spend\` descending.`,

      starterFiles: {
        'query.sql': `SELECT user_id, SUM(amount) AS total_spend
FROM orders
WHERE status = 'completed'
ORDER BY total_spend DESC;
`,
      },

      visibleTests: [
        {
          description: 'returns one row per user with their completed spend',
          seedSQL: `INSERT INTO orders VALUES
(1, 101,  50, 'completed', '2024-01-10'),
(2, 101,  75, 'completed', '2024-01-15'),
(3, 102,  30, 'completed', '2024-01-20'),
(4, 103, 200, 'completed', '2024-01-25'),
(5, 102,  45, 'refunded',  '2024-01-28');`,
          expectedOutput: [
            { user_id: 103, total_spend: 200 },
            { user_id: 101, total_spend: 125 },
            { user_id: 102, total_spend: 30 },
          ],
        },
        {
          description: 'refunded and pending orders are excluded from totals',
          seedSQL: `INSERT INTO orders VALUES
(1, 201, 100, 'completed', '2024-01-01'),
(2, 201,  50, 'refunded',  '2024-01-02'),
(3, 202,  80, 'pending',   '2024-01-03'),
(4, 202,  60, 'completed', '2024-01-04');`,
          expectedOutput: [
            { user_id: 201, total_spend: 100 },
            { user_id: 202, total_spend: 60 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'users with only one order still appear individually',
          seedSQL: `INSERT INTO orders VALUES
(1, 301, 150, 'completed', '2024-02-01'),
(2, 302,  90, 'completed', '2024-02-02'),
(3, 303, 120, 'completed', '2024-02-03');`,
          expectedOutput: [
            { user_id: 301, total_spend: 150 },
            { user_id: 303, total_spend: 120 },
            { user_id: 302, total_spend: 90 },
          ],
        },
        {
          description: 'ordering is strictly descending by total',
          seedSQL: `INSERT INTO orders VALUES
(1, 401,  20, 'completed', '2024-03-01'),
(2, 402,  80, 'completed', '2024-03-02'),
(3, 401,  30, 'completed', '2024-03-03');`,
          expectedOutput: [
            { user_id: 402, total_spend: 80 },
            { user_id: 401, total_spend: 50 },
          ],
        },
      ],

      answer: {
        fixedCode: `SELECT user_id, SUM(amount) AS total_spend
FROM orders
WHERE status = 'completed'
GROUP BY user_id
ORDER BY total_spend DESC;`,
        explanation:
          "Without GROUP BY, a SELECT with an aggregate collapses all rows to a single result: the engine implicitly 'groups everything together.' Adding GROUP BY user_id tells SQLite to compute SUM(amount) separately per unique user_id. This is the most common SQL aggregation mistake: writing a query that returns one global total instead of per-entity subtotals. The alias total_spend is valid in ORDER BY because SQLite resolves aliases after the SELECT is evaluated.",
      },
    },

    // ── Part 2: HAVING vs WHERE ───────────────────────────────────────────────
    {
      id: 'part-2',
      title: 'High-Value Customer Filter',
      readme: `# User Spend Report, Part 2: High-Value Customer Filter

## Background

Part 1 is complete. The query should return only users whose total completed spend is strictly greater than 100 (a total of exactly 100 is excluded), with columns \`user_id\` and \`total_spend\`, ordered by \`total_spend\` descending.

## Bug Report

Running the query fails with the error \`no such column: total_spend\`.

## What to Implement

- **\`query.sql\`**: fix the query so it executes without error and returns only users above the threshold.`,

      starterFiles: {
        'query.sql': `SELECT user_id, SUM(amount) AS total_spend
FROM orders
WHERE status = 'completed'
  AND total_spend > 100
GROUP BY user_id
ORDER BY total_spend DESC;
`,
      },

      visibleTests: [
        {
          description: 'only users with total_spend > 100 appear',
          seedSQL: `INSERT INTO orders VALUES
(1, 101,  60, 'completed', '2024-01-10'),
(2, 101,  90, 'completed', '2024-01-15'),
(3, 102,  30, 'completed', '2024-01-20'),
(4, 103, 200, 'completed', '2024-01-25'),
(5, 103, 150, 'completed', '2024-01-26');`,
          expectedOutput: [
            { user_id: 103, total_spend: 350 },
            { user_id: 101, total_spend: 150 },
          ],
        },
        {
          description: 'user with total exactly at threshold (100) is excluded',
          seedSQL: `INSERT INTO orders VALUES
(1, 201, 100, 'completed', '2024-02-01'),
(2, 202,  50, 'completed', '2024-02-02'),
(3, 202,  60, 'completed', '2024-02-03'),
(4, 203, 200, 'completed', '2024-02-04');`,
          expectedOutput: [
            { user_id: 203, total_spend: 200 },
            { user_id: 202, total_spend: 110 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'refunded orders are still excluded before aggregating',
          seedSQL: `INSERT INTO orders VALUES
(1, 301, 120, 'completed', '2024-03-01'),
(2, 301,  80, 'refunded',  '2024-03-02'),
(3, 302, 200, 'completed', '2024-03-03');`,
          expectedOutput: [
            { user_id: 302, total_spend: 200 },
            { user_id: 301, total_spend: 120 },
          ],
        },
        {
          description: 'returns empty result when all users are below threshold',
          seedSQL: `INSERT INTO orders VALUES
(1, 401, 40, 'completed', '2024-04-01'),
(2, 402, 60, 'completed', '2024-04-02');`,
          expectedOutput: [],
        },
      ],

      answer: {
        fixedCode: `SELECT user_id, SUM(amount) AS total_spend
FROM orders
WHERE status = 'completed'
GROUP BY user_id
HAVING total_spend > 100
ORDER BY total_spend DESC;`,
        explanation:
          "WHERE filters individual rows before grouping: aggregate functions don't exist yet at that point in the execution order (FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY). HAVING filters groups after aggregation is complete, making it the right place for conditions on aggregated values. In SQLite you can use the alias 'total_spend' in HAVING since the alias is resolved during SELECT evaluation. Alternatively, HAVING SUM(amount) > 100 is the ANSI-compatible form that works in every SQL dialect.",
      },
    },
  ],
};

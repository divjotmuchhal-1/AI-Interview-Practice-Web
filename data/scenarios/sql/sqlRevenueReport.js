export const sqlRevenueReport = {
  id: 'sql-revenue-report',
  title: 'Monthly Revenue Report',
  difficulty: 'Medium',
  description:
    'Write SQL queries that build a monthly revenue report with month-over-month growth.',
  tags: ['sql', 'date-functions', 'cte', 'lag', 'window-functions'],
  durationMinutes: 30,
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
    // ── Part 1: Monthly totals ────────────────────────────────────────────────
    {
      id: 'part-1',
      title: 'Monthly Revenue Totals',
      readme: `# Monthly Revenue Report, Part 1: Monthly Revenue Totals

## Background

The \`orders\` table has \`user_id\`, \`amount\`, \`status\` (\`'completed'\`, \`'refunded'\`, \`'pending'\`), and \`created_at\` (ISO date string). Starting from the empty \`query.sql\`, write a query that reports total completed-order revenue per calendar month.

## Requirements

- Return columns \`month\` (a \`'YYYY-MM'\` string) and \`total_revenue\` (integer sum of \`amount\`).
- Count completed orders only; refunded and pending orders contribute nothing.
- A month with no completed orders produces no row.
- Order rows by \`month\` ascending.

## What to Implement

- **\`query.sql\`**: write the monthly revenue query meeting the requirements above.`,

      starterFiles: {
        'query.sql': `-- Write your query here.
-- Return columns: month (YYYY-MM string), total_revenue (integer sum)
-- Exclude non-completed orders. Order by month ascending.
`,
      },

      visibleTests: [
        {
          description: 'returns one row per month with completed revenue only',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 100, 'completed', '2024-01-05'),
(2, 2, 250, 'completed', '2024-01-12'),
(3, 3,  75, 'refunded',  '2024-01-20'),
(4, 1, 180, 'completed', '2024-02-08'),
(5, 2, 320, 'completed', '2024-02-14'),
(6, 4, 150, 'completed', '2024-02-22'),
(7, 3, 400, 'completed', '2024-03-01'),
(8, 5,  60, 'completed', '2024-03-15');`,
          expectedOutput: [
            { month: '2024-01', total_revenue: 350 },
            { month: '2024-02', total_revenue: 650 },
            { month: '2024-03', total_revenue: 460 },
          ],
        },
        {
          description: 'months with only refunded orders produce no row',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 200, 'completed', '2024-06-01'),
(2, 2, 100, 'refunded',  '2024-07-01'),
(3, 3, 150, 'completed', '2024-08-01'),
(4, 4,  50, 'pending',   '2024-08-15');`,
          expectedOutput: [
            { month: '2024-06', total_revenue: 200 },
            { month: '2024-08', total_revenue: 150 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'multiple orders on the same day are summed into one month row',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 100, 'completed', '2024-04-01'),
(2, 2, 200, 'completed', '2024-04-01'),
(3, 3,  50, 'completed', '2024-04-30');`,
          expectedOutput: [
            { month: '2024-04', total_revenue: 350 },
          ],
        },
        {
          description: 'ordering is ascending by month',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 500, 'completed', '2024-12-01'),
(2, 2, 100, 'completed', '2024-01-01'),
(3, 3, 300, 'completed', '2024-06-01');`,
          expectedOutput: [
            { month: '2024-01', total_revenue: 100 },
            { month: '2024-06', total_revenue: 300 },
            { month: '2024-12', total_revenue: 500 },
          ],
        },
      ],

      answer: {
        fixedCode: `SELECT strftime('%Y-%m', created_at) AS month,
       SUM(amount) AS total_revenue
FROM orders
WHERE status = 'completed'
GROUP BY strftime('%Y-%m', created_at)
ORDER BY month;`,
        explanation:
          "strftime('%Y-%m', created_at) extracts the year-month string from an ISO date column, SQLite's equivalent of DATE_TRUNC('month', ...) in Postgres or MONTH()/YEAR() in MySQL. Grouping on the same expression (or its alias) collapses all orders in a calendar month into one row. The WHERE clause must filter on status before grouping so excluded orders don't contribute to totals. Ordering by the 'YYYY-MM' string works correctly because ISO date strings compare lexicographically in chronological order.",
      },
    },

    // ── Part 2: Month-over-month growth with LAG() ────────────────────────────
    {
      id: 'part-2',
      title: 'Month-over-Month Growth',
      readme: `# Monthly Revenue Report, Part 2: Month-over-Month Growth

## Background

Part 1 is complete. Extend the monthly report with a \`mom_change\` column: each month's \`total_revenue\` minus the previous month's.

## Requirements

- Return columns \`month\`, \`total_revenue\` (both as in Part 1), and \`mom_change\`.
- \`mom_change\` is NULL for the earliest month and may be negative.
- Count completed orders only.
- Order rows by \`month\` ascending.

## What to Implement

- **\`query.sql\`**: write the month-over-month query meeting the requirements above.`,

      starterFiles: {
        'query.sql': `-- Write your query here.
-- Hint: use a CTE to get monthly totals, then LAG() to compute the change.
-- Return columns: month, total_revenue, mom_change (null for the first month)
-- Order by month ascending.
`,
      },

      visibleTests: [
        {
          description: 'mom_change is null for the first month, correct delta for rest',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 100, 'completed', '2024-01-05'),
(2, 2, 250, 'completed', '2024-01-12'),
(3, 3,  75, 'refunded',  '2024-01-20'),
(4, 1, 180, 'completed', '2024-02-08'),
(5, 2, 320, 'completed', '2024-02-14'),
(6, 4, 150, 'completed', '2024-02-22'),
(7, 3, 400, 'completed', '2024-03-01'),
(8, 5,  60, 'completed', '2024-03-15');`,
          expectedOutput: [
            { month: '2024-01', total_revenue: 350, mom_change: null },
            { month: '2024-02', total_revenue: 650, mom_change: 300 },
            { month: '2024-03', total_revenue: 460, mom_change: -190 },
          ],
        },
        {
          description: 'two-month dataset: first null, second has correct delta',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 400, 'completed', '2024-05-10'),
(2, 2, 600, 'completed', '2024-06-20');`,
          expectedOutput: [
            { month: '2024-05', total_revenue: 400, mom_change: null },
            { month: '2024-06', total_revenue: 600, mom_change: 200 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'negative mom_change when revenue decreases',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 1000, 'completed', '2024-09-01'),
(2, 2,  400, 'completed', '2024-10-01');`,
          expectedOutput: [
            { month: '2024-09', total_revenue: 1000, mom_change: null },
            { month: '2024-10', total_revenue:  400, mom_change: -600 },
          ],
        },
        {
          description: 'four months: chain of correct deltas',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 100, 'completed', '2024-01-01'),
(2, 1, 200, 'completed', '2024-02-01'),
(3, 1, 150, 'completed', '2024-03-01'),
(4, 1, 350, 'completed', '2024-04-01');`,
          expectedOutput: [
            { month: '2024-01', total_revenue: 100, mom_change: null },
            { month: '2024-02', total_revenue: 200, mom_change: 100 },
            { month: '2024-03', total_revenue: 150, mom_change: -50 },
            { month: '2024-04', total_revenue: 350, mom_change: 200 },
          ],
        },
      ],

      answer: {
        fixedCode: `WITH monthly AS (
  SELECT strftime('%Y-%m', created_at) AS month,
         SUM(amount) AS total_revenue
  FROM orders
  WHERE status = 'completed'
  GROUP BY strftime('%Y-%m', created_at)
)
SELECT month,
       total_revenue,
       total_revenue - LAG(total_revenue) OVER (ORDER BY month) AS mom_change
FROM monthly
ORDER BY month;`,
        explanation:
          "LAG(total_revenue) OVER (ORDER BY month) looks back one row in the result set ordered by month, returning the previous month's revenue. Subtracting it from the current month gives the absolute dollar change. LAG() returns NULL for the first row (no previous month exists), which is exactly what the spec requires. Wrapping the aggregation in a CTE keeps the query readable: you build the monthly totals first, then compute the delta in a second pass over those totals. This CTE + LAG pattern is the standard way to compute period-over-period metrics in analytics.",
      },
    },
  ],
};

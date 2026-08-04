export const sqlCustomerLifetime = {
  id: 'sql-customer-lifetime',
  title: 'Customer Lifetime Analysis',
  difficulty: 'Hard',
  description:
    'Write analytical SQL queries to identify dormant customers and segment revenue by purchase type, skills tested in dbt and data engineering rounds.',
  tags: ['sql', 'left-join', 'row-number', 'window-functions', 'cte', 'case-when'],
  durationMinutes: 35,
  testRunner: {
    language: 'sql',
    entryFile: 'query.sql',
    schema: `CREATE TABLE users (
  id         INTEGER PRIMARY KEY,
  email      TEXT    NOT NULL,
  created_at TEXT    NOT NULL
);

CREATE TABLE purchases (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  amount     INTEGER NOT NULL,
  created_at TEXT    NOT NULL
);`,
  },

  parts: [
    // ── Part 1: Users with no purchases (LEFT JOIN + NULL check) ──────────────
    {
      id: 'part-1',
      title: 'Dormant Users',
      readme: `# Customer Lifetime Analysis, Part 1: Dormant Users

## Background

The \`users\` table has \`id\`, \`email\`, and \`created_at\`. The \`purchases\` table has \`id\`, \`user_id\`, \`amount\`, and \`created_at\`. The query should return all users who have never made a purchase.

## Bug Report

The query is an unimplemented stub and currently returns no results.

## What to Implement

- **\`query.sql\`**: return \`id\` and \`email\` for users with no entries in \`purchases\`, ordered by \`id\` ascending.`,

      starterFiles: {
        'query.sql': `-- Write your query here.
-- Return columns: id, email
-- Include only users with zero purchases. Order by id ascending.
`,
      },

      visibleTests: [
        {
          description: 'returns only users with no purchase records',
          seedSQL: `INSERT INTO users VALUES
(1, 'alice@example.com',   '2024-01-01'),
(2, 'bob@example.com',     '2024-01-05'),
(3, 'carol@example.com',   '2024-01-10'),
(4, 'dave@example.com',    '2024-01-15'),
(5, 'eve@example.com',     '2024-01-20');
INSERT INTO purchases VALUES
(1, 1, 100, '2024-02-01'),
(2, 1, 200, '2024-03-01'),
(3, 2,  50, '2024-02-15'),
(4, 5, 300, '2024-03-10');`,
          expectedOutput: [
            { id: 3, email: 'carol@example.com' },
            { id: 4, email: 'dave@example.com' },
          ],
        },
        {
          description: 'returns empty result when all users have purchases',
          seedSQL: `INSERT INTO users VALUES
(1, 'alice@example.com', '2024-01-01'),
(2, 'bob@example.com',   '2024-01-05');
INSERT INTO purchases VALUES
(1, 1, 100, '2024-02-01'),
(2, 2, 200, '2024-02-10');`,
          expectedOutput: [],
        },
      ],

      hiddenTests: [
        {
          description: 'user with multiple purchases is excluded (not dormant)',
          seedSQL: `INSERT INTO users VALUES
(1, 'a@test.com', '2024-01-01'),
(2, 'b@test.com', '2024-01-02'),
(3, 'c@test.com', '2024-01-03');
INSERT INTO purchases VALUES
(1, 1, 100, '2024-02-01'),
(2, 1, 200, '2024-02-15'),
(3, 1,  50, '2024-03-01');`,
          expectedOutput: [
            { id: 2, email: 'b@test.com' },
            { id: 3, email: 'c@test.com' },
          ],
        },
        {
          description: 'ordering is by id ascending',
          seedSQL: `INSERT INTO users VALUES
(10, 'z@test.com', '2024-01-01'),
(20, 'a@test.com', '2024-01-02'),
(30, 'm@test.com', '2024-01-03');`,
          expectedOutput: [
            { id: 10, email: 'z@test.com' },
            { id: 20, email: 'a@test.com' },
            { id: 30, email: 'm@test.com' },
          ],
        },
      ],

      answer: {
        fixedCode: `SELECT u.id, u.email
FROM users u
LEFT JOIN purchases p ON u.id = p.user_id
WHERE p.id IS NULL
ORDER BY u.id;`,
        explanation:
          "A LEFT JOIN keeps all rows from the left table (users) regardless of whether a matching row exists in purchases. When no purchase exists for a user, every column from purchases is NULL in the result. Filtering WHERE p.id IS NULL isolates exactly those non-matching rows: the users with zero purchases. This LEFT JOIN + NULL-check pattern is the idiomatic SQL for 'find records that have no related records,' and it outperforms NOT IN on large tables because it avoids a correlated subquery. NOT EXISTS is an equally valid alternative.",
      },
    },

    // ── Part 2: First vs repeat purchaser revenue ─────────────────────────────
    {
      id: 'part-2',
      title: 'First vs Repeat Revenue',
      readme: `# Customer Lifetime Analysis, Part 2: First vs Repeat Revenue

## Background

Part 1 is complete. The query should split all purchases into two types: a user's chronological first purchase (\`'first'\`) and every subsequent one (\`'repeat'\`). Return the count and total revenue for each type.

## Bug Report

The query is an unimplemented stub and currently returns no results.

## What to Implement

- **\`query.sql\`**: return \`purchase_type\`, \`order_count\`, and \`total_revenue\`, ordered by \`purchase_type\` ascending.

## Notes

- Chronological order (by \`created_at\`, not \`id\`) determines which purchase is each user's first.`,

      starterFiles: {
        'query.sql': `-- Write your query here.
-- Step 1: use a CTE with ROW_NUMBER() to number each user's purchases chronologically.
-- Step 2: classify each row as 'first' or 'repeat'.
-- Return columns: purchase_type, order_count, total_revenue
-- Order by purchase_type ascending.
`,
      },

      visibleTests: [
        {
          description: 'correctly splits first vs repeat revenue',
          seedSQL: `INSERT INTO users VALUES
(1, 'alice@example.com', '2024-01-01'),
(2, 'bob@example.com',   '2024-01-05'),
(3, 'carol@example.com', '2024-01-10');
INSERT INTO purchases VALUES
(1, 1, 100, '2024-02-01'),
(2, 1, 200, '2024-03-01'),
(3, 1, 150, '2024-04-01'),
(4, 2, 300, '2024-02-10'),
(5, 3,  50, '2024-02-20'),
(6, 3, 175, '2024-03-20');`,
          expectedOutput: [
            { purchase_type: 'first',  order_count: 3, total_revenue: 450 },
            { purchase_type: 'repeat', order_count: 3, total_revenue: 525 },
          ],
        },
        {
          description: 'users with only one purchase count as first only',
          seedSQL: `INSERT INTO users VALUES
(1, 'a@test.com', '2024-01-01'),
(2, 'b@test.com', '2024-01-02');
INSERT INTO purchases VALUES
(1, 1, 100, '2024-02-01'),
(2, 2, 200, '2024-02-15');`,
          expectedOutput: [
            { purchase_type: 'first', order_count: 2, total_revenue: 300 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'chronological ordering determines first vs repeat (not id)',
          seedSQL: `INSERT INTO users VALUES
(1, 'a@test.com', '2024-01-01');
INSERT INTO purchases VALUES
(10, 1, 500, '2024-03-01'),
(11, 1, 100, '2024-01-15'),
(12, 1, 200, '2024-02-01');`,
          expectedOutput: [
            { purchase_type: 'first',  order_count: 1, total_revenue: 100 },
            { purchase_type: 'repeat', order_count: 2, total_revenue: 700 },
          ],
        },
        {
          description: 'high repeat count with multiple users',
          seedSQL: `INSERT INTO users VALUES
(1, 'a@test.com', '2024-01-01'),
(2, 'b@test.com', '2024-01-02');
INSERT INTO purchases VALUES
(1, 1, 100, '2024-01-10'),
(2, 1, 100, '2024-01-20'),
(3, 1, 100, '2024-01-30'),
(4, 2, 200, '2024-02-01'),
(5, 2, 200, '2024-02-15');`,
          expectedOutput: [
            { purchase_type: 'first',  order_count: 2, total_revenue: 300 },
            { purchase_type: 'repeat', order_count: 3, total_revenue: 400 },
          ],
        },
      ],

      answer: {
        fixedCode: `WITH ranked AS (
  SELECT id,
         user_id,
         amount,
         created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS purchase_num
  FROM purchases
)
SELECT
  CASE WHEN purchase_num = 1 THEN 'first' ELSE 'repeat' END AS purchase_type,
  COUNT(*)    AS order_count,
  SUM(amount) AS total_revenue
FROM ranked
GROUP BY purchase_type
ORDER BY purchase_type;`,
        explanation:
          "ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) assigns sequential integers to each user's purchases in chronological order: 1, 2, 3, … per user_id. A CASE expression then maps 1 → 'first' and everything else → 'repeat'. Grouping on that derived label and aggregating COUNT and SUM gives the split. The key insight is that you need two passes: one to rank within each user's history, one to group the label across all users. A CTE cleanly separates those two steps. ROW_NUMBER() is preferred over RANK() here because it always assigns unique sequential integers, even when timestamps are identical.",
      },
    },
  ],
};

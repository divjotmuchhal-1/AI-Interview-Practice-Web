export const sqlFunnelAnalysis = {
  id: 'sql-funnel-analysis',
  title: 'Conversion Funnel Analysis',
  difficulty: 'Hard',
  description:
    'Fix broken funnel queries: the COUNT(*) vs COUNT(DISTINCT) trap and integer-division conversion rates that silently return zero.',
  tags: ['sql', 'count-distinct', 'funnel', 'case-when', 'cast'],
  durationMinutes: 35,
  testRunner: {
    language: 'sql',
    entryFile: 'query.sql',
    schema: `CREATE TABLE events (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  event_type TEXT    NOT NULL,
  created_at TEXT    NOT NULL
);`,
  },

  parts: [
    // ── Part 1: COUNT(*) instead of COUNT(DISTINCT user_id) ───────────────────
    {
      id: 'part-1',
      title: 'Unique Users per Funnel Step',
      readme: `# Conversion Funnel Analysis, Part 1: Unique Users per Funnel Step

## Background

The \`events\` table has \`user_id\`, \`event_type\` (\`'page_view'\`, \`'signup'\`, \`'purchase'\`), and \`created_at\`. The query should return the number of distinct users who reached each funnel step.

## Bug Report

The query counts total event rows instead of unique users. A user who fired \`'page_view'\` four times is counted as 4 instead of 1, making the funnel appear wider than it is.

## What to Implement

- **\`query.sql\`**: fix the aggregate so each user is counted once per event type. Return \`event_type\` and \`user_count\`, ordered by \`user_count\` descending.`,

      starterFiles: {
        'query.sql': `SELECT event_type,
       COUNT(*) AS user_count
FROM events
WHERE event_type IN ('page_view', 'signup', 'purchase')
GROUP BY event_type
ORDER BY user_count DESC;
`,
      },

      visibleTests: [
        {
          description: 'each user counted once per step, not once per event',
          seedSQL: `INSERT INTO events VALUES
(1,  1, 'page_view', '2024-01-01'),
(2,  1, 'page_view', '2024-01-01'),
(3,  1, 'page_view', '2024-01-01'),
(4,  1, 'page_view', '2024-01-01'),
(5,  1, 'signup',    '2024-01-02'),
(6,  1, 'purchase',  '2024-01-03'),
(7,  2, 'page_view', '2024-01-02'),
(8,  2, 'page_view', '2024-01-02'),
(9,  2, 'signup',    '2024-01-03'),
(10, 3, 'page_view', '2024-01-04');`,
          expectedOutput: [
            { event_type: 'page_view', user_count: 3 },
            { event_type: 'signup',    user_count: 2 },
            { event_type: 'purchase',  user_count: 1 },
          ],
        },
        {
          description: 'single user with repeated events returns user_count 1',
          seedSQL: `INSERT INTO events VALUES
(1, 42, 'page_view', '2024-02-01'),
(2, 42, 'page_view', '2024-02-01'),
(3, 42, 'page_view', '2024-02-01'),
(4, 42, 'signup',    '2024-02-02');`,
          expectedOutput: [
            { event_type: 'page_view', user_count: 1 },
            { event_type: 'signup',    user_count: 1 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'purchase step only: single qualifying user',
          seedSQL: `INSERT INTO events VALUES
(1, 1, 'page_view', '2024-03-01'),
(2, 2, 'page_view', '2024-03-01'),
(3, 1, 'signup',    '2024-03-02'),
(4, 2, 'signup',    '2024-03-02'),
(5, 1, 'purchase',  '2024-03-03'),
(6, 1, 'purchase',  '2024-03-04');`,
          expectedOutput: [
            { event_type: 'page_view', user_count: 2 },
            { event_type: 'signup',    user_count: 2 },
            { event_type: 'purchase',  user_count: 1 },
          ],
        },
        {
          description: 'non-funnel event types are excluded',
          seedSQL: `INSERT INTO events VALUES
(1, 1, 'page_view', '2024-04-01'),
(2, 1, 'click',     '2024-04-01'),
(3, 1, 'signup',    '2024-04-02'),
(4, 2, 'page_view', '2024-04-03'),
(5, 2, 'hover',     '2024-04-03');`,
          expectedOutput: [
            { event_type: 'page_view', user_count: 2 },
            { event_type: 'signup',    user_count: 1 },
          ],
        },
        {
          description: 'five users, all repeated views: unique counts cascade down the funnel',
          seedSQL: `INSERT INTO events VALUES
(1,  1, 'page_view', '2024-05-01'),
(2,  1, 'page_view', '2024-05-01'),
(3,  1, 'signup',    '2024-05-02'),
(4,  1, 'purchase',  '2024-05-03'),
(5,  2, 'page_view', '2024-05-01'),
(6,  2, 'page_view', '2024-05-01'),
(7,  2, 'signup',    '2024-05-02'),
(8,  3, 'page_view', '2024-05-01'),
(9,  3, 'page_view', '2024-05-01'),
(10, 3, 'page_view', '2024-05-01'),
(11, 4, 'page_view', '2024-05-02'),
(12, 5, 'page_view', '2024-05-02');`,
          expectedOutput: [
            { event_type: 'page_view', user_count: 5 },
            { event_type: 'signup',    user_count: 2 },
            { event_type: 'purchase',  user_count: 1 },
          ],
        },
      ],

      answer: {
        fixedCode: `SELECT event_type,
       COUNT(DISTINCT user_id) AS user_count
FROM events
WHERE event_type IN ('page_view', 'signup', 'purchase')
GROUP BY event_type
ORDER BY user_count DESC;`,
        explanation:
          "COUNT(*) counts every row in the group: if a user fires 'page_view' four times, they contribute 4. COUNT(DISTINCT user_id) counts unique user IDs within the group, so the same user counts as 1 regardless of how many events they generate. This is the most common funnel query mistake: the buggy query makes engagement look higher than it is and produces conversion rates that don't reflect actual user drop-off. The fix is a single word, DISTINCT, but its absence corrupts every metric derived from the funnel.",
      },
    },

    // ── Part 2: Integer division in conversion rate ───────────────────────────
    {
      id: 'part-2',
      title: 'Signup-to-Purchase Conversion Rate',
      readme: `# Conversion Funnel Analysis, Part 2: Signup-to-Purchase Conversion Rate

## Background

Part 1 is complete. The query counts distinct users who signed up and who purchased, then divides to produce a decimal conversion rate.

## Bug Report

\`conversion_rate\` returns \`0\` for every dataset, even when purchases clearly exist.

## What to Implement

- **\`query.sql\`**: fix the division so it returns a decimal result. Return \`signup_users\`, \`purchase_users\`, and \`conversion_rate\`.`,

      starterFiles: {
        'query.sql': `WITH counts AS (
  SELECT
    COUNT(DISTINCT CASE WHEN event_type = 'signup'   THEN user_id END) AS signup_users,
    COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END) AS purchase_users
  FROM events
)
SELECT
  signup_users,
  purchase_users,
  purchase_users / signup_users AS conversion_rate
FROM counts;
`,
      },

      visibleTests: [
        {
          description: '1 of 4 signup users purchased: rate is 0.25',
          seedSQL: `INSERT INTO events VALUES
(1, 1, 'signup',   '2024-01-01'),
(2, 1, 'purchase', '2024-01-02'),
(3, 2, 'signup',   '2024-01-03'),
(4, 3, 'signup',   '2024-01-04'),
(5, 4, 'signup',   '2024-01-05');`,
          expectedOutput: [
            { signup_users: 4, purchase_users: 1, conversion_rate: 0.25 },
          ],
        },
        {
          description: '1 of 2 signup users purchased: rate is 0.5',
          seedSQL: `INSERT INTO events VALUES
(1, 1, 'signup',   '2024-02-01'),
(2, 1, 'purchase', '2024-02-02'),
(3, 2, 'signup',   '2024-02-01');`,
          expectedOutput: [
            { signup_users: 2, purchase_users: 1, conversion_rate: 0.5 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'all users converted: rate is 1.0',
          seedSQL: `INSERT INTO events VALUES
(1, 1, 'signup',   '2024-03-01'),
(2, 1, 'purchase', '2024-03-02'),
(3, 2, 'signup',   '2024-03-01'),
(4, 2, 'purchase', '2024-03-03');`,
          expectedOutput: [
            { signup_users: 2, purchase_users: 2, conversion_rate: 1.0 },
          ],
        },
        {
          description: '2 of 5 converted: rate is 0.4',
          seedSQL: `INSERT INTO events VALUES
(1,  1, 'signup',   '2024-04-01'),
(2,  1, 'purchase', '2024-04-02'),
(3,  2, 'signup',   '2024-04-01'),
(4,  2, 'purchase', '2024-04-03'),
(5,  3, 'signup',   '2024-04-01'),
(6,  4, 'signup',   '2024-04-01'),
(7,  5, 'signup',   '2024-04-01');`,
          expectedOutput: [
            { signup_users: 5, purchase_users: 2, conversion_rate: 0.4 },
          ],
        },
        {
          description: 'repeated purchase events do not inflate purchase_users',
          seedSQL: `INSERT INTO events VALUES
(1, 1, 'signup',   '2024-05-01'),
(2, 1, 'purchase', '2024-05-02'),
(3, 1, 'purchase', '2024-05-10'),
(4, 2, 'signup',   '2024-05-01'),
(5, 3, 'signup',   '2024-05-01'),
(6, 4, 'signup',   '2024-05-01');`,
          expectedOutput: [
            { signup_users: 4, purchase_users: 1, conversion_rate: 0.25 },
          ],
        },
      ],

      answer: {
        fixedCode: `WITH counts AS (
  SELECT
    COUNT(DISTINCT CASE WHEN event_type = 'signup'   THEN user_id END) AS signup_users,
    COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END) AS purchase_users
  FROM events
)
SELECT
  signup_users,
  purchase_users,
  CAST(purchase_users AS REAL) / signup_users AS conversion_rate
FROM counts;`,
        explanation:
          "In SQLite (and most SQL engines), dividing two integers performs integer division: the fractional part is silently discarded. 1 / 4 = 0, not 0.25. CAST(purchase_users AS REAL) converts the numerator to a floating-point value before the division happens, forcing decimal arithmetic. Alternatively, purchase_users * 1.0 / signup_users achieves the same result. This bug is particularly dangerous because the query runs without errors. It just silently returns 0 for any conversion rate below 100%, making every product funnel look broken. COUNT(DISTINCT CASE WHEN event_type = '...' THEN user_id END) is a standard pattern for pivot-style aggregation: the CASE returns user_id when the condition matches and NULL otherwise, and COUNT(DISTINCT ...) ignores NULLs automatically.",
      },
    },
  ],
};

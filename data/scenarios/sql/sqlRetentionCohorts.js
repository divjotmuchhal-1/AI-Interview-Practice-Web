export const sqlRetentionCohorts = {
  id: 'sql-retention-cohorts',
  title: 'User Retention & Cohort Analysis',
  difficulty: 'Hard',
  description:
    'Write retention queries from spec: Day-30 survivors and monthly cohort retention rates, the two metrics that drive every growth-team dashboard.',
  tags: ['sql', 'retention', 'cohort', 'date-functions', 'left-join', 'cte', 'cast'],
  durationMinutes: 35,
  testRunner: {
    language: 'sql',
    entryFile: 'query.sql',
    schema: `CREATE TABLE users (
  id         INTEGER PRIMARY KEY,
  created_at TEXT    NOT NULL
);

CREATE TABLE sessions (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at TEXT    NOT NULL
);`,
  },

  parts: [
    // ── Part 1: Day-30 Retained Users ─────────────────────────────────────────
    {
      id: 'part-1',
      title: 'Day-30 Retained Users',
      readme: `# User Retention & Cohort Analysis, Part 1: Day-30 Retained Users

## Background

The \`users\` table has \`id\` and \`created_at\`. The \`sessions\` table has \`id\`, \`user_id\`, and \`created_at\`. The query should return January 2024 users who had at least one session 30 or more days after their signup date, along with their earliest qualifying session date.

## Bug Report

The query is an unimplemented stub and currently returns no results.

## What to Implement

- **\`query.sql\`**: return \`user_id\`, \`signup_date\`, and \`first_return_date\` for qualifying users, ordered by \`user_id\` ascending.

## Notes

- The Day-30 boundary is inclusive: a session exactly 30 days after signup qualifies.`,

      starterFiles: {
        'query.sql': `-- Write your query here.
-- Return: user_id, signup_date, first_return_date
-- Include only January 2024 signups with a session >= 30 days after signup.
-- Order by user_id ascending.
`,
      },

      visibleTests: [
        {
          description: 'users with sessions >=30 days after signup appear; others do not',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-01-05'),
(2, '2024-01-10'),
(3, '2024-01-15'),
(4, '2024-01-20'),
(5, '2024-02-01');
INSERT INTO sessions VALUES
(1,  1, '2024-01-20'),
(2,  1, '2024-02-10'),
(3,  2, '2024-02-05'),
(4,  3, '2024-02-14'),
(5,  3, '2024-02-20'),
(6,  5, '2024-03-05');`,
          expectedOutput: [
            { user_id: 1, signup_date: '2024-01-05', first_return_date: '2024-02-10' },
            { user_id: 3, signup_date: '2024-01-15', first_return_date: '2024-02-14' },
          ],
        },
        {
          description: 'all January users retained: all appear',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-01-01'),
(2, '2024-01-02');
INSERT INTO sessions VALUES
(1, 1, '2024-02-01'),
(2, 2, '2024-02-05');`,
          expectedOutput: [
            { user_id: 1, signup_date: '2024-01-01', first_return_date: '2024-02-01' },
            { user_id: 2, signup_date: '2024-01-02', first_return_date: '2024-02-05' },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'first_return_date is the earliest qualifying session, not the latest',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-01-01');
INSERT INTO sessions VALUES
(1, 1, '2024-02-15'),
(2, 1, '2024-03-01'),
(3, 1, '2024-03-20');`,
          expectedOutput: [
            { user_id: 1, signup_date: '2024-01-01', first_return_date: '2024-02-15' },
          ],
        },
        {
          description: 'session on exact day 30 qualifies (boundary inclusive)',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-01-15');
INSERT INTO sessions VALUES
(1, 1, '2024-02-14');`,
          expectedOutput: [
            { user_id: 1, signup_date: '2024-01-15', first_return_date: '2024-02-14' },
          ],
        },
        {
          description: 'session one day before day-30 threshold does not qualify',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-01-15');
INSERT INTO sessions VALUES
(1, 1, '2024-02-13');`,
          expectedOutput: [],
        },
        {
          description: 'February signups are excluded even if they have qualifying sessions',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-02-01');
INSERT INTO sessions VALUES
(1, 1, '2024-03-10');`,
          expectedOutput: [],
        },
        {
          description: 'no retained users returns empty result',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-01-10'),
(2, '2024-01-20');
INSERT INTO sessions VALUES
(1, 1, '2024-01-25'),
(2, 2, '2024-02-05');`,
          expectedOutput: [],
        },
      ],

      answer: {
        fixedCode: `SELECT u.id           AS user_id,
       u.created_at    AS signup_date,
       MIN(s.created_at) AS first_return_date
FROM users u
JOIN sessions s ON s.user_id = u.id
WHERE strftime('%Y-%m', u.created_at) = '2024-01'
  AND s.created_at >= date(u.created_at, '+30 days')
GROUP BY u.id, u.created_at
ORDER BY u.id;`,
        explanation:
          "date(u.created_at, '+30 days') adds 30 days to a user's signup date using SQLite's date modifier syntax. Filtering WHERE s.created_at >= that threshold keeps only sessions on or after Day 30. The JOIN filters out users with no sessions at all (use LEFT JOIN + IS NOT NULL if you'd rather be explicit). GROUP BY u.id lets MIN(s.created_at) select the earliest qualifying session per user. The cohort filter strftime('%Y-%m', u.created_at) = '2024-01' extracts the year-month string and compares it as text. This works because ISO date strings compare lexicographically in date order. Day-30 retention is typically computed in bulk across many cohorts using a similar pattern but with a self-join or window function to parameterize the threshold.",
      },
    },

    // ── Part 2: Monthly Cohort Retention Rate ─────────────────────────────────
    {
      id: 'part-2',
      title: 'Monthly Cohort Retention Rate',
      readme: `# User Retention & Cohort Analysis, Part 2: Monthly Cohort Retention Rate

## Background

Part 1 is complete. For each signup cohort month, the query should count how many users had at least one session in the immediately following calendar month and compute the retention rate.

## Bug Report

The query is an unimplemented stub and currently returns no results.

## What to Implement

- **\`query.sql\`**: return \`cohort_month\` (YYYY-MM), \`cohort_size\`, \`returned_next_month\`, and \`retention_rate\` (rounded to 2 decimal places), ordered by \`cohort_month\` ascending.

## Notes

- Cohorts with zero returners must still appear with \`returned_next_month = 0\` and \`retention_rate = 0.0\`.
- \`retention_rate\` is a decimal; integer division will silently return \`0\`.`,

      starterFiles: {
        'query.sql': `-- Write your query here.
-- Step 1: CTE to compute each user's cohort_month and next_month.
-- Step 2: CTE to find distinct users who had a session in their next_month.
-- Step 3: LEFT JOIN cohorts to returners, GROUP BY cohort_month, compute rate.
-- Return: cohort_month, cohort_size, returned_next_month, retention_rate
-- Order by cohort_month ascending.
`,
      },

      visibleTests: [
        {
          description: 'two cohorts with 50% retention each',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-01-05'),
(2, '2024-01-10'),
(3, '2024-01-15'),
(4, '2024-01-20'),
(5, '2024-02-03'),
(6, '2024-02-08');
INSERT INTO sessions VALUES
(1, 1, '2024-02-10'),
(2, 2, '2024-01-25'),
(3, 3, '2024-02-20'),
(4, 5, '2024-03-05'),
(5, 6, '2024-02-15');`,
          expectedOutput: [
            { cohort_month: '2024-01', cohort_size: 4, returned_next_month: 2, retention_rate: 0.5 },
            { cohort_month: '2024-02', cohort_size: 2, returned_next_month: 1, retention_rate: 0.5 },
          ],
        },
        {
          description: 'cohort with zero returners still appears with retention_rate 0',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-03-01'),
(2, '2024-03-15');
INSERT INTO sessions VALUES
(1, 1, '2024-03-20'),
(2, 2, '2024-03-25');`,
          expectedOutput: [
            { cohort_month: '2024-03', cohort_size: 2, returned_next_month: 0, retention_rate: 0.0 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'user with multiple sessions in next month counts as returned once',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-05-10'),
(2, '2024-05-20');
INSERT INTO sessions VALUES
(1, 1, '2024-06-01'),
(2, 1, '2024-06-10'),
(3, 1, '2024-06-20');`,
          expectedOutput: [
            { cohort_month: '2024-05', cohort_size: 2, returned_next_month: 1, retention_rate: 0.5 },
          ],
        },
        {
          description: 'session in same month as signup does not count as next-month return',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-07-01'),
(2, '2024-07-15');
INSERT INTO sessions VALUES
(1, 1, '2024-07-20'),
(2, 2, '2024-08-05');`,
          expectedOutput: [
            { cohort_month: '2024-07', cohort_size: 2, returned_next_month: 1, retention_rate: 0.5 },
          ],
        },
        {
          description: 'full 100% retention: all cohort users returned',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-09-01'),
(2, '2024-09-15'),
(3, '2024-09-28');
INSERT INTO sessions VALUES
(1, 1, '2024-10-05'),
(2, 2, '2024-10-10'),
(3, 3, '2024-10-15');`,
          expectedOutput: [
            { cohort_month: '2024-09', cohort_size: 3, returned_next_month: 3, retention_rate: 1.0 },
          ],
        },
        {
          description: 'session two months later does not count as next-month return',
          seedSQL: `INSERT INTO users VALUES
(1, '2024-11-01');
INSERT INTO sessions VALUES
(1, 1, '2025-01-10');`,
          expectedOutput: [
            { cohort_month: '2024-11', cohort_size: 1, returned_next_month: 0, retention_rate: 0.0 },
          ],
        },
      ],

      answer: {
        fixedCode: `WITH user_cohorts AS (
  SELECT id AS user_id,
         strftime('%Y-%m', created_at) AS cohort_month,
         strftime('%Y-%m', date(created_at, 'start of month', '+1 month')) AS next_month
  FROM users
),
returners AS (
  SELECT DISTINCT s.user_id
  FROM sessions s
  JOIN user_cohorts uc ON uc.user_id = s.user_id
  WHERE strftime('%Y-%m', s.created_at) = uc.next_month
)
SELECT
  uc.cohort_month,
  COUNT(uc.user_id)                                                    AS cohort_size,
  COUNT(r.user_id)                                                     AS returned_next_month,
  ROUND(CAST(COUNT(r.user_id) AS REAL) / COUNT(uc.user_id), 2)        AS retention_rate
FROM user_cohorts uc
LEFT JOIN returners r ON r.user_id = uc.user_id
GROUP BY uc.cohort_month
ORDER BY uc.cohort_month;`,
        explanation:
          "date(created_at, 'start of month', '+1 month') applies two modifiers in sequence: 'start of month' snaps the date to the first of the current month, then '+1 month' advances it by one month. Applying strftime('%Y-%m', ...) to the result gives the next calendar month as a YYYY-MM string regardless of which day within the month the user signed up. The first CTE computes cohort_month and next_month for every user. The second CTE finds distinct user IDs who had a session in their specific next_month. DISTINCT here prevents a user with five sessions in February from being counted five times. The LEFT JOIN preserves cohorts with no returners (their r.user_id is NULL, and COUNT(r.user_id) ignores NULLs, returning 0). CAST before division avoids the integer-division trap covered in Funnel Analysis Part 2.",
      },
    },
  ],
};

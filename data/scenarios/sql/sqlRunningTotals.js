export const sqlRunningTotals = {
  id: 'sql-running-totals',
  title: 'Running Totals & Rolling Averages',
  difficulty: 'Medium',
  description:
    'Fix broken window-function queries: a missing ORDER BY that collapses all rows to the grand total, and an off-by-one frame that silently averages one day too many.',
  tags: ['sql', 'window-functions', 'running-total', 'rolling-average', 'rows-between'],
  durationMinutes: 30,
  testRunner: {
    language: 'sql',
    entryFile: 'query.sql',
    schema: `CREATE TABLE daily_signups (
  date    TEXT    PRIMARY KEY,
  signups INTEGER NOT NULL
);`,
  },

  parts: [
    // ── Part 1: SUM OVER (), missing ORDER BY ────────────────────────────────
    {
      id: 'part-1',
      title: 'Cumulative Signup Count',
      readme: `# Running Totals & Rolling Averages, Part 1: Cumulative Signup Count

## Background

The \`daily_signups\` table has \`date\` and \`signups\`. The query should return a running total: for each day, the cumulative sum of signups from the earliest row through that day.

## Bug Report

Every row has the same \`running_total\`: the grand total across all dates.

## What to Implement

- **\`query.sql\`**: fix the window function so \`running_total\` accumulates row by row. Return \`date\`, \`signups\`, and \`running_total\`, ordered by \`date\` ascending.`,

      starterFiles: {
        'query.sql': `SELECT date,
       signups,
       SUM(signups) OVER () AS running_total
FROM daily_signups
ORDER BY date;
-- Bug: OVER () with no ORDER BY computes the grand total for every row
-- instead of a row-by-row running sum
`,
      },

      visibleTests: [
        {
          description: 'running_total grows row by row, not identical for all rows',
          seedSQL: `INSERT INTO daily_signups VALUES
('2024-01-01', 10),
('2024-01-02', 25),
('2024-01-03', 15),
('2024-01-04', 30);`,
          expectedOutput: [
            { date: '2024-01-01', signups: 10, running_total: 10 },
            { date: '2024-01-02', signups: 25, running_total: 35 },
            { date: '2024-01-03', signups: 15, running_total: 50 },
            { date: '2024-01-04', signups: 30, running_total: 80 },
          ],
        },
        {
          description: 'two rows: first row total equals its own signups',
          seedSQL: `INSERT INTO daily_signups VALUES
('2024-06-01', 100),
('2024-06-02', 200);`,
          expectedOutput: [
            { date: '2024-06-01', signups: 100, running_total: 100 },
            { date: '2024-06-02', signups: 200, running_total: 300 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'single-row table: running_total equals signups',
          seedSQL: `INSERT INTO daily_signups VALUES
('2024-03-15', 42);`,
          expectedOutput: [
            { date: '2024-03-15', signups: 42, running_total: 42 },
          ],
        },
        {
          description: 'six days: total accumulates correctly',
          seedSQL: `INSERT INTO daily_signups VALUES
('2024-07-01', 5),
('2024-07-02', 5),
('2024-07-03', 5),
('2024-07-04', 5),
('2024-07-05', 5),
('2024-07-06', 5);`,
          expectedOutput: [
            { date: '2024-07-01', signups:  5, running_total:  5 },
            { date: '2024-07-02', signups:  5, running_total: 10 },
            { date: '2024-07-03', signups:  5, running_total: 15 },
            { date: '2024-07-04', signups:  5, running_total: 20 },
            { date: '2024-07-05', signups:  5, running_total: 25 },
            { date: '2024-07-06', signups:  5, running_total: 30 },
          ],
        },
        {
          description: 'non-sequential date gaps do not affect the running total logic',
          seedSQL: `INSERT INTO daily_signups VALUES
('2024-01-01', 50),
('2024-01-15', 30),
('2024-02-01', 20);`,
          expectedOutput: [
            { date: '2024-01-01', signups: 50, running_total:  50 },
            { date: '2024-01-15', signups: 30, running_total:  80 },
            { date: '2024-02-01', signups: 20, running_total: 100 },
          ],
        },
      ],

      answer: {
        fixedCode: `SELECT date,
       signups,
       SUM(signups) OVER (ORDER BY date) AS running_total
FROM daily_signups
ORDER BY date;`,
        explanation:
          "SUM(signups) OVER () defines a window that spans the entire result set with no ordering: the engine sums all rows and assigns that grand total to every row. Adding ORDER BY date inside the OVER clause changes the window's default frame to 'UNBOUNDED PRECEDING to CURRENT ROW', meaning each row sees the sum of all rows from the first up to itself. This is the canonical running total pattern. The outer ORDER BY date controls the final display order; the ORDER BY inside OVER controls which rows are 'before' the current row in the window. These two ORDER BYs serve different purposes and are both needed.",
      },
    },

    // ── Part 2: Off-by-one in rolling average frame ───────────────────────────
    {
      id: 'part-2',
      title: '7-Day Rolling Average',
      readme: `# Running Totals & Rolling Averages, Part 2: 7-Day Rolling Average

## Background

Part 1 is complete. The query should compute a 7-day rolling average: for each day, the average of that day and the 6 preceding days.

## Bug Report

The rolling average includes 8 days of data instead of 7 once enough history exists.

## What to Implement

- **\`query.sql\`**: fix the window frame so it covers exactly 7 days. Return \`date\`, \`signups\`, and \`rolling_avg_7d\` (rounded to 2 decimal places), ordered by \`date\` ascending.

## Notes

- \`ROWS BETWEEN N PRECEDING AND CURRENT ROW\` spans N+1 rows total (N preceding plus the current row).`,

      starterFiles: {
        'query.sql': `SELECT date,
       signups,
       ROUND(AVG(CAST(signups AS REAL)) OVER (
         ORDER BY date
         ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
       ), 2) AS rolling_avg_7d
FROM daily_signups
ORDER BY date;
-- Bug: ROWS BETWEEN 7 PRECEDING AND CURRENT ROW = 8 rows (7 before + current)
-- A 7-day window needs 6 PRECEDING rows plus the current row
`,
      },

      visibleTests: [
        {
          description: 'day 8 rolling avg uses exactly 7 days (not 8)',
          seedSQL: `INSERT INTO daily_signups VALUES
('2024-01-01', 0),
('2024-01-02', 0),
('2024-01-03', 0),
('2024-01-04', 0),
('2024-01-05', 0),
('2024-01-06', 0),
('2024-01-07', 0),
('2024-01-08', 70);`,
          expectedOutput: [
            { date: '2024-01-01', signups:  0, rolling_avg_7d:  0.0 },
            { date: '2024-01-02', signups:  0, rolling_avg_7d:  0.0 },
            { date: '2024-01-03', signups:  0, rolling_avg_7d:  0.0 },
            { date: '2024-01-04', signups:  0, rolling_avg_7d:  0.0 },
            { date: '2024-01-05', signups:  0, rolling_avg_7d:  0.0 },
            { date: '2024-01-06', signups:  0, rolling_avg_7d:  0.0 },
            { date: '2024-01-07', signups:  0, rolling_avg_7d:  0.0 },
            { date: '2024-01-08', signups: 70, rolling_avg_7d: 10.0 },
          ],
        },
        {
          description: 'steady signups: rolling avg equals daily value once window fills',
          seedSQL: `INSERT INTO daily_signups VALUES
('2024-02-01', 14),
('2024-02-02', 14),
('2024-02-03', 14),
('2024-02-04', 14),
('2024-02-05', 14),
('2024-02-06', 14),
('2024-02-07', 14),
('2024-02-08', 14);`,
          expectedOutput: [
            { date: '2024-02-01', signups: 14, rolling_avg_7d: 14.0 },
            { date: '2024-02-02', signups: 14, rolling_avg_7d: 14.0 },
            { date: '2024-02-03', signups: 14, rolling_avg_7d: 14.0 },
            { date: '2024-02-04', signups: 14, rolling_avg_7d: 14.0 },
            { date: '2024-02-05', signups: 14, rolling_avg_7d: 14.0 },
            { date: '2024-02-06', signups: 14, rolling_avg_7d: 14.0 },
            { date: '2024-02-07', signups: 14, rolling_avg_7d: 14.0 },
            { date: '2024-02-08', signups: 14, rolling_avg_7d: 14.0 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'spike on day 1 is excluded from day 8 rolling avg',
          seedSQL: `INSERT INTO daily_signups VALUES
('2024-03-01', 560),
('2024-03-02', 0),
('2024-03-03', 0),
('2024-03-04', 0),
('2024-03-05', 0),
('2024-03-06', 0),
('2024-03-07', 0),
('2024-03-08', 0);`,
          expectedOutput: [
            { date: '2024-03-01', signups: 560, rolling_avg_7d: 80.0 },
            { date: '2024-03-02', signups:   0, rolling_avg_7d: 40.0 },
            { date: '2024-03-03', signups:   0, rolling_avg_7d: 26.67 },
            { date: '2024-03-04', signups:   0, rolling_avg_7d: 20.0 },
            { date: '2024-03-05', signups:   0, rolling_avg_7d: 16.0 },
            { date: '2024-03-06', signups:   0, rolling_avg_7d: 13.33 },
            { date: '2024-03-07', signups:   0, rolling_avg_7d: 11.43 },
            { date: '2024-03-08', signups:   0, rolling_avg_7d:  0.0  },
          ],
        },
        {
          description: 'three rows: window clips at table start (no error)',
          seedSQL: `INSERT INTO daily_signups VALUES
('2024-04-01', 10),
('2024-04-02', 20),
('2024-04-03', 30);`,
          expectedOutput: [
            { date: '2024-04-01', signups: 10, rolling_avg_7d: 10.0 },
            { date: '2024-04-02', signups: 20, rolling_avg_7d: 15.0 },
            { date: '2024-04-03', signups: 30, rolling_avg_7d: 20.0 },
          ],
        },
      ],

      answer: {
        fixedCode: `SELECT date,
       signups,
       ROUND(AVG(CAST(signups AS REAL)) OVER (
         ORDER BY date
         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
       ), 2) AS rolling_avg_7d
FROM daily_signups
ORDER BY date;`,
        explanation:
          "ROWS BETWEEN N PRECEDING AND CURRENT ROW includes N preceding rows plus the current row: N + 1 rows total. For a 7-day window you need 6 PRECEDING (6 + 1 = 7). Using 7 PRECEDING produces an 8-row window once enough history exists, silently over-smoothing the average. The bug is invisible in early rows (where fewer than N rows exist and the window clips at the table boundary), so it only surfaces once there are more than 7 rows of data. ROWS vs RANGE is also worth knowing: ROWS counts physical rows, while RANGE groups rows with identical ORDER BY values. ROWS is almost always what you want for time-series rolling calculations.",
      },
    },
  ],
};

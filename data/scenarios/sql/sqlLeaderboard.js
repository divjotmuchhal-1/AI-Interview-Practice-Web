export const sqlLeaderboard = {
  id: 'sql-leaderboard',
  title: 'Game Leaderboard',
  difficulty: 'Medium',
  description:
    'Fix broken window-function queries behind a per-category game leaderboard.',
  tags: ['sql', 'window-functions', 'rank', 'partition-by', 'row-number'],
  durationMinutes: 30,
  testRunner: {
    language: 'sql',
    entryFile: 'query.sql',
    schema: `CREATE TABLE scores (
  id        INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL,
  category  TEXT    NOT NULL,
  score     INTEGER NOT NULL
);`,
  },

  parts: [
    // ── Part 1: Wrong ORDER direction in RANK() ───────────────────────────────
    {
      id: 'part-1',
      title: 'Rank by Score',
      readme: `# Game Leaderboard, Part 1: Rank by Score

## Background

The \`scores\` table has \`player_id\`, \`category\`, and \`score\`. The query should rank each player within their category, with rank 1 going to the highest score. Tied scores receive the same rank, and the rank after a tie skips accordingly (1, 1, 3).

## Bug Report

Rank 1 is assigned to the lowest score in each category. The leaderboard is inverted.

## What to Implement

- **\`query.sql\`**: fix the query so rank 1 goes to the highest score in each category. Return \`player_id\`, \`category\`, \`score\`, and \`rnk\`, ordered by \`category\` then \`rnk\` ascending.`,

      starterFiles: {
        'query.sql': `SELECT player_id, category, score,
       RANK() OVER (PARTITION BY category ORDER BY score ASC) AS rnk
FROM scores
ORDER BY category, rnk;
`,
      },

      visibleTests: [
        {
          description: 'rank 1 is the highest score in each category',
          seedSQL: `INSERT INTO scores VALUES
(1, 1, 'puzzle',  850),
(2, 2, 'puzzle',  920),
(3, 3, 'puzzle',  780),
(4, 1, 'arcade', 1200),
(5, 2, 'arcade',  990),
(6, 3, 'arcade', 1350);`,
          expectedOutput: [
            { player_id: 3, category: 'arcade', score: 1350, rnk: 1 },
            { player_id: 1, category: 'arcade', score: 1200, rnk: 2 },
            { player_id: 2, category: 'arcade', score:  990, rnk: 3 },
            { player_id: 2, category: 'puzzle', score:  920, rnk: 1 },
            { player_id: 1, category: 'puzzle', score:  850, rnk: 2 },
            { player_id: 3, category: 'puzzle', score:  780, rnk: 3 },
          ],
        },
        {
          description: 'tied scores get the same rank',
          seedSQL: `INSERT INTO scores VALUES
(1, 1, 'action', 500),
(2, 2, 'action', 700),
(3, 3, 'action', 700),
(4, 4, 'action', 400);`,
          expectedOutput: [
            { player_id: 2, category: 'action', score: 700, rnk: 1 },
            { player_id: 3, category: 'action', score: 700, rnk: 1 },
            { player_id: 1, category: 'action', score: 500, rnk: 3 },
            { player_id: 4, category: 'action', score: 400, rnk: 4 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'single-player category is ranked 1',
          seedSQL: `INSERT INTO scores VALUES
(1, 10, 'solo', 9999),
(2, 11, 'coop',  500),
(3, 12, 'coop',  800);`,
          expectedOutput: [
            { player_id: 12, category: 'coop', score: 800, rnk: 1 },
            { player_id: 11, category: 'coop', score: 500, rnk: 2 },
            { player_id: 10, category: 'solo', score: 9999, rnk: 1 },
          ],
        },
        {
          description: 'ranks restart at 1 for each category',
          seedSQL: `INSERT INTO scores VALUES
(1, 1, 'alpha', 300),
(2, 2, 'alpha', 100),
(3, 3, 'beta',  200),
(4, 4, 'beta',  400);`,
          expectedOutput: [
            { player_id: 1, category: 'alpha', score: 300, rnk: 1 },
            { player_id: 2, category: 'alpha', score: 100, rnk: 2 },
            { player_id: 4, category: 'beta',  score: 400, rnk: 1 },
            { player_id: 3, category: 'beta',  score: 200, rnk: 2 },
          ],
        },
      ],

      answer: {
        fixedCode: `SELECT player_id, category, score,
       RANK() OVER (PARTITION BY category ORDER BY score DESC) AS rnk
FROM scores
ORDER BY category, rnk;`,
        explanation:
          "RANK() OVER (...) assigns 1 to the first row within each partition as ordered by the window's ORDER BY. With ORDER BY score ASC, rank 1 goes to the smallest value. Changing ASC to DESC makes the highest score rank first. The PARTITION BY category clause is already correct: it resets the rank counter for each category. This is one of the most reliable window function interview questions because the bug is subtle: the query runs without errors but silently produces inverted rankings.",
      },
    },

    // ── Part 2: Wrong PARTITION BY ────────────────────────────────────────────
    {
      id: 'part-2',
      title: 'Top Scorer Per Category',
      readme: `# Game Leaderboard, Part 2: Top Scorer Per Category

## Background

Part 1 is complete. The query should return one row per category: the player with the highest score in that category.

## Bug Report

The query returns one row for every player instead of one row per category.

## What to Implement

- **\`query.sql\`**: fix the query so it returns exactly one row per category: that category's highest-scoring player. Return \`category\`, \`player_id\`, and \`score\`, ordered by \`category\` ascending.`,

      starterFiles: {
        'query.sql': `SELECT category, player_id, score
FROM (
  SELECT category, player_id, score,
         ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY score DESC) AS rnk
  FROM scores
) sub
WHERE rnk = 1
ORDER BY category;
`,
      },

      visibleTests: [
        {
          description: 'returns exactly one row per category (the top scorer)',
          seedSQL: `INSERT INTO scores VALUES
(1, 1, 'puzzle',  850),
(2, 2, 'puzzle',  920),
(3, 3, 'puzzle',  780),
(4, 4, 'arcade', 1200),
(5, 5, 'arcade',  990),
(6, 6, 'arcade', 1350),
(7, 7, 'action', 2100),
(8, 8, 'action', 1800);`,
          expectedOutput: [
            { category: 'action', player_id: 7, score: 2100 },
            { category: 'arcade', player_id: 6, score: 1350 },
            { category: 'puzzle', player_id: 2, score:  920 },
          ],
        },
        {
          description: 'single-entry categories are returned',
          seedSQL: `INSERT INTO scores VALUES
(1, 1, 'solo',  500),
(2, 2, 'duo',   800),
(3, 3, 'duo',   600);`,
          expectedOutput: [
            { category: 'duo',  player_id: 2, score: 800 },
            { category: 'solo', player_id: 1, score: 500 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'player with scores in multiple categories: top per category is selected',
          seedSQL: `INSERT INTO scores VALUES
(1, 1, 'alpha', 400),
(2, 1, 'beta',  600),
(3, 2, 'alpha', 700),
(4, 2, 'beta',  300);`,
          expectedOutput: [
            { category: 'alpha', player_id: 2, score: 700 },
            { category: 'beta',  player_id: 1, score: 600 },
          ],
        },
        {
          description: 'ordering is strictly by category ascending',
          seedSQL: `INSERT INTO scores VALUES
(1, 1, 'zebra', 100),
(2, 2, 'apple', 200),
(3, 3, 'mango',  50);`,
          expectedOutput: [
            { category: 'apple', player_id: 2, score: 200 },
            { category: 'mango', player_id: 3, score:  50 },
            { category: 'zebra', player_id: 1, score: 100 },
          ],
        },
      ],

      answer: {
        fixedCode: `SELECT category, player_id, score
FROM (
  SELECT category, player_id, score,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY score DESC) AS rnk
  FROM scores
) sub
WHERE rnk = 1
ORDER BY category;`,
        explanation:
          "PARTITION BY player_id restarts ROW_NUMBER() for each player, so it picks each player's personal highest score: row 1 of their individual history. To find the top scorer per category, the partition must be on the grouping dimension you care about: PARTITION BY category. With that change, ROW_NUMBER() assigns 1 to the highest-scoring row within each category, and WHERE rnk = 1 correctly selects one winner per category. The PARTITION column determines 'per what' the window resets. Getting this wrong is one of the most common window function bugs in production analytics.",
      },
    },
  ],
};

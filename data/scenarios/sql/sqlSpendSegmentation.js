export const sqlSpendSegmentation = {
  id: 'sql-spend-segmentation',
  title: 'Customer Spend Segmentation',
  difficulty: 'Medium',
  description:
    'Fix broken segmentation queries: an inverted NTILE that labels top spenders as bottom-tier, and a RANK that creates gaps after ties instead of the consecutive ranks the product team expects.',
  tags: ['sql', 'ntile', 'dense-rank', 'rank', 'window-functions', 'cte'],
  durationMinutes: 30,
  testRunner: {
    language: 'sql',
    entryFile: 'query.sql',
    schema: `CREATE TABLE orders (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount  INTEGER NOT NULL
);`,
  },

  parts: [
    // ── Part 1: NTILE direction bug ────────────────────────────────────────────
    {
      id: 'part-1',
      title: 'Spend Quartile Assignment',
      readme: `# Customer Spend Segmentation, Part 1: Spend Quartile Assignment

## Background

The \`orders\` table has \`user_id\` and \`amount\`. Multiple orders per user should be summed. The query assigns each user to one of four spend quartiles, with quartile 1 = highest spenders and quartile 4 = lowest.

## Bug Report

Quartile 1 is assigned to the lowest spenders. The segmentation is completely inverted.

## What to Implement

- **\`query.sql\`**: fix the window ordering so quartile 1 contains the highest spenders. Return \`user_id\`, \`total_spend\`, and \`spend_quartile\`, ordered by \`total_spend\` descending.`,

      starterFiles: {
        'query.sql': `WITH user_totals AS (
  SELECT user_id,
         SUM(amount) AS total_spend
  FROM orders
  GROUP BY user_id
)
SELECT user_id,
       total_spend,
       NTILE(4) OVER (ORDER BY total_spend ASC) AS spend_quartile
FROM user_totals
ORDER BY total_spend DESC;
-- Bug: ORDER BY ASC assigns quartile 1 to the lowest spenders
-- Flip to DESC so quartile 1 = highest total_spend
`,
      },

      visibleTests: [
        {
          description: 'quartile 1 contains highest spenders, quartile 4 the lowest',
          seedSQL: `INSERT INTO orders VALUES
(1,  1, 1200),
(2,  2, 1100),
(3,  3, 1000),
(4,  4,  800),
(5,  5,  700),
(6,  6,  600),
(7,  7,  400),
(8,  8,  300),
(9,  9,  200),
(10, 10,  90),
(11, 11,  50),
(12, 12,  10);`,
          expectedOutput: [
            { user_id:  1, total_spend: 1200, spend_quartile: 1 },
            { user_id:  2, total_spend: 1100, spend_quartile: 1 },
            { user_id:  3, total_spend: 1000, spend_quartile: 1 },
            { user_id:  4, total_spend:  800, spend_quartile: 2 },
            { user_id:  5, total_spend:  700, spend_quartile: 2 },
            { user_id:  6, total_spend:  600, spend_quartile: 2 },
            { user_id:  7, total_spend:  400, spend_quartile: 3 },
            { user_id:  8, total_spend:  300, spend_quartile: 3 },
            { user_id:  9, total_spend:  200, spend_quartile: 3 },
            { user_id: 10, total_spend:   90, spend_quartile: 4 },
            { user_id: 11, total_spend:   50, spend_quartile: 4 },
            { user_id: 12, total_spend:   10, spend_quartile: 4 },
          ],
        },
        {
          description: 'multiple orders per user are summed before quartile assignment',
          seedSQL: `INSERT INTO orders VALUES
(1,  1, 600),
(2,  1, 600),
(3,  2, 500),
(4,  2, 300),
(5,  3, 400),
(6,  3, 100),
(7,  4, 200),
(8,  4,  50);`,
          expectedOutput: [
            { user_id: 1, total_spend: 1200, spend_quartile: 1 },
            { user_id: 2, total_spend:  800, spend_quartile: 2 },
            { user_id: 3, total_spend:  500, spend_quartile: 3 },
            { user_id: 4, total_spend:  250, spend_quartile: 4 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'four users: each gets a distinct quartile',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 1000),
(2, 2,  500),
(3, 3,  200),
(4, 4,   50);`,
          expectedOutput: [
            { user_id: 1, total_spend: 1000, spend_quartile: 1 },
            { user_id: 2, total_spend:  500, spend_quartile: 2 },
            { user_id: 3, total_spend:  200, spend_quartile: 3 },
            { user_id: 4, total_spend:   50, spend_quartile: 4 },
          ],
        },
        {
          description: 'eight users split evenly across four quartiles (2 per quartile)',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 800),
(2, 2, 700),
(3, 3, 600),
(4, 4, 500),
(5, 5, 400),
(6, 6, 300),
(7, 7, 200),
(8, 8, 100);`,
          expectedOutput: [
            { user_id: 1, total_spend: 800, spend_quartile: 1 },
            { user_id: 2, total_spend: 700, spend_quartile: 1 },
            { user_id: 3, total_spend: 600, spend_quartile: 2 },
            { user_id: 4, total_spend: 500, spend_quartile: 2 },
            { user_id: 5, total_spend: 400, spend_quartile: 3 },
            { user_id: 6, total_spend: 300, spend_quartile: 3 },
            { user_id: 7, total_spend: 200, spend_quartile: 4 },
            { user_id: 8, total_spend: 100, spend_quartile: 4 },
          ],
        },
        {
          description: 'top spender has single order, still lands in quartile 1',
          seedSQL: `INSERT INTO orders VALUES
(1,  1, 9999),
(2,  2,  100),
(3,  3,   80),
(4,  4,   60),
(5,  5,   40),
(6,  6,   20),
(7,  7,   10),
(8,  8,    5),
(9,  9,    4),
(10, 10,   3),
(11, 11,   2),
(12, 12,   1);`,
          expectedOutput: [
            { user_id:  1, total_spend: 9999, spend_quartile: 1 },
            { user_id:  2, total_spend:  100, spend_quartile: 1 },
            { user_id:  3, total_spend:   80, spend_quartile: 1 },
            { user_id:  4, total_spend:   60, spend_quartile: 2 },
            { user_id:  5, total_spend:   40, spend_quartile: 2 },
            { user_id:  6, total_spend:   20, spend_quartile: 2 },
            { user_id:  7, total_spend:   10, spend_quartile: 3 },
            { user_id:  8, total_spend:    5, spend_quartile: 3 },
            { user_id:  9, total_spend:    4, spend_quartile: 3 },
            { user_id: 10, total_spend:    3, spend_quartile: 4 },
            { user_id: 11, total_spend:    2, spend_quartile: 4 },
            { user_id: 12, total_spend:    1, spend_quartile: 4 },
          ],
        },
      ],

      answer: {
        fixedCode: `WITH user_totals AS (
  SELECT user_id,
         SUM(amount) AS total_spend
  FROM orders
  GROUP BY user_id
)
SELECT user_id,
       total_spend,
       NTILE(4) OVER (ORDER BY total_spend DESC) AS spend_quartile
FROM user_totals
ORDER BY total_spend DESC;`,
        explanation:
          "NTILE(N) divides the ordered rows into N groups as evenly as possible, numbering from 1. With ORDER BY total_spend ASC, the first bucket (quartile 1) contains the rows with the smallest values, exactly backwards from the convention that 'top quartile' means best customers. Changing ASC to DESC makes NTILE assign 1 to the highest spenders. This inversion bug is easy to overlook in query output because the quartile numbers still look valid (1–4 with no gaps); only the business meaning is wrong. NTILE vs RANK vs DENSE_RANK are all window functions but serve different purposes: NTILE assigns bucket numbers, RANK assigns position numbers (with gaps after ties), and DENSE_RANK assigns consecutive position numbers (no gaps).",
      },
    },

    // ── Part 2: RANK gaps vs DENSE_RANK consecutive ───────────────────────────
    {
      id: 'part-2',
      title: 'Consecutive Spend Ranking',
      readme: `# Customer Spend Segmentation, Part 2: Consecutive Spend Ranking

## Background

Part 1 is complete. The query ranks users by total spend (highest = rank 1). Tied users must receive the same rank, and the next distinct rank must be the next consecutive integer with no gaps.

## Bug Report

When two users have identical total spend, the next rank skips a number: \`1, 2, 2, 4\` instead of \`1, 2, 2, 3\`.

## What to Implement

- **\`query.sql\`**: replace the ranking function with one that assigns consecutive ranks after ties. Return \`user_id\`, \`total_spend\`, and \`spend_rank\`, ordered by \`spend_rank\` then \`user_id\` ascending.`,

      starterFiles: {
        'query.sql': `WITH user_totals AS (
  SELECT user_id,
         SUM(amount) AS total_spend
  FROM orders
  GROUP BY user_id
)
SELECT user_id,
       total_spend,
       RANK() OVER (ORDER BY total_spend DESC) AS spend_rank
FROM user_totals
ORDER BY spend_rank, user_id;
-- Bug: RANK() skips numbers after ties. Two users at rank 2 make the next user rank 4
-- Replace RANK() with DENSE_RANK() for consecutive rank numbers
`,
      },

      visibleTests: [
        {
          description: 'tied users share a rank and the next rank has no gap',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 500),
(2, 2, 300),
(3, 3, 300),
(4, 4, 100);`,
          expectedOutput: [
            { user_id: 1, total_spend: 500, spend_rank: 1 },
            { user_id: 2, total_spend: 300, spend_rank: 2 },
            { user_id: 3, total_spend: 300, spend_rank: 2 },
            { user_id: 4, total_spend: 100, spend_rank: 3 },
          ],
        },
        {
          description: 'no ties: ranks are 1, 2, 3, same as RANK()',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 900),
(2, 2, 600),
(3, 3, 300);`,
          expectedOutput: [
            { user_id: 1, total_spend: 900, spend_rank: 1 },
            { user_id: 2, total_spend: 600, spend_rank: 2 },
            { user_id: 3, total_spend: 300, spend_rank: 3 },
          ],
        },
      ],

      hiddenTests: [
        {
          description: 'three-way tie at the top: all get rank 1, next gets rank 2',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 400),
(2, 2, 400),
(3, 3, 400),
(4, 4, 200);`,
          expectedOutput: [
            { user_id: 1, total_spend: 400, spend_rank: 1 },
            { user_id: 2, total_spend: 400, spend_rank: 1 },
            { user_id: 3, total_spend: 400, spend_rank: 1 },
            { user_id: 4, total_spend: 200, spend_rank: 2 },
          ],
        },
        {
          description: 'multiple tie groups: 1, 2, 2, 3, 3, 4',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 500),
(2, 2, 400),
(3, 3, 400),
(4, 4, 300),
(5, 5, 300),
(6, 6, 100);`,
          expectedOutput: [
            { user_id: 1, total_spend: 500, spend_rank: 1 },
            { user_id: 2, total_spend: 400, spend_rank: 2 },
            { user_id: 3, total_spend: 400, spend_rank: 2 },
            { user_id: 4, total_spend: 300, spend_rank: 3 },
            { user_id: 5, total_spend: 300, spend_rank: 3 },
            { user_id: 6, total_spend: 100, spend_rank: 4 },
          ],
        },
        {
          description: 'multiple orders per user summed before ranking',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 300),
(2, 1, 200),
(3, 2, 400),
(4, 3, 100),
(5, 3, 400);`,
          expectedOutput: [
            { user_id: 1, total_spend: 500, spend_rank: 1 },
            { user_id: 3, total_spend: 500, spend_rank: 1 },
            { user_id: 2, total_spend: 400, spend_rank: 2 },
          ],
        },
        {
          description: 'single user: rank is 1',
          seedSQL: `INSERT INTO orders VALUES
(1, 1, 999);`,
          expectedOutput: [
            { user_id: 1, total_spend: 999, spend_rank: 1 },
          ],
        },
      ],

      answer: {
        fixedCode: `WITH user_totals AS (
  SELECT user_id,
         SUM(amount) AS total_spend
  FROM orders
  GROUP BY user_id
)
SELECT user_id,
       total_spend,
       DENSE_RANK() OVER (ORDER BY total_spend DESC) AS spend_rank
FROM user_totals
ORDER BY spend_rank, user_id;`,
        explanation:
          "RANK() and DENSE_RANK() both assign the same number to tied rows, but they differ in what comes next. RANK() skips as many positions as there were ties: two rows at rank 2 means the next row is rank 4 (ranks 1, 2, 2, 4). DENSE_RANK() always uses the next consecutive integer regardless of how many rows shared the previous rank (ranks 1, 2, 2, 3). Use RANK() when the position gap is meaningful, e.g., 'second place out of ten' where two silver medalists mean there's no bronze. Use DENSE_RANK() when you're labeling tiers and a gap would corrupt downstream logic, as here, where a report counting distinct tiers would see tier 3 as missing. ROW_NUMBER() is a third option: it always assigns a unique integer with no ties at all, which is useful when you need exactly one winner per partition.",
      },
    },
  ],
};

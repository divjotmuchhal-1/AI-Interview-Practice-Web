const README = `# Code Review: Feed Endpoint Enrichment

## Background

A teammate added author info and engagement counts to the social feed endpoint. The PR passes CI and all tests are green. The team asked you to review before merge because this endpoint is on the hot path (~50k RPM peak).

## Your Task

Review the diff and write your findings in \`findings.md\`. For each issue, note:
- **What** is wrong (the specific line or pattern)
- **Why** it matters (the impact or exploitability)
- **Severity**: Critical / High / Medium / Low

There are at least 3 issues to find. Think about performance, correctness, and scalability.
`;

const DIFF = `diff --git a/src/routes/feed.js b/src/routes/feed.js
index 5c3a781..d2f9b4e 100644
--- a/src/routes/feed.js
+++ b/src/routes/feed.js
@@ -1,10 +1,32 @@
 const router = require('express').Router();

 router.get('/feed', authenticate, async (req, res) => {
-  const posts = await db.posts.findMany({
-    where: { authorId: { in: req.user.following } },
-    take: 20,
-  });
-  res.json({ posts });
+  const posts = await db.posts.findMany({
+    where: { authorId: { in: req.user.following } },
+    orderBy: { createdAt: 'desc' },
+    take: 20,
+  });
+
+  // Enrich each post with author info and engagement counts
+  const enriched = [];
+  for (const post of posts) {
+    const author = await db.users.findUnique({
+      where: { id: post.authorId },
+      select: { id: true, name: true, avatarUrl: true },
+    });
+    const likeCount = await db.likes.count({
+      where: { postId: post.id },
+    });
+    const commentCount = await db.comments.count({
+      where: { postId: post.id },
+    });
+    enriched.push({ ...post, author, likeCount, commentCount });
+  }
+
+  res.json({ posts: enriched });
 });

 module.exports = router;`;

const STARTER = `## Performance Issues

<!-- Scalability or efficiency problems? -->

## Correctness Issues

<!-- What logic is wrong or could break? -->

## Missing Functionality / Edge Cases

<!-- What should be here but isn't? -->
`;

const ANSWER = `**Critical Performance: N+1 query problem**
For each of the 20 posts, the code issues 3 separate DB queries: one for the author, one for like count, one for comment count. Total: 1 (posts) + 20 + 20 + 20 = 61 queries per request. At 50k RPM this is ~3M queries/min from one endpoint alone. Fix: use Prisma's \`include\` with \`_count\` to fetch everything in 1–2 queries.

**Correctness: \`req.user.following\` may be empty or null**
If the user follows nobody, \`following\` is \`[]\`. Many ORMs treat \`{ in: [] }\` differently: Prisma returns zero rows (correct), but raw SQL and other ORMs may return all rows or throw. If \`following\` is \`null\` or \`undefined\` the query throws. Neither case is guarded.

**Performance: Sequential awaits in a loop**
Even if N+1 were acceptable, the queries run serially: each \`await\` blocks the next. Using \`Promise.all\` for the two count queries per post would at least halve the wait. Better: fetch all at once outside the loop with a \`groupBy\` aggregate.

**Missing: No cursor-based pagination**
\`take: 20\` hardcodes page size with no cursor or offset. There is no way to fetch page 2. A busy feed will always return the same 20 newest posts.`;

export const codeReviewNPlus1 = {
  id:              'code-review-n-plus-1',
  type:            'code-review',
  title:           'Feed Endpoint Review',
  difficulty:      'Medium',
  durationMinutes: 20,
  tags:            ['performance', 'database', 'n+1', 'node.js', 'code-review'],
  description:     'A PR enriches a social feed endpoint with author info and like counts. It looks correct on the surface. Find the performance and correctness issues before it hits production.',
  parts: [
    {
      id: 'part-1', number: 1, title: 'Find the Issues',
      readme:       README,
      diff:         DIFF,
      starterFiles: { 'findings.md': STARTER },
      visibleTests: [],
      hiddenTests:  [],
      answer:       ANSWER,
    },
  ],
};

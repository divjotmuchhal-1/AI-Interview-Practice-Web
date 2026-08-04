const README = `# Code Review: Auth Middleware Refactor

## Background

A teammate opened this PR to improve the performance of the JWT authentication middleware. The PR description claims \`jwt.verify\` is slow and switches to a faster approach.

## Your Task

Review the diff and write your findings in \`findings.md\`. For each issue, note:
- **What** is wrong (the specific line or pattern)
- **Why** it matters (the impact or exploitability)
- **Severity**: Critical / High / Medium / Low

There are at least 3 issues to find. Think about security, correctness, and code quality.
`;

const DIFF = `diff --git a/src/middleware/auth.js b/src/middleware/auth.js
index 3a7f2c1..8b14e9d 100644
--- a/src/middleware/auth.js
+++ b/src/middleware/auth.js
@@ -1,6 +1,7 @@
 const jwt = require('jsonwebtoken');
+const { promisify } = require('util');

-function authenticate(req, res, next) {
+async function authenticate(req, res, next) {
   const header = req.headers.authorization;
-  if (!header || !header.startsWith('Bearer ')) {
+  if (!header) {
     return res.status(401).json({ error: 'Unauthorized' });
   }

@@ -8,12 +9,12 @@ function authenticate(req, res, next) {
   const token = header.split(' ')[1];

-  try {
-    const decoded = jwt.verify(token, process.env.JWT_SECRET);
-    req.user = decoded;
-    next();
-  } catch (err) {
-    return res.status(401).json({ error: 'Invalid token' });
-  }
+  // Decode without blocking: jwt.verify is synchronous and slow
+  const decoded = jwt.decode(token);
+  if (!decoded || !decoded.sub) {
+    return res.status(401).json({ error: 'Invalid token' });
+  }
+  req.user = decoded;
+  next();
 }

 module.exports = { authenticate };`;

const STARTER = `## Correctness Issues

<!-- What logic is wrong or broken? -->

## Security Issues

<!-- Any vulnerabilities? What can an attacker do? -->

## Performance / Code Quality

<!-- Misleading comments, dead code, unnecessary changes? -->
`;

const ANSWER = `**Critical Security: \`jwt.decode\` skips signature verification**
The switch from \`jwt.verify\` to \`jwt.decode\` is the core bug. \`jwt.decode\` only base64-decodes the payload. It does NOT check the HMAC signature. Any attacker can forge a token with arbitrary \`sub\`, \`userId\`, or role claims and pass authentication. The "performance" justification is false: \`jwt.verify\` is synchronous and completes in microseconds.

**Correctness: Removed \`'Bearer '\` prefix check**
The original code checks \`header.startsWith('Bearer ')\`. The new code only checks \`if (!header)\`. A request with a bare token (no \`Bearer \` prefix) now reaches \`header.split(' ')[1]\`, which returns \`undefined\`. \`jwt.decode(undefined)\` returns \`null\`, so it still 401s, but the guard is now implicit and fragile. Any upstream middleware that sets the Authorization header differently could bypass it.

**Code Quality: Unused \`promisify\` import**
\`const { promisify } = require('util')\` is added but never used. The function is also marked \`async\` with no awaits, which adds a microtask and wraps the return value in a Promise unnecessarily.`;

export const codeReviewAuth = {
  id:              'code-review-auth',
  type:            'code-review',
  title:           'Auth Middleware Review',
  difficulty:      'Medium',
  durationMinutes: 20,
  tags:            ['security', 'jwt', 'node.js', 'auth', 'code-review'],
  description:     'A PR "optimises" JWT authentication by switching from jwt.verify to jwt.decode. Review the diff and identify every correctness, security, and code-quality issue.',
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

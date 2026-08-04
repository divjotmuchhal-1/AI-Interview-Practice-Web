const README = `# Code Review: In-Memory Rate Limiter

## Background

A teammate implemented a new rate-limiting middleware to protect public API endpoints. It uses an in-memory store, so it is fast and has no external dependency. The PR is tagged as "security hardening."

## Your Task

Review the diff and write your findings in \`findings.md\`. For each issue, note:
- **What** is wrong (the specific line or pattern)
- **Why** it matters (the impact or exploitability)
- **Severity**: Critical / High / Medium / Low

There are at least 4 issues. Think about correctness, security, and operational concerns (what happens in production over time).
`;

const DIFF = `diff --git a/src/middleware/rateLimit.js b/src/middleware/rateLimit.js
new file mode 100644
index 0000000..a3f58c0
--- /dev/null
+++ b/src/middleware/rateLimit.js
@@ -0,0 +1,42 @@
+const store = new Map(); // key -> { count, resetAt }
+
+function rateLimit(key, maxRequests, windowMs) {
+  const now = Date.now();
+  const entry = store.get(key);
+
+  if (!entry || now > entry.resetAt) {
+    store.set(key, { count: 1, resetAt: now + windowMs });
+    return { allowed: true, remaining: maxRequests - 1 };
+  }
+
+  if (entry.count >= maxRequests) {
+    return { allowed: false, remaining: 0 };
+  }
+
+  entry.count++;
+  return { allowed: true, remaining: maxRequests - entry.count };
+}
+
+function rateLimitMiddleware(maxRequests = 100, windowMs = 60_000) {
+  return (req, res, next) => {
+    const key = req.ip;
+    const result = rateLimit(key, maxRequests, windowMs);
+
+    res.setHeader('X-RateLimit-Limit', maxRequests);
+    res.setHeader('X-RateLimit-Remaining', result.remaining);
+
+    if (!result.allowed) {
+      return res.status(429).json({
+        error: 'Rate limit exceeded',
+      });
+    }
+
+    next();
+  };
+}
+
+module.exports = { rateLimit, rateLimitMiddleware };`;

const STARTER = `## Correctness Issues

<!-- What logic is wrong or broken? -->

## Security Issues

<!-- Can this be bypassed or abused? -->

## Operational / Production Concerns

<!-- What breaks over time or under load? -->

## Missing Functionality

<!-- What should be here but isn't? -->
`;

const ANSWER = `**High: Memory leak: expired entries are never evicted**
The \`store\` Map grows forever. An expired entry (where \`now > entry.resetAt\`) is only cleaned up if the same key makes a new request. Unique IPs that never return stay in memory indefinitely. Under a DDoS or high-cardinality traffic (rotating IPs, user-IDs) the process will eventually OOM. Fix: run a periodic \`setInterval\` to delete stale entries, or use a TTL-aware store like \`node-cache\`.

**Medium Correctness: Off-by-one in \`remaining\` count**
After \`entry.count++\`, the code returns \`maxRequests - entry.count\`. If \`maxRequests = 5\` and this is the 4th request, remaining = \`5 - 4 = 1\`, correct. But on the 5th (last allowed) request, remaining = \`5 - 5 = 0\`. A \`remaining: 0\` with \`allowed: true\` is misleading to clients: they'll think they're blocked. The value should be computed before the increment, or use \`maxRequests - entry.count - 1\` before bumping.

**High Security: \`req.ip\` can be spoofed via \`X-Forwarded-For\`**
In most reverse-proxy setups (nginx, load balancers), \`req.ip\` reflects the \`X-Forwarded-For\` header, which clients can set to any value. An attacker can rotate spoofed IPs to bypass the rate limit entirely. Use a trusted IP extraction strategy: \`app.set('trust proxy', 1)\` only if behind exactly one proxy, or extract the real IP from a signed header.

**Low Missing: No \`X-RateLimit-Reset\` header**
RFC 6585 and common client expectations include a \`Retry-After\` or \`X-RateLimit-Reset\` header on 429 responses so clients know when to retry. Without it, well-behaved clients must guess or implement exponential backoff unnecessarily. The \`resetAt\` timestamp is already computed. It just isn't exposed.`;

export const codeReviewRateLimit = {
  id:              'code-review-rate-limit',
  type:            'code-review',
  title:           'Rate Limiter Review',
  difficulty:      'Hard',
  durationMinutes: 25,
  tags:            ['security', 'correctness', 'memory', 'node.js', 'code-review'],
  description:     'A new in-memory rate limiter is tagged as "security hardening." Review the implementation for correctness, security bypass vectors, and production concerns.',
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

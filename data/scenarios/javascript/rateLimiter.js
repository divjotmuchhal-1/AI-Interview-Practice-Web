// ─── API Rate Limiter ─────────────────────────────────────────────────────────
// Inspired by: Cloudflare / Stripe API gateway interviews
// Three parts: fixed window → sliding window → per-route limits with wildcards

// ── Starter files ─────────────────────────────────────────────────────────────

const STARTER_P1 = {
  'src/RateLimiter.js': `/**
 * Fixed-window rate limiter.
 *
 * Windows are epoch-aligned: window index = Math.floor(timestamp / windowSeconds).
 * All timestamps within the same window index share the same quota.
 *
 * IMPORTANT: windows reset at the epoch boundary, NOT relative to the first
 * request in the window. If windowSeconds=60 and the first request is at t=45,
 * the window still resets at t=60, not t=105.
 */
class RateLimiter {
  constructor(config) {
    // config: { maxRequests: number, windowSeconds: number }
    this.config = config;

    // Storage for per-user, per-window request counts.
    // Suggested shape: Map<userId, Map<windowIndex, count>>
    this.store = new Map();
  }

  /**
   * Process a single request.
   *
   * @param {{ id: string, userId: string, timestamp: number }} request
   * @returns {{ requestId: string, status: 'ALLOWED' | 'BLOCKED', remainingQuota: number }}
   */
  process(request) {
    // TODO: implement
  }
}

module.exports = { RateLimiter };
`,

  'src/types.js': `// Shared constants

const STATUS = {
  ALLOWED: 'ALLOWED',
  BLOCKED: 'BLOCKED',
};

module.exports = { STATUS };
`,

  'solution.js': `const { RateLimiter } = require('./src/RateLimiter');

/**
 * Process a list of requests against a rate limit config.
 * Requests are pre-sorted by timestamp (ascending).
 *
 * @param {Array<{ id: string, userId: string, timestamp: number }>} requests
 * @param {{ maxRequests: number, windowSeconds: number }} config
 * @returns {Array<{ requestId: string, status: string, remainingQuota: number }>}
 */
function processRequests(requests, config) {
  const limiter = new RateLimiter(config);
  return requests.map(req => limiter.process(req));
}

module.exports = { processRequests };
`,

  'tests.js': `const { processRequests } = require('./solution');

const assert = (condition, message) => {
  if (!condition) throw new Error(\`FAIL: \${message}\`);
  console.log(\`  PASS  \${message}\`);
};

console.log('\\n─── My Tests ───────────────────────────────────');

// Write your tests here.
// Pay close attention to: when exactly does the window reset?

const result = processRequests(
  [
    { id: 'r1', userId: 'alice', timestamp: 10 },
    { id: 'r2', userId: 'alice', timestamp: 30 },
    { id: 'r3', userId: 'alice', timestamp: 50 },
  ],
  { maxRequests: 2, windowSeconds: 60 }
);

assert(result[0].status === 'ALLOWED', 'first request allowed');
assert(result[1].status === 'ALLOWED', 'second request allowed');
assert(result[2].status === 'BLOCKED', 'third request blocked (over limit)');
assert(result[2].remainingQuota === 0, 'blocked request has remainingQuota 0');

console.log('\\n✓ All tests passed');
`,
};

// Part 2: fixed window reference impl provided, stubs for sliding window
const STARTER_P2 = {
  'src/RateLimiter.js': `/**
 * Sliding-window rate limiter.
 *
 * Part 2 switches from fixed windows to a sliding window:
 * for each request, count all prior requests from the same user
 * in the interval (timestamp - windowSeconds, timestamp].
 *
 * Unlike fixed windows, there are no "reset" moments. The window
 * moves continuously with each new request.
 */
class RateLimiter {
  constructor(config) {
    this.config = config;

    // You'll need to track raw timestamps per user, not just counts.
    // Suggested shape: Map<userId, number[]>  (sorted list of allowed timestamps)
    this.store = new Map();
  }

  /**
   * @param {{ id: string, userId: string, timestamp: number }} request
   * @returns {{ requestId: string, status: 'ALLOWED' | 'BLOCKED', remainingQuota: number }}
   */
  process(request) {
    // TODO: implement sliding window logic
    //
    // Algorithm:
    // 1. Retrieve the user's recent request timestamps
    // 2. Filter to only those in (timestamp - windowSeconds, timestamp]
    // 3. If count >= maxRequests → BLOCK (don't record this request)
    // 4. Otherwise → ALLOW and record the timestamp
  }
}

module.exports = { RateLimiter };
`,

  'src/types.js': `const STATUS = { ALLOWED: 'ALLOWED', BLOCKED: 'BLOCKED' };
module.exports = { STATUS };
`,

  'solution.js': `const { RateLimiter } = require('./src/RateLimiter');

function processRequests(requests, config) {
  const limiter = new RateLimiter(config);
  return requests.map(req => limiter.process(req));
}

module.exports = { processRequests };
`,

  'tests.js': `const { processRequests } = require('./solution');

const assert = (condition, message) => {
  if (!condition) throw new Error(\`FAIL: \${message}\`);
  console.log(\`  PASS  \${message}\`);
};

console.log('\\n─── My Tests (Part 2: Sliding Window) ──────────');

// Key difference from Part 1:
// At t=61, the sliding window includes t=[1,61], NOT just t=[60,120).
// So a request at t=10 "falls out" of the window at t=71, not at t=60.

console.log('\\n✓ All tests passed');
`,
};

// Part 3: sliding window reference, stubs for per-route
const STARTER_P3 = {
  'src/RateLimiter.js': `/**
 * Per-route rate limiter with wildcard pattern matching.
 *
 * Each request now includes a 'route' field (e.g. "GET /api/users").
 * Config specifies per-route limits; unmatched routes use defaultLimit.
 *
 * Route matching precedence (highest to lowest):
 *   1. Exact match         "POST /api/payments"
 *   2. Wildcard match      "GET /api/*"    (* matches anything)
 *   3. Default limit
 *
 * Wildcard rules: '*' matches any suffix after its position in the path.
 * Method must still match exactly.
 *
 * When multiple wildcard patterns could match, use the MOST SPECIFIC one
 * (the one with the longest non-wildcard prefix).
 */
class RateLimiter {
  constructor(config) {
    // config: {
    //   defaultLimit: { maxRequests, windowSeconds },
    //   routes: Array<{ pattern: string, maxRequests: number, windowSeconds: number }>
    // }
    this.config = config;
    this.store = new Map(); // userId:route → sliding window timestamps
  }

  /**
   * @param {{ id: string, userId: string, timestamp: number, route: string }} request
   * @returns {{ requestId: string, status: string, remainingQuota: number, matchedPattern: string }}
   */
  process(request) {
    // TODO: implement
    // 1. Find the best-matching route config (exact → wildcard → default)
    // 2. Apply sliding window using the matched config
    // 3. Include 'matchedPattern' in the response ("exact", the pattern string, or "default")
  }

  /** Returns the limit config for the given route string. */
  resolveLimit(route) {
    // TODO: implement matching logic
  }
}

module.exports = { RateLimiter };
`,

  'src/types.js': `const STATUS = { ALLOWED: 'ALLOWED', BLOCKED: 'BLOCKED' };
module.exports = { STATUS };
`,

  'solution.js': `const { RateLimiter } = require('./src/RateLimiter');

function processRequests(requests, config) {
  const limiter = new RateLimiter(config);
  return requests.map(req => limiter.process(req));
}

module.exports = { processRequests };
`,

  'tests.js': `const { processRequests } = require('./solution');

const assert = (condition, message) => {
  if (!condition) throw new Error(\`FAIL: \${message}\`);
  console.log(\`  PASS  \${message}\`);
};

console.log('\\n─── My Tests (Part 3: Per-Route Limits) ────────');

// Key things to test:
// 1. Exact route match overrides a matching wildcard
// 2. Wildcard route "GET /api/*" does NOT match "POST /api/users"
// 3. Two users on the same route have independent quotas
// 4. Wildcard specificity: "GET /api/v2/*" beats "GET /api/*"

console.log('\\n✓ All tests passed');
`,
};

// ── README strings ────────────────────────────────────────────────────────────

const README_P1 = `# API Rate Limiter, Part 1: Fixed Window

## Background

\`src/RateLimiter.js\` implements a fixed-window rate limiter. \`processRequests(requests, config)\` takes an array of requests sorted by timestamp and returns one result per request with a status of \`"ALLOWED"\` or \`"BLOCKED"\` and the remaining quota. A request at timestamp \`T\` belongs to window \`Math.floor(T / windowSeconds)\`; each user gets \`maxRequests\` per window, tracked independently per user.

## Bug Report

\`RateLimiter.process()\` is an unimplemented stub. All calls return \`undefined\`.

## What to Implement

- **\`process(request)\`** in \`src/RateLimiter.js\`: return \`{ requestId, status, remainingQuota }\` applying fixed-window rate limiting per user.

## Notes

- Windows are epoch-aligned, not relative to each user's first request. With \`windowSeconds=60\`, resets occur at \`t=60, 120, ...\` regardless of when the first request in that window arrived.
- \`remainingQuota\` is \`maxRequests - countInWindow\` for allowed requests and \`0\` for blocked.
- Multiple requests at the same timestamp are processed in array order.
`;

const README_P2 = `# API Rate Limiter, Part 2: Sliding Window

## Background

\`src/RateLimiter.js\` implements a sliding-window rate limiter. Part 1 is complete. For a request at time \`T\`, the relevant window is the interval \`(T - windowSeconds, T]\`; count all prior allowed requests from the same user within that interval. If the count is already \`maxRequests\` or more, block the request.

## Bug Report

\`RateLimiter.process()\` is an unimplemented stub. All calls return \`undefined\`.

## What to Implement

- **\`process(request)\`** in \`src/RateLimiter.js\`: return \`{ requestId, status, remainingQuota }\` applying sliding-window rate limiting per user.

## Notes

- Only allowed requests count toward the window; blocked requests are not recorded.
- The window is open on the left: a request at exactly \`T - windowSeconds\` is outside the window and does not count.
- \`remainingQuota\` is \`maxRequests - countInWindow\` for allowed requests and \`0\` for blocked.
`;

const README_P3 = `# API Rate Limiter, Part 3: Per-Route Limits

## Background

\`src/RateLimiter.js\` implements a per-route sliding-window rate limiter. Parts 1 and 2 are complete. Each request now includes a \`route\` field (e.g. \`"GET /api/orders"\`). Config specifies per-route limits via a \`routes\` array and a \`defaultLimit\` fallback. Route matching priority: exact match first, then most-specific wildcard (longest non-wildcard prefix), then default.

## Bug Report

Both \`process()\` and \`resolveLimit()\` are unimplemented stubs. All calls return \`undefined\`.

## What to Implement

- **\`resolveLimit(route)\`** in \`src/RateLimiter.js\`: return the matching \`{ maxRequests, windowSeconds }\` config for the given route string, following exact-then-wildcard-then-default priority.
- **\`process(request)\`** in \`src/RateLimiter.js\`: return \`{ requestId, status, remainingQuota, matchedPattern }\` using the sliding window algorithm with the per-route limit.

## Notes

- Wildcard patterns end with \`/*\`; when multiple wildcards match, the one with the longest prefix before \`*\` wins.
- Limits are tracked per user per matched pattern, not per URL. \`GET /api/users\` and \`GET /api/orders\` both matching \`GET /api/*\` share one quota bucket per user.
- Use \`"default"\` as \`matchedPattern\` when the default limit applies.
`;

// ── Visible tests ─────────────────────────────────────────────────────────────

const VIS_P1 = [
  { id: 'v1', description: 'allows first request, then blocks when limit exceeded',
    input: { requests: [{ id: 'r1', userId: 'alice', timestamp: 0 }, { id: 'r2', userId: 'alice', timestamp: 1 }, { id: 'r3', userId: 'alice', timestamp: 2 }], config: { maxRequests: 2, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 1 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r3', status: 'BLOCKED', remainingQuota: 0 }] },
  { id: 'v2', description: 'quota resets at epoch-aligned window boundary',
    input: { requests: [{ id: 'r1', userId: 'alice', timestamp: 10 }, { id: 'r2', userId: 'alice', timestamp: 30 }, { id: 'r3', userId: 'alice', timestamp: 60 }], config: { maxRequests: 2, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 1 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r3', status: 'ALLOWED', remainingQuota: 1 }] },
  { id: 'v3', description: 'two users have independent quotas',
    input: { requests: [{ id: 'r1', userId: 'alice', timestamp: 0 }, { id: 'r2', userId: 'bob', timestamp: 1 }, { id: 'r3', userId: 'alice', timestamp: 2 }], config: { maxRequests: 1, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r3', status: 'BLOCKED', remainingQuota: 0 }] },
  { id: 'v4', description: 'remainingQuota counts down correctly',
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0 }, { id: 'r2', userId: 'u', timestamp: 1 }, { id: 'r3', userId: 'u', timestamp: 2 }], config: { maxRequests: 3, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 2 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 1 }, { requestId: 'r3', status: 'ALLOWED', remainingQuota: 0 }] },
];

const HID_P1 = [
  { id: 'h1', description: 'request at exact boundary t=60 is in window 1, not window 0',
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 59 }, { id: 'r2', userId: 'u', timestamp: 60 }], config: { maxRequests: 1, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 0 }] },
  { id: 'h2', description: 'window resets at epoch boundary not at first-request offset',
    // If reset were relative to first request (t=45), window would be [45,105) and r3 at t=61 would be blocked.
    // Correct: window [0,60) and [60,120), so r3 at t=61 is in window 1 and allowed.
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 45 }, { id: 'r2', userId: 'u', timestamp: 55 }, { id: 'r3', userId: 'u', timestamp: 61 }], config: { maxRequests: 2, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 1 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r3', status: 'ALLOWED', remainingQuota: 1 }] },
  { id: 'h3', description: 'maxRequests=1 allows only one per window',
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0 }, { id: 'r2', userId: 'u', timestamp: 1 }], config: { maxRequests: 1, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r2', status: 'BLOCKED', remainingQuota: 0 }] },
  { id: 'h4', description: 'three windows: quota resets each time',
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0 }, { id: 'r2', userId: 'u', timestamp: 60 }, { id: 'r3', userId: 'u', timestamp: 120 }], config: { maxRequests: 1, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r3', status: 'ALLOWED', remainingQuota: 0 }] },
  { id: 'h5', description: 'blocked request does not consume quota',
    // r3 is blocked; r4 should still see remainingQuota=0 (not negative)
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0 }, { id: 'r2', userId: 'u', timestamp: 1 }, { id: 'r3', userId: 'u', timestamp: 2 }, { id: 'r4', userId: 'u', timestamp: 3 }], config: { maxRequests: 2, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 1 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r3', status: 'BLOCKED', remainingQuota: 0 }, { requestId: 'r4', status: 'BLOCKED', remainingQuota: 0 }] },
];

const VIS_P2 = [
  { id: 'v1', description: 'basic sliding window: allows up to limit then blocks',
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0 }, { id: 'r2', userId: 'u', timestamp: 10 }, { id: 'r3', userId: 'u', timestamp: 20 }], config: { maxRequests: 2, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 1 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r3', status: 'BLOCKED', remainingQuota: 0 }] },
  { id: 'v2', description: 'early request falls out of sliding window, unblocking future request',
    // r1 at t=10, r2 at t=30 (both allowed). r3 at t=65: window is (5,65]. t=10 is NOT in (5,65], t=30 is. count=1, allow.
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 10 }, { id: 'r2', userId: 'u', timestamp: 30 }, { id: 'r3', userId: 'u', timestamp: 65 }], config: { maxRequests: 2, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 1 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r3', status: 'ALLOWED', remainingQuota: 0 }] },
  { id: 'v3', description: 'blocked request is not recorded in the window',
    // r3 blocked, so r4 still sees the same 2 allowed requests
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0 }, { id: 'r2', userId: 'u', timestamp: 1 }, { id: 'r3', userId: 'u', timestamp: 2 }, { id: 'r4', userId: 'u', timestamp: 3 }], config: { maxRequests: 2, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 1 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r3', status: 'BLOCKED', remainingQuota: 0 }, { requestId: 'r4', status: 'BLOCKED', remainingQuota: 0 }] },
];

const HID_P2 = [
  { id: 'h1', description: 'sliding window does not reset at epoch boundary',
    // t=10 and t=30 allowed. t=60: window=(0,60], both t=10 and t=30 are inside → blocked.
    // Contrast with fixed window Part 1 where t=60 would be in window 1 (fresh quota).
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 10 }, { id: 'r2', userId: 'u', timestamp: 30 }, { id: 'r3', userId: 'u', timestamp: 60 }], config: { maxRequests: 2, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 1 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r3', status: 'BLOCKED', remainingQuota: 0 }] },
  { id: 'h2', description: 'window is open on left: request exactly at T-W is excluded',
    // t=10, t=30 allowed. t=70: window=(10,70]. t=10 is not in (10,70] (open interval). t=30 is. count=1 → allow.
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 10 }, { id: 'r2', userId: 'u', timestamp: 30 }, { id: 'r3', userId: 'u', timestamp: 70 }], config: { maxRequests: 2, windowSeconds: 60 } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 1 }, { requestId: 'r2', status: 'ALLOWED', remainingQuota: 0 }, { requestId: 'r3', status: 'ALLOWED', remainingQuota: 0 }] },
];

const VIS_P3 = [
  { id: 'v1', description: 'exact match uses route-specific limit',
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0, route: 'POST /api/payments' }],
      config: { defaultLimit: { maxRequests: 100, windowSeconds: 60 }, routes: [{ pattern: 'POST /api/payments', maxRequests: 2, windowSeconds: 60 }] } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 1, matchedPattern: 'POST /api/payments' }] },
  { id: 'v2', description: 'wildcard matches route with same method',
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0, route: 'GET /api/users' }],
      config: { defaultLimit: { maxRequests: 100, windowSeconds: 60 }, routes: [{ pattern: 'GET /api/*', maxRequests: 5, windowSeconds: 60 }] } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 4, matchedPattern: 'GET /api/*' }] },
  { id: 'v3', description: 'wildcard does not match different method',
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0, route: 'POST /api/users' }],
      config: { defaultLimit: { maxRequests: 3, windowSeconds: 60 }, routes: [{ pattern: 'GET /api/*', maxRequests: 1, windowSeconds: 60 }] } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 2, matchedPattern: 'default' }] },
  { id: 'v4', description: 'exact match wins over wildcard even if wildcard is listed first',
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0, route: 'GET /api/search' }],
      config: { defaultLimit: { maxRequests: 100, windowSeconds: 60 }, routes: [{ pattern: 'GET /api/*', maxRequests: 50, windowSeconds: 60 }, { pattern: 'GET /api/search', maxRequests: 5, windowSeconds: 60 }] } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 4, matchedPattern: 'GET /api/search' }] },
];

const HID_P3 = [
  { id: 'h1', description: 'more specific wildcard wins over less specific wildcard',
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0, route: 'GET /api/v2/orders' }],
      config: { defaultLimit: { maxRequests: 100, windowSeconds: 60 }, routes: [{ pattern: 'GET /api/*', maxRequests: 50, windowSeconds: 60 }, { pattern: 'GET /api/v2/*', maxRequests: 10, windowSeconds: 60 }] } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 9, matchedPattern: 'GET /api/v2/*' }] },
  { id: 'h2', description: 'quota buckets are per-pattern not per-URL',
    // Both requests go to different URLs but same pattern: shared quota
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0, route: 'GET /api/users' }, { id: 'r2', userId: 'u', timestamp: 1, route: 'GET /api/orders' }],
      config: { defaultLimit: { maxRequests: 100, windowSeconds: 60 }, routes: [{ pattern: 'GET /api/*', maxRequests: 1, windowSeconds: 60 }] } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 0, matchedPattern: 'GET /api/*' }, { requestId: 'r2', status: 'BLOCKED', remainingQuota: 0, matchedPattern: 'GET /api/*' }] },
  { id: 'h3', description: 'unmatched route falls through to default',
    input: { requests: [{ id: 'r1', userId: 'u', timestamp: 0, route: 'DELETE /webhooks/123' }],
      config: { defaultLimit: { maxRequests: 3, windowSeconds: 60 }, routes: [{ pattern: 'GET /api/*', maxRequests: 1, windowSeconds: 60 }] } },
    expectedOutput: [{ requestId: 'r1', status: 'ALLOWED', remainingQuota: 2, matchedPattern: 'default' }] },
];

// ── Exported scenario ─────────────────────────────────────────────────────────

export const rateLimiter = {
  id: 'rate-limiter',
  title: 'API Rate Limiter',
  difficulty: 'Medium',
  durationMinutes: 35,
  tags: ['algorithms', 'state management', 'system design'],
  description:
    'Build a rate-limiting system for an API gateway. Process a stream of requests and decide which to allow or block. Three parts: fixed window → sliding window → per-route limits with wildcard pattern matching.',
  parts: [
    {
      id: 'part-1', number: 1, title: 'Fixed Window',
      readme: README_P1, starterFiles: STARTER_P1,
      visibleTests: VIS_P1, hiddenTests: HID_P1,
      trap: 'Windows are epoch-aligned (Math.floor(t/W)*W), NOT relative to the first request. A request at t=45 with W=60 is in window [0,60) and the window resets at t=60, not t=105.',
      edgeCases: ['Request at exact boundary t=W goes into window 1, not window 0', 'maxRequests=1 means only the very first request in each window is allowed', 'Blocked requests do not consume quota (remainingQuota stays at 0, not negative)', 'Two users at the same timestamp processed in array order'],
      answer: {
        fixedCode: `class RateLimiter {
  constructor(config) {
    this.config = config;
    this.store = new Map(); // Map<userId, Map<windowIndex, count>>
  }

  process(request) {
    const { maxRequests, windowSeconds } = this.config;
    const { id, userId, timestamp } = request;
    const windowIndex = Math.floor(timestamp / windowSeconds);

    if (!this.store.has(userId)) this.store.set(userId, new Map());
    const userWindows = this.store.get(userId);
    const count = userWindows.get(windowIndex) ?? 0;

    if (count >= maxRequests) {
      return { requestId: id, status: 'BLOCKED', remainingQuota: 0 };
    }

    userWindows.set(windowIndex, count + 1);
    return {
      requestId: id,
      status: 'ALLOWED',
      remainingQuota: maxRequests - (count + 1),
    };
  }
}

module.exports = { RateLimiter };`,
        explanation: 'Key decisions: (1) Window index is Math.floor(timestamp / windowSeconds), epoch-aligned, never relative to the first request in that window. (2) Track counts as a nested Map: userId → (windowIndex → count). (3) Check count >= maxRequests before incrementing so the limit is inclusive. (4) Blocked requests do not call userWindows.set(), so they don\'t consume quota. remainingQuota is maxRequests − (count + 1) for allowed requests and 0 for blocked.',
      },
    },
    {
      id: 'part-2', number: 2, title: 'Sliding Window',
      readme: README_P2, starterFiles: STARTER_P2,
      visibleTests: VIS_P2, hiddenTests: HID_P2,
      trap: 'The window interval is open on the left: (T-W, T]. A request exactly T-W seconds ago does NOT count toward the current window. Implementing >= instead of > will break the boundary test.',
      edgeCases: ['Window does not reset at epoch boundary (unlike Part 1)', 'Request exactly T-W seconds old is excluded (open left interval)', 'Blocked requests are not recorded and do not affect future windows'],
      answer: {
        fixedCode: `class RateLimiter {
  constructor(config) {
    this.config = config;
    this.store = new Map(); // Map<userId, number[]> of allowed timestamps
  }

  process(request) {
    const { maxRequests, windowSeconds } = this.config;
    const { id, userId, timestamp } = request;

    if (!this.store.has(userId)) this.store.set(userId, []);
    const ts = this.store.get(userId);

    // Open-left interval: (timestamp - windowSeconds, timestamp]
    const cutoff = timestamp - windowSeconds;
    const recent = ts.filter(t => t > cutoff);

    if (recent.length >= maxRequests) {
      this.store.set(userId, recent); // prune expired entries even on block
      return { requestId: id, status: 'BLOCKED', remainingQuota: 0 };
    }

    recent.push(timestamp);
    this.store.set(userId, recent);
    return {
      requestId: id,
      status: 'ALLOWED',
      remainingQuota: maxRequests - recent.length,
    };
  }
}

module.exports = { RateLimiter };`,
        explanation: 'Store raw allowed timestamps per user (not counts). For each request at time T, filter the list to timestamps strictly greater than T - windowSeconds. This implements the open-left interval (T-W, T]. If the filtered count is already >= maxRequests, block without recording the timestamp. The crucial difference from Part 1: there is no epoch-aligned reset. The window slides continuously, so t=10 is still in scope at t=69 but falls out at t=71 (cutoff=11, and 10 is not > 11).',
      },
    },
    {
      id: 'part-3', number: 3, title: 'Per-Route Limits',
      readme: README_P3, starterFiles: STARTER_P3,
      visibleTests: VIS_P3, hiddenTests: HID_P3,
      trap: 'Exact matches always win over wildcards regardless of the order routes are listed in the config. AIs tend to iterate routes in order and take the first match, which breaks when a wildcard appears before an exact match.',
      edgeCases: ['Exact match beats wildcard even if wildcard is listed first', 'More specific wildcard beats less specific one', 'Wildcard does not match different HTTP method', 'Quota buckets are per-user per-pattern (not per-URL)', 'matchedPattern is "default" when no route matches'],
      answer: {
        fixedCode: `class RateLimiter {
  constructor(config) {
    this.config = config;
    this.store = new Map(); // key: "userId:pattern" -> number[]
  }

  process(request) {
    const { id, userId, timestamp, route } = request;
    const { limit, matchedPattern } = this.resolveLimit(route);
    const { maxRequests, windowSeconds } = limit;

    const storeKey = userId + ':' + matchedPattern;
    if (!this.store.has(storeKey)) this.store.set(storeKey, []);
    const ts = this.store.get(storeKey);

    const cutoff = timestamp - windowSeconds;
    const recent = ts.filter(t => t > cutoff);

    if (recent.length >= maxRequests) {
      this.store.set(storeKey, recent);
      return { requestId: id, status: 'BLOCKED', remainingQuota: 0, matchedPattern };
    }

    recent.push(timestamp);
    this.store.set(storeKey, recent);
    return { requestId: id, status: 'ALLOWED', remainingQuota: maxRequests - recent.length, matchedPattern };
  }

  resolveLimit(route) {
    const { routes = [], defaultLimit } = this.config;

    // 1. Exact match (always wins regardless of array order)
    for (const r of routes) {
      if (!r.pattern.includes('*') && r.pattern === route) {
        return { limit: { maxRequests: r.maxRequests, windowSeconds: r.windowSeconds }, matchedPattern: r.pattern };
      }
    }

    // 2. Most-specific wildcard (longest non-wildcard prefix wins)
    let best = null;
    let bestLen = -1;
    for (const r of routes) {
      if (!r.pattern.endsWith('/*')) continue;
      const prefix = r.pattern.slice(0, -1); // "GET /api/" (remove the *)
      if (route.startsWith(prefix) && prefix.length > bestLen) {
        bestLen = prefix.length;
        best = r;
      }
    }
    if (best) {
      return { limit: { maxRequests: best.maxRequests, windowSeconds: best.windowSeconds }, matchedPattern: best.pattern };
    }

    // 3. Default
    return { limit: defaultLimit, matchedPattern: 'default' };
  }
}

module.exports = { RateLimiter };`,
        explanation: 'Two key ideas: (1) Route matching is done in strict priority: exact beats wildcard regardless of config order, most-specific wildcard (longest prefix before the *) beats less-specific. Never take the first matching wildcard; scan all of them and pick the one with the longest prefix. (2) Quota buckets use the matched pattern string (not the actual URL) as part of the store key. GET /api/users and GET /api/orders both match GET /api/* and share one sliding-window bucket per user.',
      },
    },
  ],
  testRunner: {
    entryFile: 'solution.js',
    functionName: 'processRequests',
    inputKeys: ['requests', 'config'],
  },
};

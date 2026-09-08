export const middlewarePipeline = {
  id: 'middleware-pipeline',
  title: 'Middleware Pipeline',
  difficulty: 'Medium',
  description:
    'Three control-flow bugs in a composable middleware system, the pattern powering Next.js API routes and Edge functions.',
  tags: ['middleware', 'compose', 'control-flow'],
  durationMinutes: 30,
  testRunner: {
    language: 'javascript',
    entryFile: 'src/pipeline.js',
    functionName: 'runPipeline',
    inputKeys: ['ctx'],
  },

  parts: [
    // ── Part 1: Linear Dispatch ───────────────────────────────────────────────
    {
      id: 'part-1',
      title: 'Linear Dispatch',
      readme: `# Middleware Pipeline, Part 1: Linear Dispatch

## Background

\`compose(middlewares)\` in \`src/pipeline.js\` chains an array of \`(ctx, next) => void\` functions left-to-right. Each middleware mutates \`ctx\`, then calls \`next()\` to hand off to the next function in the chain.

## Bug Report

\`ctx.requestId\` is never set even when the pipeline completes. The middlewares after the first one appear to run correctly.

## What to Implement

- **\`compose(middlewares)\`** in \`src/pipeline.js\`: fix it so every middleware in the array runs exactly once, in order.`,

      starterFiles: {
        'src/pipeline.js': `'use strict';

function compose(middlewares) {
  return function run(ctx) {
    function dispatch(i) {
      if (i >= middlewares.length) return;
      middlewares[i](ctx, function next() {
        dispatch(i + 1);
      });
    }
    dispatch(1);
    return ctx;
  };
}

function addRequestId(ctx, next) {
  ctx.requestId = 'req-' + ctx.seq;
  next();
}

function parseHeaders(ctx, next) {
  if (typeof ctx.host === 'string') {
    ctx.hostname = ctx.host.toLowerCase();
  }
  next();
}

function addMeta(ctx, next) {
  ctx.version = '1.0';
  next();
}

function runPipeline(ctx) {
  return compose([addRequestId, parseHeaders, addMeta])({ ...ctx });
}

module.exports = { runPipeline };
`,
      },

      visibleTests: [
        {
          description: 'all three middleware run and mutate ctx',
          input: { ctx: { seq: 1, host: 'API.example.com' } },
          expectedOutput: { seq: 1, host: 'API.example.com', requestId: 'req-1', hostname: 'api.example.com', version: '1.0' },
        },
        {
          description: 'requestId uses the seq field from ctx',
          input: { ctx: { seq: 99, host: 'Edge.io' } },
          expectedOutput: { seq: 99, host: 'Edge.io', requestId: 'req-99', hostname: 'edge.io', version: '1.0' },
        },
      ],
      hiddenTests: [
        {
          description: 'extra ctx fields are preserved unchanged',
          input: { ctx: { seq: 7, host: 'SVC.local', userId: 'u_42' } },
          expectedOutput: { seq: 7, host: 'SVC.local', userId: 'u_42', requestId: 'req-7', hostname: 'svc.local', version: '1.0' },
        },
        {
          description: 'hostname is lowercased regardless of original casing',
          input: { ctx: { seq: 2, host: 'VERCEL.COM' } },
          expectedOutput: { seq: 2, host: 'VERCEL.COM', requestId: 'req-2', hostname: 'vercel.com', version: '1.0' },
        },
      ],

      answer: {
        fixedCode: `// src/pipeline.js
'use strict';

function compose(middlewares) {
  return function run(ctx) {
    function dispatch(i) {
      if (i >= middlewares.length) return;
      middlewares[i](ctx, function next() {
        dispatch(i + 1);
      });
    }
    dispatch(0); // FIX: was dispatch(1), skipped the first middleware
    return ctx;
  };
}

function addRequestId(ctx, next) {
  ctx.requestId = 'req-' + ctx.seq;
  next();
}

function parseHeaders(ctx, next) {
  if (typeof ctx.host === 'string') {
    ctx.hostname = ctx.host.toLowerCase();
  }
  next();
}

function addMeta(ctx, next) {
  ctx.version = '1.0';
  next();
}

function runPipeline(ctx) {
  return compose([addRequestId, parseHeaders, addMeta])({ ...ctx });
}

module.exports = { runPipeline };
`,
        explanation:
          'compose() called dispatch(1), which skips index 0, the first middleware in the array. Middlewares at index 1 and beyond still ran, which is why parseHeaders and addMeta appeared to work. Changing dispatch(1) to dispatch(0) ensures every slot in the array executes. Classic off-by-one: easy to miss because most symptoms only show up in the first item.',
      },
    },

    // ── Part 2: Guard Middleware ──────────────────────────────────────────────
    {
      id: 'part-2',
      title: 'Guard Middleware',
      readme: `# Middleware Pipeline, Part 2: Guard Middleware

## Background

Part 1 is complete. \`withGuard(predicate, handler)\` in \`src/pipeline.js\` wraps a handler middleware so it only runs when \`predicate(ctx)\` returns \`true\`. When the predicate fails, it sets \`ctx.blocked = true\` and \`ctx.blockReason = 'unauthorized'\` and must not invoke the handler.

## Bug Report

Non-admin requests are correctly marked with \`ctx.blocked = true\` and \`ctx.blockReason\`, but \`ctx.result\` is still being set. The protected handler runs regardless of the predicate result.

## What to Implement

- **\`withGuard(predicate, handler)\`** in \`src/pipeline.js\`: fix the guard so the handler is not called when the predicate returns \`false\`.`,

      starterFiles: {
        'src/pipeline.js': `'use strict';

function compose(middlewares) {
  return function run(ctx) {
    function dispatch(i) {
      if (i >= middlewares.length) return;
      middlewares[i](ctx, function next() {
        dispatch(i + 1);
      });
    }
    dispatch(0);
    return ctx;
  };
}

function withGuard(predicate, handler) {
  return function guarded(ctx, next) {
    if (!predicate(ctx)) {
      ctx.blocked = true;
      ctx.blockReason = 'unauthorized';
    }
    handler(ctx, next);
  };
}

function isAdmin(ctx) {
  return ctx.role === 'admin';
}

function processRequest(ctx, next) {
  ctx.result = 'processed';
  next();
}

function runPipeline(ctx) {
  return compose([withGuard(isAdmin, processRequest)])({ ...ctx });
}

module.exports = { runPipeline };
`,
      },

      visibleTests: [
        {
          description: 'admin role: handler runs and sets result',
          input: { ctx: { role: 'admin' } },
          expectedOutput: { role: 'admin', result: 'processed' },
        },
        {
          description: 'non-admin: blocked flag set, handler must NOT run',
          input: { ctx: { role: 'user' } },
          expectedOutput: { role: 'user', blocked: true, blockReason: 'unauthorized' },
        },
      ],
      hiddenTests: [
        {
          description: 'missing role field is treated as unauthorized',
          input: { ctx: {} },
          expectedOutput: { blocked: true, blockReason: 'unauthorized' },
        },
        {
          description: 'admin with extra fields: result is set, no blocked flag',
          input: { ctx: { role: 'admin', userId: 'u_1' } },
          expectedOutput: { role: 'admin', userId: 'u_1', result: 'processed' },
        },
        {
          description: 'guest role is unauthorized',
          input: { ctx: { role: 'guest', data: 'x' } },
          expectedOutput: { role: 'guest', data: 'x', blocked: true, blockReason: 'unauthorized' },
        },
      ],

      answer: {
        fixedCode: `// src/pipeline.js
'use strict';

function compose(middlewares) {
  return function run(ctx) {
    function dispatch(i) {
      if (i >= middlewares.length) return;
      middlewares[i](ctx, function next() {
        dispatch(i + 1);
      });
    }
    dispatch(0);
    return ctx;
  };
}

function withGuard(predicate, handler) {
  return function guarded(ctx, next) {
    if (!predicate(ctx)) {
      ctx.blocked = true;
      ctx.blockReason = 'unauthorized';
      return; // FIX: early return prevents handler from running
    }
    handler(ctx, next);
  };
}

function isAdmin(ctx) {
  return ctx.role === 'admin';
}

function processRequest(ctx, next) {
  ctx.result = 'processed';
  next();
}

function runPipeline(ctx) {
  return compose([withGuard(isAdmin, processRequest)])({ ...ctx });
}

module.exports = { runPipeline };
`,
        explanation:
          'The guard set ctx.blocked and ctx.blockReason correctly, but then fell through to the handler call because there was no return statement. Adding return after setting the blocked state exits the guarded function early, preventing handler(ctx, next) from ever being called. This pattern, forgetting a return after an early-exit branch, is one of the most frequent middleware bugs in Express and Koa codebases.',
      },
    },

    // ── Part 3: Route Matching ────────────────────────────────────────────────
    {
      id: 'part-3',
      title: 'Route Prefix Matching',
      readme: `# Middleware Pipeline, Part 3: Route Prefix Matching

## Background

Parts 1 and 2 are complete. \`matchRoute(path, pattern)\` in \`src/pipeline.js\` matches a request path against a route pattern. Wildcard patterns use the form \`/prefix/*\` and should match any path that begins with \`/prefix/\`, but not paths that merely share the same leading characters without a path-segment boundary.

## Bug Report

\`/apikey\` is being routed to the \`api-handler\`. Requests to \`/api\` (no trailing slash) also incorrectly match the \`/api/*\` pattern.

## What to Implement

- **\`matchRoute(path, pattern)\`** in \`src/pipeline.js\`: fix wildcard matching so a \`/prefix/*\` pattern only matches paths that start with \`/prefix/\`.

## Notes

- \`/api/\` (trailing slash, no further segments) must match \`/api/*\`; \`/api\` (no slash) must not.`,

      starterFiles: {
        'src/pipeline.js': `'use strict';

function compose(middlewares) {
  return function run(ctx) {
    function dispatch(i) {
      if (i >= middlewares.length) return;
      middlewares[i](ctx, function next() { dispatch(i + 1); });
    }
    dispatch(0);
    return ctx;
  };
}

function matchRoute(path, pattern) {
  if (pattern === '*') return true;
  if (pattern.endsWith('/*')) {
    var prefix = pattern.slice(0, -2);
    return path.startsWith(prefix);
  }
  return path === pattern;
}

var ROUTES = [
  { pattern: '/api/*',    handler: 'api-handler' },
  { pattern: '/static/*', handler: 'static-handler' },
  { pattern: '/',         handler: 'home-handler' },
];

function route(ctx, next) {
  var matched = null;
  for (var i = 0; i < ROUTES.length; i++) {
    if (matchRoute(ctx.path, ROUTES[i].pattern)) {
      matched = ROUTES[i];
      break;
    }
  }
  ctx.handler = matched ? matched.handler : null;
  next();
}

function runPipeline(ctx) {
  return compose([route])({ ...ctx });
}

module.exports = { runPipeline };
`,
      },

      visibleTests: [
        {
          description: 'exact root path matches home-handler',
          input: { ctx: { path: '/' } },
          expectedOutput: { path: '/', handler: 'home-handler' },
        },
        {
          description: '/api/users correctly routes to api-handler',
          input: { ctx: { path: '/api/users' } },
          expectedOutput: { path: '/api/users', handler: 'api-handler' },
        },
        {
          description: '/apikey must NOT match /api/* (no slash boundary)',
          input: { ctx: { path: '/apikey' } },
          expectedOutput: { path: '/apikey', handler: null },
        },
      ],
      hiddenTests: [
        {
          description: '/api alone (no trailing slash) must not match /api/*',
          input: { ctx: { path: '/api' } },
          expectedOutput: { path: '/api', handler: null },
        },
        {
          description: '/static/logo.png routes to static-handler',
          input: { ctx: { path: '/static/logo.png' } },
          expectedOutput: { path: '/static/logo.png', handler: 'static-handler' },
        },
        {
          description: 'unknown path returns null handler',
          input: { ctx: { path: '/dashboard' } },
          expectedOutput: { path: '/dashboard', handler: null },
        },
        {
          description: '/api/ with trailing slash matches api-handler',
          input: { ctx: { path: '/api/' } },
          expectedOutput: { path: '/api/', handler: 'api-handler' },
        },
      ],

      answer: {
        fixedCode: `// src/pipeline.js
'use strict';

function compose(middlewares) {
  return function run(ctx) {
    function dispatch(i) {
      if (i >= middlewares.length) return;
      middlewares[i](ctx, function next() { dispatch(i + 1); });
    }
    dispatch(0);
    return ctx;
  };
}

function matchRoute(path, pattern) {
  if (pattern === '*') return true;
  if (pattern.endsWith('/*')) {
    var prefix = pattern.slice(0, -2);
    // FIX: require a '/' after the prefix so '/apikey' doesn't match '/api/*'
    return path.startsWith(prefix + '/');
  }
  return path === pattern;
}

var ROUTES = [
  { pattern: '/api/*',    handler: 'api-handler' },
  { pattern: '/static/*', handler: 'static-handler' },
  { pattern: '/',         handler: 'home-handler' },
];

function route(ctx, next) {
  var matched = null;
  for (var i = 0; i < ROUTES.length; i++) {
    if (matchRoute(ctx.path, ROUTES[i].pattern)) {
      matched = ROUTES[i];
      break;
    }
  }
  ctx.handler = matched ? matched.handler : null;
  next();
}

function runPipeline(ctx) {
  return compose([route])({ ...ctx });
}

module.exports = { runPipeline };
`,
        explanation:
          "path.startsWith(prefix) matched any string that began with those characters, so '/apikey' matched '/api/*' because '/apikey'.startsWith('/api') is true. Appending a '/' to the prefix before the check enforces a path-segment boundary: '/apikey'.startsWith('/api/') is false, while '/api/users'.startsWith('/api/') is true. This is the canonical fix used in every Express-style router.",
      },
    },
  ],
};

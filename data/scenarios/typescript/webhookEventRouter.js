export const webhookEventRouter = {
  id: 'webhook-event-router',
  title: 'Webhook Event Router',
  difficulty: 'Hard',
  description:
    'Three bugs in a Stripe-style webhook processing pipeline: a logic error in the event classifier, a silent data error in the refund normaliser, and a tiebreaker ordering bug in the priority dispatcher.',
  tags: ['webhooks', 'event-handling', 'javascript'],
  durationMinutes: 35,
  testRunner: {
    language: 'javascript',
    entryFile: 'src/classifier.js',
    functionName: 'classifyEvent',
    inputKeys: ['rawType'],
  },

  parts: [
    // ── Part 1: Event Classifier ──────────────────────────────────────────────
    {
      id: 'part-1',
      title: 'Event Classifier',
      readme: `# Webhook Event Router, Part 1: Event Classifier

## Background

\`classifyEvent(rawType)\` in \`src/classifier.js\` receives a dot-separated Stripe webhook type string (e.g., \`"payment.refunded"\`), splits on the first dot, and returns a normalized kind string. Valid kinds are \`payment_created\`, \`payment_refunded\`, \`payment_failed\`, \`subscription_created\`, \`subscription_canceled\`; anything else returns \`"unknown"\`.

## Bug Report

\`payment.canceled\` returns \`"subscription_canceled"\` instead of \`"unknown"\`. Subscription events themselves appear to work correctly.

## What to Implement

- **\`classifyEvent(rawType)\`** in \`src/classifier.js\`: fix the condition that classifies subscription events so it does not match non-subscription event types.`,

      starterFiles: {
        'src/classifier.js': `'use strict';

/**
 * @param {string} rawType - e.g. "payment.refunded"
 * @returns {string} normalised event kind
 */
function classifyEvent(rawType) {
  var dot = rawType.indexOf('.');
  if (dot === -1) return 'unknown';

  var resource = rawType.slice(0, dot);
  var action   = rawType.slice(dot + 1);

  if (resource === 'payment') {
    if (action === 'created')  return 'payment_created';
    if (action === 'refunded') return 'payment_refunded';
    if (action === 'failed')   return 'payment_failed';
  }

  if (resource === 'subscription' && action === 'created' || action === 'canceled') {
    return 'subscription_' + action;
  }

  return 'unknown';
}

module.exports = { classifyEvent };
`,
      },

      visibleTests: [
        {
          description: 'payment.created → payment_created',
          input: { rawType: 'payment.created' },
          expectedOutput: 'payment_created',
        },
        {
          description: 'payment.canceled is not a known type: must return "unknown"',
          input: { rawType: 'payment.canceled' },
          expectedOutput: 'unknown',
        },
        {
          description: 'subscription.created → subscription_created',
          input: { rawType: 'subscription.created' },
          expectedOutput: 'subscription_created',
        },
      ],
      hiddenTests: [
        {
          description: 'payment.refunded → payment_refunded',
          input: { rawType: 'payment.refunded' },
          expectedOutput: 'payment_refunded',
        },
        {
          description: 'payment.failed → payment_failed',
          input: { rawType: 'payment.failed' },
          expectedOutput: 'payment_failed',
        },
        {
          description: 'subscription.canceled → subscription_canceled',
          input: { rawType: 'subscription.canceled' },
          expectedOutput: 'subscription_canceled',
        },
        {
          description: 'dispute.canceled: unknown resource with a "canceled" action must still return "unknown"',
          input: { rawType: 'dispute.canceled' },
          expectedOutput: 'unknown',
        },
        {
          description: 'no dot separator → unknown',
          input: { rawType: 'payment' },
          expectedOutput: 'unknown',
        },
      ],

      answer: {
        fixedCode: `// src/classifier.js
'use strict';

function classifyEvent(rawType) {
  var dot = rawType.indexOf('.');
  if (dot === -1) return 'unknown';

  var resource = rawType.slice(0, dot);
  var action   = rawType.slice(dot + 1);

  if (resource === 'payment') {
    if (action === 'created')  return 'payment_created';
    if (action === 'refunded') return 'payment_refunded';
    if (action === 'failed')   return 'payment_failed';
  }

  // FIX: wrap both action checks in parens so && binds them together with resource
  if (resource === 'subscription' && (action === 'created' || action === 'canceled')) {
    return 'subscription_' + action;
  }

  return 'unknown';
}

module.exports = { classifyEvent };
`,
        explanation:
          "JavaScript evaluates && before ||, so the original condition parsed as (resource === 'subscription' && action === 'created') || (action === 'canceled'). The second clause, action === 'canceled', had no resource guard at all, meaning any event type whose action was \"canceled\" matched and returned a subscription kind. Wrapping the two action checks in parentheses restores the intended grouping: resource must be 'subscription' AND action must be one of the two valid values. This class of precedence bug is easy to miss because the code looks reasonable at a glance and subscription.canceled still passes. It just passes for the wrong reason.",
      },
    },

    // ── Part 2: Event Normaliser ──────────────────────────────────────────────
    {
      id: 'part-2',
      title: 'Event Normaliser',
      readme: `# Webhook Event Router, Part 2: Event Normaliser

## Background

Part 1 is complete. \`normalizeEvent(event)\` in \`src/normalizer.js\` takes a raw Stripe webhook event object and returns a flattened normalized representation. Refund events include an \`originalPaymentId\` field on the input referencing the original charge.

## Bug Report

Refund events normalize without error, but the \`originalPaymentId\` field in the returned object always contains the refund event's own \`id\` instead of the original charge ID. All other event types normalize correctly.

## What to Implement

- **\`normalizeEvent(event)\`** in \`src/normalizer.js\`: fix the refund branch to read \`originalPaymentId\` from the correct field on the input event. Do not modify \`src/classifier.js\`.`,

      starterFiles: {
        'src/classifier.js': `'use strict';

function classifyEvent(rawType) {
  var dot = rawType.indexOf('.');
  if (dot === -1) return 'unknown';
  var resource = rawType.slice(0, dot);
  var action   = rawType.slice(dot + 1);
  if (resource === 'payment') {
    if (action === 'created')  return 'payment_created';
    if (action === 'refunded') return 'payment_refunded';
    if (action === 'failed')   return 'payment_failed';
  }
  if (resource === 'subscription' && (action === 'created' || action === 'canceled')) {
    return 'subscription_' + action;
  }
  return 'unknown';
}

module.exports = { classifyEvent };
`,
        'src/normalizer.js': `'use strict';

var classifier = require('./classifier');
var classifyEvent = classifier.classifyEvent;

/**
 * @param {object} event - raw Stripe webhook payload
 * @returns {object} normalised event
 */
function normalizeEvent(event) {
  var kind = classifyEvent(event.type);

  if (kind === 'payment_created' || kind === 'payment_failed') {
    return {
      kind:     kind,
      id:       event.id,
      amount:   event.amount,
      currency: event.currency,
      userId:   event.userId,
    };
  }

  if (kind === 'payment_refunded') {
    return {
      kind:              kind,
      id:                event.id,
      refundId:          event.refundId,
      amount:            event.amount,
      userId:            event.userId,
      originalPaymentId: event.id,
    };
  }

  if (kind === 'subscription_created' || kind === 'subscription_canceled') {
    return {
      kind:   kind,
      id:     event.id,
      planId: event.planId,
      userId: event.userId,
    };
  }

  return { kind: 'unknown', id: event.id };
}

module.exports = { normalizeEvent };
`,
      },

      testRunner: {
        entryFile: 'src/normalizer.js',
        functionName: 'normalizeEvent',
        inputKeys: ['event'],
      },

      visibleTests: [
        {
          description: 'payment.created: amount and currency read from top-level fields',
          input: { event: { type: 'payment.created', id: 'evt_1', amount: 5000, currency: 'usd', userId: 'u_1' } },
          expectedOutput: { kind: 'payment_created', id: 'evt_1', amount: 5000, currency: 'usd', userId: 'u_1' },
        },
        {
          description: 'payment.refunded: originalPaymentId must reference the original charge, not the refund event itself',
          input: {
            event: {
              type: 'payment.refunded', id: 'evt_r1', refundId: 'ref_42',
              amount: 1500, userId: 'u_7', originalPaymentId: 'evt_orig_55',
            },
          },
          expectedOutput: {
            kind: 'payment_refunded', id: 'evt_r1', refundId: 'ref_42',
            amount: 1500, userId: 'u_7', originalPaymentId: 'evt_orig_55',
          },
        },
        {
          description: 'subscription.created: planId and userId preserved',
          input: { event: { type: 'subscription.created', id: 'evt_3', planId: 'plan_pro', userId: 'u_2' } },
          expectedOutput: { kind: 'subscription_created', id: 'evt_3', planId: 'plan_pro', userId: 'u_2' },
        },
      ],
      hiddenTests: [
        {
          description: 'payment.failed: same shape as payment.created',
          input: { event: { type: 'payment.failed', id: 'evt_4', amount: 2000, currency: 'eur', userId: 'u_3' } },
          expectedOutput: { kind: 'payment_failed', id: 'evt_4', amount: 2000, currency: 'eur', userId: 'u_3' },
        },
        {
          description: 'payment.refunded: distinct ids confirm originalPaymentId is not copied from event.id',
          input: {
            event: {
              type: 'payment.refunded', id: 'evt_r9', refundId: 'ref_7',
              amount: 800, userId: 'u_5', originalPaymentId: 'evt_p3',
            },
          },
          expectedOutput: {
            kind: 'payment_refunded', id: 'evt_r9', refundId: 'ref_7',
            amount: 800, userId: 'u_5', originalPaymentId: 'evt_p3',
          },
        },
        {
          description: 'subscription.canceled: planId preserved',
          input: { event: { type: 'subscription.canceled', id: 'evt_5', planId: 'plan_basic', userId: 'u_4' } },
          expectedOutput: { kind: 'subscription_canceled', id: 'evt_5', planId: 'plan_basic', userId: 'u_4' },
        },
        {
          description: 'unknown type falls through to unknown shape',
          input: { event: { type: 'dispute.opened', id: 'evt_6' } },
          expectedOutput: { kind: 'unknown', id: 'evt_6' },
        },
      ],

      answer: {
        fixedCode: `// src/normalizer.js
'use strict';

var classifier = require('./classifier');
var classifyEvent = classifier.classifyEvent;

function normalizeEvent(event) {
  var kind = classifyEvent(event.type);

  if (kind === 'payment_created' || kind === 'payment_failed') {
    return {
      kind:     kind,
      id:       event.id,
      amount:   event.amount,
      currency: event.currency,
      userId:   event.userId,
    };
  }

  if (kind === 'payment_refunded') {
    return {
      kind:              kind,
      id:                event.id,
      refundId:          event.refundId,
      amount:            event.amount,
      userId:            event.userId,
      originalPaymentId: event.originalPaymentId,  // FIX: was event.id
    };
  }

  if (kind === 'subscription_created' || kind === 'subscription_canceled') {
    return {
      kind:   kind,
      id:     event.id,
      planId: event.planId,
      userId: event.userId,
    };
  }

  return { kind: 'unknown', id: event.id };
}

module.exports = { normalizeEvent };
`,
        explanation:
          "The refund branch read event.id for originalPaymentId instead of event.originalPaymentId. Because event.id is a valid string on every event object, no TypeError was thrown: the function returned a silently wrong value. In a live system this means any downstream service that matches refunds back to original charges (billing reconciliation, fraud review, customer support tooling) would silently follow the wrong payment ID. When writing field-mapping code, be especially careful with same-shape objects that have multiple similarly-named ID fields (id, refundId, originalPaymentId): they will not crash when read incorrectly, they will just produce wrong results.",
      },
    },

    // ── Part 3: Priority Dispatcher ───────────────────────────────────────────
    {
      id: 'part-3',
      title: 'Priority Dispatcher',
      readme: `# Webhook Event Router, Part 3: Priority Dispatcher

## Background

Parts 1 and 2 are complete. \`sortEvents(events)\` in \`src/router.js\` sorts an array of normalized events from highest to lowest urgency using a numeric PRIORITY map (lower number = higher urgency). Events with equal priority must preserve their original relative order.

## Bug Report

Events with distinct priorities sort correctly. Events with equal priority arrive in reverse input order instead of the original order.

## What to Implement

- **\`sortEvents(events)\`** in \`src/router.js\`: fix the tiebreaker in the sort comparator so equal-priority events retain their original input order.`,

      starterFiles: {
        'src/router.js': `'use strict';

var PRIORITY = {
  payment_failed:        1,
  payment_refunded:      2,
  payment_created:       3,
  subscription_created:  4,
  subscription_canceled: 4,
  unknown:               9,
};

/**
 * @param {Array<{kind: string}>} events
 * @returns {Array<{kind: string}>} sorted highest-priority first; equal-priority events preserve input order
 */
function sortEvents(events) {
  return events.map(function(e, i) {
    return Object.assign({}, e, { _i: i });
  }).sort(function(a, b) {
    var pa = PRIORITY[a.kind] !== undefined ? PRIORITY[a.kind] : 9;
    var pb = PRIORITY[b.kind] !== undefined ? PRIORITY[b.kind] : 9;
    if (pa !== pb) return pa - pb;
    return b._i - a._i;
  }).map(function(e) {
    var out = Object.assign({}, e);
    delete out._i;
    return out;
  });
}

module.exports = { sortEvents };
`,
      },

      testRunner: {
        entryFile: 'src/router.js',
        functionName: 'sortEvents',
        inputKeys: ['events'],
      },

      visibleTests: [
        {
          description: 'distinct-priority events sort from highest to lowest urgency',
          input: {
            events: [
              { kind: 'subscription_created', id: 'e3' },
              { kind: 'payment_failed',        id: 'e1' },
              { kind: 'payment_created',       id: 'e2' },
            ],
          },
          expectedOutput: [
            { kind: 'payment_failed',       id: 'e1' },
            { kind: 'payment_created',      id: 'e2' },
            { kind: 'subscription_created', id: 'e3' },
          ],
        },
        {
          description: 'equal-priority events preserve input order (subscription_canceled arrived first)',
          input: {
            events: [
              { kind: 'subscription_canceled', id: 'x' },
              { kind: 'subscription_created',  id: 'y' },
            ],
          },
          expectedOutput: [
            { kind: 'subscription_canceled', id: 'x' },
            { kind: 'subscription_created',  id: 'y' },
          ],
        },
      ],
      hiddenTests: [
        {
          description: 'all five distinct priority levels in scrambled input order',
          input: {
            events: [
              { kind: 'unknown',              id: 'e5' },
              { kind: 'payment_created',      id: 'e3' },
              { kind: 'payment_failed',       id: 'e1' },
              { kind: 'subscription_created', id: 'e4' },
              { kind: 'payment_refunded',     id: 'e2' },
            ],
          },
          expectedOutput: [
            { kind: 'payment_failed',       id: 'e1' },
            { kind: 'payment_refunded',     id: 'e2' },
            { kind: 'payment_created',      id: 'e3' },
            { kind: 'subscription_created', id: 'e4' },
            { kind: 'unknown',              id: 'e5' },
          ],
        },
        {
          description: 'three equal-priority events maintain their original arrival order',
          input: {
            events: [
              { kind: 'payment_failed',        id: 'high' },
              { kind: 'subscription_created',  id: 'a' },
              { kind: 'payment_refunded',      id: 'mid' },
              { kind: 'subscription_canceled', id: 'b' },
              { kind: 'subscription_created',  id: 'c' },
            ],
          },
          expectedOutput: [
            { kind: 'payment_failed',        id: 'high' },
            { kind: 'payment_refunded',      id: 'mid' },
            { kind: 'subscription_created',  id: 'a' },
            { kind: 'subscription_canceled', id: 'b' },
            { kind: 'subscription_created',  id: 'c' },
          ],
        },
        {
          description: 'single element returns unchanged',
          input: { events: [{ kind: 'payment_failed', id: 'only' }] },
          expectedOutput: [{ kind: 'payment_failed', id: 'only' }],
        },
        {
          description: 'unknown kind is treated as priority 9 and sorts last',
          input: {
            events: [
              { kind: 'unknown',          id: 'low' },
              { kind: 'payment_refunded', id: 'high' },
            ],
          },
          expectedOutput: [
            { kind: 'payment_refunded', id: 'high' },
            { kind: 'unknown',          id: 'low' },
          ],
        },
      ],

      answer: {
        fixedCode: `// src/router.js
'use strict';

var PRIORITY = {
  payment_failed:        1,
  payment_refunded:      2,
  payment_created:       3,
  subscription_created:  4,
  subscription_canceled: 4,
  unknown:               9,
};

function sortEvents(events) {
  return events.map(function(e, i) {
    return Object.assign({}, e, { _i: i });
  }).sort(function(a, b) {
    var pa = PRIORITY[a.kind] !== undefined ? PRIORITY[a.kind] : 9;
    var pb = PRIORITY[b.kind] !== undefined ? PRIORITY[b.kind] : 9;
    if (pa !== pb) return pa - pb;
    return a._i - b._i;  // FIX: was b._i - a._i. Must preserve original order for equal-priority events
  }).map(function(e) {
    var out = Object.assign({}, e);
    delete out._i;
    return out;
  });
}

module.exports = { sortEvents };
`,
        explanation:
          "Array.sort places a before b when the comparator returns a negative number. The tiebreaker b._i - a._i produces a positive result when a appeared earlier in the input (lower _i), so earlier events were placed after later ones, a full reversal of equal-priority items. Swapping to a._i - b._i produces a negative result for earlier events, keeping them first. Note: JavaScript's built-in Array.sort is not guaranteed to be stable across all engines, which is exactly why an explicit index tiebreaker is needed. The fix is one character, but finding it requires understanding both sort comparator semantics and why the primary sort appears to work while the secondary doesn't.",
      },
    },
  ],
};

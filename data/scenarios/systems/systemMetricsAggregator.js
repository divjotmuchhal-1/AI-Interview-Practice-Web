// ─── Event Metrics Aggregator ─────────────────────────────────────────────────
// Inspired by: Meta, Amplitude, Mixpanel analytics pipeline interviews

const STARTER = {
  'pipeline.js': `const { parseEvents }      = require('./eventParser');
const { validateEvents }   = require('./eventValidator');
const { enrichEvent }      = require('./eventEnricher');
const { accumulate }       = require('./revenueAccumulator');
const { countUniqueUsers } = require('./userCounter');
const { assembleReport }   = require('./reportAssembler');

/**
 * Aggregates a raw event stream into purchase statistics.
 *
 * @param {Array<*>} rawEvents  Raw event stream; may contain nulls or malformed entries
 * @returns {{ totalRevenue: number, uniqueUsers: number, avgOrderValue: number }}
 */
function aggregateMetrics(rawEvents) {
  const parsed   = parseEvents(rawEvents);
  const valid    = validateEvents(parsed);
  const enriched = valid.map(enrichEvent);

  const revenue = accumulate(enriched);
  const users   = countUniqueUsers(enriched);

  return assembleReport(revenue, users);
}

module.exports = { aggregateMetrics };
`,

  'eventParser.js': `/**
 * Strips null/undefined entries from the raw stream and returns a clean array.
 */
function parseEvents(rawEvents) {
  return (rawEvents ?? []).filter(e => e !== null && e !== undefined);
}

module.exports = { parseEvents };
`,

  'eventValidator.js': `/**
 * Filters out structurally invalid events.
 * A valid event must have a string \`type\` and a string \`userId\`.
 */
function validateEvents(events) {
  return events.filter(
    e => typeof e.type === 'string' && typeof e.userId === 'string',
  );
}

module.exports = { validateEvents };
`,

  'eventEnricher.js': `/**
 * Enriches purchase events with commerce metadata.
 * Non-purchase events pass through unchanged.
 */
function enrichEvent(event) {
  if (event.type !== 'purchase') return event;
  return {
    ...event,
    category: 'commerce',
    type:     'processed_purchase',
  };
}

module.exports = { enrichEvent };
`,

  'revenueAccumulator.js': `/**
 * Computes total revenue and average order value from the enriched event stream.
 * Only events with type === 'purchase' contribute to these metrics.
 *
 * @param {Array<Object>} events  Enriched, validated event stream
 * @returns {{ totalRevenue: number, avgOrderValue: number }}
 */
function accumulate(events) {
  const purchases = events.filter(e => e.type === 'purchase');

  const totalRevenue = Math.round(
    purchases.reduce((sum, e) => sum + (e.amount ?? 0), 0) * 100,
  ) / 100;

  const avgOrderValue = purchases.length > 0
    ? Math.round((totalRevenue / purchases.length) * 100) / 100
    : 0;

  return { totalRevenue, avgOrderValue };
}

module.exports = { accumulate };
`,

  'userCounter.js': `/**
 * Counts the number of unique users who made a purchase.
 * Non-purchase events do not contribute to this count.
 *
 * @param {Array<Object>} events  Enriched, validated event stream
 * @returns {number}
 */
function countUniqueUsers(events) {
  const purchases = events.filter(e => e.type === 'purchase');
  return new Set(purchases.map(e => e.userId)).size;
}

module.exports = { countUniqueUsers };
`,

  'reportAssembler.js': `/**
 * Assembles the final metrics report from the computed sub-results.
 *
 * @param {{ totalRevenue: number, avgOrderValue: number }} revenueData
 * @param {number} uniqueUsers
 * @returns {{ totalRevenue: number, uniqueUsers: number, avgOrderValue: number }}
 */
function assembleReport(revenueData, uniqueUsers) {
  return {
    totalRevenue:  revenueData.totalRevenue,
    uniqueUsers,
    avgOrderValue: revenueData.avgOrderValue,
  };
}

module.exports = { assembleReport };
`,
};

const README = `# Event Metrics Aggregator

## Background

\`aggregateMetrics(rawEvents)\` in \`pipeline.js\` aggregates a raw analytics event stream into purchase statistics and returns \`{ totalRevenue, uniqueUsers, avgOrderValue }\`. The stream may contain nulls and malformed entries. Event types: \`purchase\` (has an \`amount\` and \`userId\`) and engagement events such as \`page_view\`, \`click\`, \`login\` (no \`amount\`).

\`\`\`
pipeline.js           ← entry point; coordinates all pipeline stages in sequence
eventParser.js        ← strips null/undefined entries from the raw stream
eventValidator.js     ← filters events missing required fields (type + userId)
eventEnricher.js      ← enriches purchase events with commerce metadata
revenueAccumulator.js ← computes total revenue and average order value
userCounter.js        ← counts unique users who made a purchase
reportAssembler.js    ← assembles the final metrics report
\`\`\`

## Bug Report

The pipeline returns \`{ totalRevenue: 0, uniqueUsers: 0, avgOrderValue: 0 }\` regardless of how many valid purchase events are in the batch.

## What to Implement

- Locate the defect and fix it so **\`aggregateMetrics(rawEvents)\`** returns the correct statistics: \`totalRevenue\` (sum of purchase amounts, rounded to 2 decimal places), \`uniqueUsers\` (count of distinct purchasers), and \`avgOrderValue\` (revenue divided by purchase count, rounded to 2 decimal places, \`0\` when there are no purchases). The bug may be in any module; the tests call only \`aggregateMetrics\`.`;

const ANSWER = `**Bug: \`eventEnricher.js\`, \`enrichEvent\`:**

\`\`\`js
// Buggy: overwrites 'type', breaking all downstream purchase filters
return {
  ...event,
  category: 'commerce',
  type:     'processed_purchase',   // revenueAccumulator and userCounter filter for 'purchase'
};

// Fixed: add metadata without mutating 'type'
return {
  ...event,
  category: 'commerce',
  // 'type' stays as 'purchase', unchanged
};
\`\`\`

In a JS object literal, later keys override earlier ones. The spread \`...event\`
copies \`type: 'purchase'\`, but \`type: 'processed_purchase'\` defined afterward
overwrites it. Every purchase event exits \`enrichEvent\` with
\`type === 'processed_purchase'\`.

Both \`revenueAccumulator.js\` and \`userCounter.js\` filter with
\`e.type === 'purchase'\`. They find zero matches, so revenue, unique users,
and average order value are all 0.

The bug is in \`eventEnricher.js\`, but it's invisible from \`pipeline.js\`.
You have to trace the enriched array into \`revenueAccumulator.js\` and notice
that its purchase filter returns nothing, then work backwards to \`eventEnricher.js\`
to see why the \`type\` field changed after enrichment.`;

const FIXED_EVENT_ENRICHER = `/**
 * Enriches purchase events with commerce metadata.
 * Non-purchase events pass through unchanged.
 */
function enrichEvent(event) {
  if (event.type !== 'purchase') return event;
  return {
    ...event,
    category: 'commerce',
  };
}

module.exports = { enrichEvent };
`;

export const systemMetricsAggregator = {
  id:              'system-metrics-aggregator',
  type:            'systems-debug',
  title:           'Event Metrics Aggregator',
  difficulty:      'Hard',
  description:     'An analytics pipeline always returns zeros for revenue and unique users, even with a full stream of purchases. Trace through seven stages to find where purchase events lose their type identity.',
  durationMinutes: 35,
  tags:            ['multi-file', 'debugging', 'analytics'],

  testRunner: {
    language:     'javascript',
    entryFile:    'pipeline.js',
    functionName: 'aggregateMetrics',
    inputKeys:    ['events'],
  },

  parts: [
    {
      title:       'Find why purchase events disappear',
      readme:      README,
      answer:      ANSWER,
      answerFiles: { ...STARTER, 'eventEnricher.js': FIXED_EVENT_ENRICHER },
      starterFiles: STARTER,

      visibleTests: [
        {
          description: '2 purchases + 1 page_view: revenue and unique users from purchases only',
          input: {
            events: [
              { type: 'purchase',  userId: 'u1', amount: 80 },
              { type: 'purchase',  userId: 'u2', amount: 70 },
              { type: 'page_view', userId: 'u1' },
            ],
          },
          expectedOutput: { totalRevenue: 150, uniqueUsers: 2, avgOrderValue: 75 },
        },
        {
          description: '1 purchase with nulls and login events in the stream',
          input: {
            events: [
              null,
              { type: 'purchase', userId: 'u1', amount: 100 },
              { type: 'login',    userId: 'u2' },
              null,
            ],
          },
          expectedOutput: { totalRevenue: 100, uniqueUsers: 1, avgOrderValue: 100 },
        },
      ],

      hiddenTests: [
        {
          description: 'empty event stream',
          input: { events: [] },
          expectedOutput: { totalRevenue: 0, uniqueUsers: 0, avgOrderValue: 0 },
        },
        {
          description: 'no purchase events at all: all zeros',
          input: {
            events: [
              { type: 'login',     userId: 'u1' },
              { type: 'page_view', userId: 'u2' },
              { type: 'click',     userId: 'u3' },
            ],
          },
          expectedOutput: { totalRevenue: 0, uniqueUsers: 0, avgOrderValue: 0 },
        },
        {
          description: 'same user buys twice: uniqueUsers is 1, avg is per-order',
          input: {
            events: [
              { type: 'purchase',  userId: 'u1', amount: 60 },
              { type: 'purchase',  userId: 'u1', amount: 40 },
              { type: 'page_view', userId: 'u2' },
            ],
          },
          expectedOutput: { totalRevenue: 100, uniqueUsers: 1, avgOrderValue: 50 },
        },
        {
          description: '3 purchases across 3 users: avg is totalRevenue / 3',
          input: {
            events: [
              { type: 'purchase', userId: 'u1', amount: 90  },
              { type: 'purchase', userId: 'u2', amount: 60  },
              { type: 'purchase', userId: 'u3', amount: 120 },
              { type: 'click',    userId: 'u1' },
            ],
          },
          expectedOutput: { totalRevenue: 270, uniqueUsers: 3, avgOrderValue: 90 },
        },
        {
          description: 'malformed events (missing type or userId) are filtered out',
          input: {
            events: [
              { type: 'purchase', userId: 'u1', amount: 50 },
              { userId: 'u2', amount: 30 },
              { type: 'purchase',  amount: 20 },
              null,
            ],
          },
          expectedOutput: { totalRevenue: 50, uniqueUsers: 1, avgOrderValue: 50 },
        },
      ],
    },
  ],
};

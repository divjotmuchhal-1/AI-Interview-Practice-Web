// ─── Order Processing Pipeline ────────────────────────────────────────────────
// Inspired by: Amazon, Shopify, Stripe checkout service interviews

const STARTER = {
  'orderProcessor.js': `const { validateCart }    = require('./cartValidator');
const { checkInventory }  = require('./inventoryService');
const { computeSubtotal } = require('./pricingEngine');
const { applyDiscount }   = require('./discountService');
const { applyTax }        = require('./taxService');
const { buildReceipt }    = require('./receiptBuilder');

/**
 * Processes a customer order and returns a receipt.
 *
 * @param {Object} order
 * @param {Array<{id:string,name:string,price:number,qty:number}>} order.items
 * @param {string|null} order.couponCode
 * @param {number}      order.taxRate    e.g. 0.08 for 8%
 * @returns {{ approved: boolean, total: number, reason: string }}
 */
function processOrder(order) {
  const validation = validateCart(order);
  if (!validation.valid) {
    return { approved: false, total: 0, reason: validation.reason };
  }

  const stock = checkInventory(order.items);
  if (!stock.available) {
    return { approved: false, total: 0, reason: stock.reason };
  }

  const subtotal      = computeSubtotal(order.items);
  const afterDiscount = applyDiscount(subtotal, order.couponCode);
  const afterTax      = applyTax(afterDiscount, order.taxRate ?? 0);

  return buildReceipt(afterTax);
}

module.exports = { processOrder };
`,

  'cartValidator.js': `/**
 * Validates that the cart is non-empty and that every item has the required fields.
 * Returns { valid: boolean, reason: string }.
 */
function validateCart(order) {
  if (!order.items || order.items.length === 0) {
    return { valid: false, reason: 'Cart is empty' };
  }
  for (const item of order.items) {
    if (!item.id || !item.name) {
      return { valid: false, reason: 'Item missing required fields' };
    }
    if (typeof item.price !== 'number' || item.price <= 0) {
      return { valid: false, reason: \`Invalid price for '\${item.name}'\` };
    }
    if (!Number.isInteger(item.qty) || item.qty < 1) {
      return { valid: false, reason: \`Invalid quantity for '\${item.name}'\` };
    }
  }
  return { valid: true, reason: '' };
}

module.exports = { validateCart };
`,

  'inventoryService.js': `/**
 * Simulated inventory check.
 * Items with qty <= 10 are considered in stock; higher quantities are rejected.
 */
function checkInventory(items) {
  for (const item of items) {
    if (item.qty > 10) {
      return {
        available: false,
        reason: \`'\${item.name}' exceeds available stock (max 10 per order)\`,
      };
    }
  }
  return { available: true, reason: '' };
}

module.exports = { checkInventory };
`,

  'pricingEngine.js': `/**
 * Computes the order subtotal.
 * Each item's line total is its unit price multiplied by its quantity.
 */
function computeSubtotal(items) {
  return items.reduce((sum, item) => sum + item.price + item.qty, 0);
}

module.exports = { computeSubtotal };
`,

  'discountService.js': `const COUPON_TABLE = {
  SAVE10:  0.10,
  SAVE20:  0.20,
  HALFOFF: 0.50,
  VIP50:   0.50,
};

/**
 * Applies a coupon-code discount to the given amount.
 * Returns the amount unchanged if the code is absent or unrecognised.
 */
function applyDiscount(amount, couponCode) {
  if (!couponCode) return amount;
  const pct = COUPON_TABLE[couponCode.toUpperCase()] ?? 0;
  return amount * (1 - pct);
}

module.exports = { applyDiscount };
`,

  'taxService.js': `/**
 * Applies a tax rate and rounds the result to 2 decimal places.
 *
 * @param {number} amount   Pre-tax total
 * @param {number} taxRate  Decimal rate, e.g. 0.08 for 8%
 */
function applyTax(amount, taxRate) {
  return Math.round(amount * (1 + taxRate) * 100) / 100;
}

module.exports = { applyTax };
`,

  'receiptBuilder.js': `/**
 * Assembles the final receipt.
 * Rejects orders whose computed total is zero or negative.
 */
function buildReceipt(total) {
  if (total <= 0) {
    return { approved: false, total: 0, reason: 'Invalid order total' };
  }
  return { approved: true, total, reason: '' };
}

module.exports = { buildReceipt };
`,
};

const README = `# Order Processing Pipeline

## Background

\`processOrder(order)\` in \`orderProcessor.js\` runs a checkout service that validates, prices, and approves customer orders. \`order\` has \`items\` (an array of \`{ id, name, price, qty }\`), \`couponCode\` (string or null), and \`taxRate\` (decimal, e.g. \`0.08\` for 8%). It returns \`{ approved, total, reason }\`, where \`reason\` is an empty string for approved orders.

\`\`\`
orderProcessor.js   ← entry point; orchestrates the full checkout flow
cartValidator.js    ← validates cart structure and each item's required fields
inventoryService.js ← simulated stock availability check
pricingEngine.js    ← computes the order subtotal from line items
discountService.js  ← resolves and applies coupon codes
taxService.js       ← applies the regional tax rate and rounds to cents
receiptBuilder.js   ← assembles the final receipt object
\`\`\`

## Bug Report

Multi-quantity orders come back with incorrect totals. A cart with 5 widgets at $20 each should cost $100 but returns $25. Single-quantity orders are only slightly off, so simple smoke tests pass.

## What to Implement

- Locate the defect and fix it so **\`processOrder(order)\`** returns the correct \`{ approved, total, reason }\` for every order. The bug may be in any module; the tests call only \`processOrder\`.`;

const ANSWER = `**Bug: \`pricingEngine.js\`, \`computeSubtotal\`:**

\`\`\`js
// Buggy: adds price and quantity instead of multiplying
return items.reduce((sum, item) => sum + item.price + item.qty, 0);

// Fixed
return items.reduce((sum, item) => sum + item.price * item.qty, 0);
\`\`\`

Operator precedence makes this easy to miss: \`sum + item.price + item.qty\` evaluates
as \`(sum + item.price) + item.qty\`, treating price and qty as two separate addends
instead of computing a line total. For a single-quantity item the difference is small
(\`price + 1 ≈ price\`), so simple tests pass; any qty > 1 exposes the error.

The bug is in \`pricingEngine.js\`. You have to trace \`orderProcessor.js\`
→ \`computeSubtotal\` to find it. \`cartValidator.js\` and \`inventoryService.js\`
both pass without incident, directing attention toward the pricing layer.`;

const FIXED_PRICING_ENGINE = `/**
 * Computes the order subtotal.
 * Each item's line total is its unit price multiplied by its quantity.
 */
function computeSubtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

module.exports = { computeSubtotal };
`;

export const systemOrderPipeline = {
  id:              'system-order-pipeline',
  type:            'systems-debug',
  title:           'Order Processing Pipeline',
  difficulty:      'Medium',
  description:     'A checkout service produces wrong totals for multi-quantity orders. Trace across seven modules to locate the arithmetic bug buried in the pricing layer.',
  durationMinutes: 30,
  tags:            ['multi-file', 'debugging', 'arithmetic'],

  testRunner: {
    language:     'javascript',
    entryFile:    'orderProcessor.js',
    functionName: 'processOrder',
    inputKeys:    ['order'],
  },

  parts: [
    {
      title:       'Find the pricing bug',
      readme:      README,
      answer:      ANSWER,
      answerFiles: { ...STARTER, 'pricingEngine.js': FIXED_PRICING_ENGINE },
      starterFiles: STARTER,

      visibleTests: [
        {
          description: '5 widgets at $20, no discount, no tax',
          input: { order: { items: [{ id: 'W1', name: 'Widget', price: 20, qty: 5 }], couponCode: null, taxRate: 0 } },
          expectedOutput: { approved: true, total: 100, reason: '' },
        },
        {
          description: '3 books at $15, SAVE10 discount, 10% tax',
          input: { order: { items: [{ id: 'B1', name: 'Book', price: 15, qty: 3 }], couponCode: 'SAVE10', taxRate: 0.1 } },
          expectedOutput: { approved: true, total: 44.55, reason: '' },
        },
      ],

      hiddenTests: [
        {
          description: 'empty cart is rejected',
          input: { order: { items: [], couponCode: null, taxRate: 0 } },
          expectedOutput: { approved: false, total: 0, reason: 'Cart is empty' },
        },
        {
          description: '2 chairs at $200 with HALFOFF, no tax',
          input: { order: { items: [{ id: 'C1', name: 'Chair', price: 200, qty: 2 }], couponCode: 'HALFOFF', taxRate: 0 } },
          expectedOutput: { approved: true, total: 200, reason: '' },
        },
        {
          description: 'two line items: $100×2 and $25×4, no discount, 5% tax',
          input: {
            order: {
              items: [
                { id: 'A', name: 'Alpha', price: 100, qty: 2 },
                { id: 'B', name: 'Beta',  price: 25,  qty: 4 },
              ],
              couponCode: null,
              taxRate: 0.05,
            },
          },
          expectedOutput: { approved: true, total: 315, reason: '' },
        },
      ],
    },
  ],
};

// ─── Transaction Rules Engine ────────────────────────────────────────────────
// Inspired by: Stripe onsite AI Programming Exercise
// A multi-part rules engine problem. Each part adds one layer of complexity.

// ── Shared starter files (Part 1 baseline) ───────────────────────────────────

const STARTER_PART1 = {
  'src/parser.js': `/**
 * Parses a rule string into a structured object.
 *
 * Part 1 rule format:  ACTION if FIELD OPERATOR VALUE
 *   ACTION   : "ACCEPT" or "BLOCK"
 *   FIELD    : "amount" | "merchant" | "country"
 *   OPERATOR : "==" | "!=" | "<" | ">" | "<=" | ">="
 *   VALUE    : bare number (for amount) or double-quoted string
 *
 * @param {string} ruleStr
 * @returns {{ action: string, field: string, operator: string, value: string|number }}
 */
function parseRule(ruleStr) {
  // TODO: implement
}

module.exports = { parseRule };
`,

  'src/evaluator.js': `/**
 * Evaluates a parsed rule against a transaction.
 *
 * @param {{ action: string, field: string, operator: string, value: string|number }} rule
 * @param {{ id: string, amount: number, merchant: string, country: string }} transaction
 * @returns {boolean} true if the rule's condition is satisfied
 */
function matchesRule(rule, transaction) {
  // TODO: implement
}

module.exports = { matchesRule };
`,

  'solution.js': `const { parseRule } = require('./src/parser');
const { matchesRule } = require('./src/evaluator');

/**
 * Evaluates a list of rules against a transaction and returns the action
 * of the FIRST matching rule. If no rule matches, returns "ACCEPT".
 *
 * @param {{ id: string, amount: number, merchant: string, country: string }} transaction
 * @param {string[]} rules
 * @returns {"ACCEPT" | "BLOCK"}
 */
function processTransaction(transaction, rules) {
  // TODO: implement using parseRule + matchesRule
}

module.exports = { processTransaction };
`,

  'tests.js': `const { processTransaction } = require('./solution');

// Lightweight assertion helper
const assert = (condition, message) => {
  if (!condition) throw new Error(\`FAIL: \${message}\`);
  console.log(\`  PASS  \${message}\`);
};

console.log('\\n─── My Tests ───────────────────────────────────');

// Write your own tests here. Try to cover edge cases from the README.

assert(
  processTransaction(
    { id: 't1', amount: 500, merchant: 'ACME Corp', country: 'US' },
    ['BLOCK if merchant == "ACME Corp"']
  ) === 'BLOCK',
  'blocks when merchant matches'
);

console.log('\\n✓ All tests passed');
`,
};

// Part 2 starters: ship Part 1 reference impl so candidate focuses on AND
const STARTER_PART2 = {
  'src/parser.js': `/**
 * Parses a rule string.
 *
 * Part 2 extends Part 1: rules may now chain conditions with AND.
 *
 * Examples:
 *   "BLOCK if merchant == \\"ACME\\" AND amount > 1000"
 *   "ACCEPT if country == \\"US\\" AND amount < 5000"
 *
 * A rule without AND is still valid (single condition).
 *
 * @param {string} ruleStr
 * @returns {{ action: string, conditions: Array<{ field, operator, value }> }}
 */
function parseRule(ruleStr) {
  // Reference impl for Part 1 single-condition format:
  const [actionPart, conditionPart] = ruleStr.split(' if ');
  const action = actionPart.trim();

  // TODO: split conditionPart on ' AND ' and parse each condition
  // For Part 1 compatibility, handle the single-condition case too.
  const conditions = [parseSingleCondition(conditionPart.trim())];
  return { action, conditions };
}

function parseSingleCondition(str) {
  const match = str.match(/^(\\w+)\\s*(==|!=|<=|>=|<|>)\\s*(.+)$/);
  if (!match) throw new Error(\`Cannot parse condition: \${str}\`);
  const [, field, operator, rawValue] = match;
  const value = rawValue.startsWith('"')
    ? rawValue.slice(1, -1)
    : Number(rawValue);
  return { field, operator, value };
}

module.exports = { parseRule };
`,

  'src/evaluator.js': `/**
 * Evaluates a parsed rule (with possibly multiple AND conditions) against a transaction.
 *
 * For a rule to match, ALL conditions must be satisfied.
 *
 * @param {{ action: string, conditions: Array<{ field, operator, value }> }} rule
 * @param {{ id: string, amount: number, merchant: string, country: string }} transaction
 * @returns {boolean}
 */
function matchesRule(rule, transaction) {
  // TODO: implement. All conditions must hold (AND semantics)
}

function evaluateCondition(condition, transaction) {
  const txValue = transaction[condition.field];
  const ruleValue = condition.value;
  switch (condition.operator) {
    case '==': return txValue == ruleValue;
    case '!=': return txValue != ruleValue;
    case '<':  return txValue < ruleValue;
    case '>':  return txValue > ruleValue;
    case '<=': return txValue <= ruleValue;
    case '>=': return txValue >= ruleValue;
    default:   return false;
  }
}

module.exports = { matchesRule, evaluateCondition };
`,

  'solution.js': `const { parseRule } = require('./src/parser');
const { matchesRule } = require('./src/evaluator');

/**
 * Evaluates a list of rules against a transaction.
 * Returns the action of the FIRST matching rule, or "ACCEPT" by default.
 *
 * @param {{ id: string, amount: number, merchant: string, country: string }} transaction
 * @param {string[]} rules
 * @returns {"ACCEPT" | "BLOCK"}
 */
function processTransaction(transaction, rules) {
  for (const ruleStr of rules) {
    const rule = parseRule(ruleStr);
    if (matchesRule(rule, transaction)) return rule.action;
  }
  return 'ACCEPT';
}

module.exports = { processTransaction };
`,

  'tests.js': `const { processTransaction } = require('./solution');

const assert = (condition, message) => {
  if (!condition) throw new Error(\`FAIL: \${message}\`);
  console.log(\`  PASS  \${message}\`);
};

console.log('\\n─── My Tests ───────────────────────────────────');

// Add your Part 2 tests here. Focus on AND behavior.

assert(
  processTransaction(
    { id: 't1', amount: 1500, merchant: 'ACME Corp', country: 'US' },
    ['BLOCK if merchant == "ACME Corp" AND amount > 1000']
  ) === 'BLOCK',
  'AND rule: both conditions match → BLOCK'
);

console.log('\\n✓ All tests passed');
`,
};

// Part 3 starters: ship Part 2 reference impl, stubs for OR + precedence
const STARTER_PART3 = {
  'src/parser.js': `/**
 * Parses a rule string.
 *
 * Part 3: rules may use both AND and OR.
 * AND has higher precedence than OR (like * vs + in arithmetic):
 *   A OR B AND C  ≡  A OR (B AND C)
 *
 * Parsing strategy: split on ' OR ' first (lowest precedence),
 * then split each clause on ' AND '.
 *
 * Parentheses are NOT required in Part 3. Precedence rules are enough.
 *
 * @param {string} ruleStr
 * @returns {{ action: string, orClauses: Array<Array<{ field, operator, value }>> }}
 *   orClauses: array of AND-groups. Rule matches if ANY group fully matches.
 */
function parseRule(ruleStr) {
  const [actionPart, conditionPart] = ruleStr.split(' if ');
  const action = actionPart.trim();

  // TODO: split on ' OR ', then split each on ' AND ', parse each condition
  const orClauses = []; // fill this in
  return { action, orClauses };
}

function parseSingleCondition(str) {
  const match = str.match(/^(\\w+)\\s*(==|!=|<=|>=|<|>)\\s*(.+)$/);
  if (!match) throw new Error(\`Cannot parse condition: \${str}\`);
  const [, field, operator, rawValue] = match;
  const value = rawValue.startsWith('"') ? rawValue.slice(1, -1) : Number(rawValue);
  return { field, operator, value };
}

module.exports = { parseRule };
`,

  'src/evaluator.js': `/**
 * Evaluates a rule with OR + AND precedence against a transaction.
 *
 * The rule matches if ANY orClause fully matches (all conditions in the clause hold).
 *
 * @param {{ action: string, orClauses: Array<Array<{field, operator, value}>> }} rule
 * @param {{ id: string, amount: number, merchant: string, country: string }} transaction
 * @returns {boolean}
 */
function matchesRule(rule, transaction) {
  // TODO: any orClause where all conditions are satisfied → true
}

function evaluateCondition(condition, transaction) {
  const txValue = transaction[condition.field];
  const ruleValue = condition.value;
  switch (condition.operator) {
    case '==': return txValue == ruleValue;
    case '!=': return txValue != ruleValue;
    case '<':  return txValue < ruleValue;
    case '>':  return txValue > ruleValue;
    case '<=': return txValue <= ruleValue;
    case '>=': return txValue >= ruleValue;
    default:   return false;
  }
}

module.exports = { matchesRule, evaluateCondition };
`,

  'solution.js': `const { parseRule } = require('./src/parser');
const { matchesRule } = require('./src/evaluator');

function processTransaction(transaction, rules) {
  for (const ruleStr of rules) {
    const rule = parseRule(ruleStr);
    if (matchesRule(rule, transaction)) return rule.action;
  }
  return 'ACCEPT';
}

module.exports = { processTransaction };
`,

  'tests.js': `const { processTransaction } = require('./solution');

const assert = (condition, message) => {
  if (!condition) throw new Error(\`FAIL: \${message}\`);
  console.log(\`  PASS  \${message}\`);
};

console.log('\\n─── My Tests ───────────────────────────────────');

// Add Part 3 tests here. Focus on OR vs AND precedence.
// Key: A OR B AND C  ≡  A OR (B AND C), NOT  (A OR B) AND C

console.log('\\n✓ All tests passed');
`,
};

// ── README strings ────────────────────────────────────────────────────────────

const README_P1 = `# Transaction Rules Engine, Part 1: Basic Rule Matching

## Background

\`src/parser.js\` and \`src/evaluator.js\` implement a rule-based transaction evaluation engine. \`processTransaction(transaction, rules)\` takes a transaction object and an ordered list of rule strings, and returns the action of the first matching rule. If no rule matches, it returns \`"ACCEPT"\`. Each rule has the format \`ACTION if FIELD OPERATOR VALUE\`, where ACTION is \`ACCEPT\` or \`BLOCK\`, FIELD is \`amount\`, \`merchant\`, or \`country\`, and OPERATOR is one of \`==\`, \`!=\`, \`<\`, \`>\`, \`<=\`, \`>=\`.

## Bug Report

\`parseRule\`, \`matchesRule\`, and \`processTransaction\` are all unimplemented stubs. All calls to \`processTransaction\` return \`undefined\`.

## What to Implement

- **\`parseRule(ruleStr)\`** in \`src/parser.js\`: parse a rule string into \`{ action, field, operator, value }\`.
- **\`matchesRule(rule, transaction)\`** in \`src/evaluator.js\`: return \`true\` if the transaction satisfies the rule's condition.
- **\`processTransaction(transaction, rules)\`** in \`solution.js\`: evaluate rules in order and return the first matching action, or \`"ACCEPT"\` if none match.

## Notes

- Numeric values are bare integers or decimals; string values are double-quoted in the rule string.
- String comparisons are case-sensitive.
`;

const README_P2 = `# Transaction Rules Engine, Part 2: AND Conditions

## Background

\`src/parser.js\` and \`src/evaluator.js\` implement a transaction rules engine. Part 1 is complete. Part 2 extends the rule format to allow multiple conditions joined by \`AND\`: \`ACTION if COND AND COND AND ...\`. A rule matches only if all its conditions are satisfied. Single-condition rules from Part 1 remain valid.

## Bug Report

The parser and evaluator only handle single-condition rules. Rules containing \`AND\` are parsed incorrectly or only the first condition is evaluated, causing multi-condition rules to never match as intended.

## What to Implement

- **\`parseRule(ruleStr)\`** in \`src/parser.js\`: split the condition portion on \`' AND '\` and parse each sub-condition independently, storing them as a list.
- **\`matchesRule(rule, transaction)\`** in \`src/evaluator.js\`: return \`true\` only if all conditions in the rule are satisfied.

## Notes

- \`AND\` tokens are always surrounded by single spaces.
`;

const README_P3 = `# Transaction Rules Engine, Part 3: OR and Precedence

## Background

\`src/parser.js\` and \`src/evaluator.js\` implement a transaction rules engine. Parts 1 and 2 are complete. Part 3 adds \`OR\`: rules now have the form \`ACTION if CLAUSE OR CLAUSE OR ...\`, where each \`CLAUSE\` is one or more conditions joined by \`AND\`. Standard boolean precedence applies: \`AND\` binds more tightly than \`OR\`, so \`A OR B AND C\` is parsed as \`A OR (B AND C)\`.

## Bug Report

The parser and evaluator do not handle \`OR\`. Rules containing \`OR\` either crash, evaluate only the first clause, or return incorrect results when later clauses would have matched.

## What to Implement

- **\`parseRule(ruleStr)\`** in \`src/parser.js\`: split the condition portion on \`' OR '\` to get clauses, then split each clause on \`' AND '\` to get individual conditions, producing an array of AND-clause arrays.
- **\`matchesRule(rule, transaction)\`** in \`src/evaluator.js\`: return \`true\` if at least one OR-clause is fully satisfied (all its conditions match).

## Notes

- \`AND\` and \`OR\` tokens are always surrounded by single spaces. No parentheses appear in rules.
`;

// ── Visible tests ─────────────────────────────────────────────────────────────

const VIS_P1 = [
  { id: 'v1', description: 'blocks when merchant matches exactly',
    input: { transaction: { id: 't1', amount: 500, merchant: 'ACME Corp', country: 'US' }, rules: ['BLOCK if merchant == "ACME Corp"'] }, expectedOutput: 'BLOCK' },
  { id: 'v2', description: 'accepts when merchant does not match',
    input: { transaction: { id: 't2', amount: 500, merchant: 'Walmart', country: 'US' }, rules: ['BLOCK if merchant == "ACME Corp"'] }, expectedOutput: 'ACCEPT' },
  { id: 'v3', description: 'first matching rule wins (BLOCK before ACCEPT)',
    input: { transaction: { id: 't3', amount: 500, merchant: 'ACME Corp', country: 'US' }, rules: ['BLOCK if merchant == "ACME Corp"', 'ACCEPT if amount < 100000'] }, expectedOutput: 'BLOCK' },
  { id: 'v4', description: 'defaults to ACCEPT when no rules match',
    input: { transaction: { id: 't4', amount: 200000, merchant: 'Walmart', country: 'US' }, rules: ['BLOCK if amount < 100000'] }, expectedOutput: 'ACCEPT' },
  { id: 'v5', description: 'blocks on country code match',
    input: { transaction: { id: 't5', amount: 100, merchant: 'ShopKP', country: 'KP' }, rules: ['BLOCK if country == "KP"'] }, expectedOutput: 'BLOCK' },
  { id: 'v6', description: 'empty rules list defaults to ACCEPT',
    input: { transaction: { id: 't6', amount: 999, merchant: 'Anyone', country: 'US' }, rules: [] }, expectedOutput: 'ACCEPT' },
];

const HID_P1 = [
  { id: 'h1', description: 'amount greater-than comparison',
    input: { transaction: { id: 'h1', amount: 150000, merchant: 'BigCo', country: 'US' }, rules: ['BLOCK if amount > 100000'] }, expectedOutput: 'BLOCK' },
  { id: 'h2', description: 'amount less-than-or-equal',
    input: { transaction: { id: 'h2', amount: 1000, merchant: 'SmallCo', country: 'CA' }, rules: ['ACCEPT if amount <= 1000'] }, expectedOutput: 'ACCEPT' },
  { id: 'h3', description: 'amount exactly at boundary (not less than)',
    input: { transaction: { id: 'h3', amount: 1000, merchant: 'Co', country: 'US' }, rules: ['BLOCK if amount < 1000'] }, expectedOutput: 'ACCEPT' },
  { id: 'h4', description: 'inequality operator on country',
    input: { transaction: { id: 'h4', amount: 500, merchant: 'FrenchCo', country: 'FR' }, rules: ['BLOCK if country != "US"'] }, expectedOutput: 'BLOCK' },
  { id: 'h5', description: 'second rule matches after first misses',
    input: { transaction: { id: 'h5', amount: 300, merchant: 'TrustCo', country: 'US' }, rules: ['BLOCK if merchant == "ACME Corp"', 'BLOCK if amount < 500'] }, expectedOutput: 'BLOCK' },
  { id: 'h6', description: 'merchant string comparison is case-sensitive',
    input: { transaction: { id: 'h6', amount: 100, merchant: 'acme corp', country: 'US' }, rules: ['BLOCK if merchant == "ACME Corp"'] }, expectedOutput: 'ACCEPT' },
  { id: 'h7', description: 'ACCEPT rule can appear before BLOCK',
    input: { transaction: { id: 'h7', amount: 100, merchant: 'Trusted', country: 'US' }, rules: ['ACCEPT if merchant == "Trusted"', 'BLOCK if amount > 50'] }, expectedOutput: 'ACCEPT' },
];

const VIS_P2 = [
  { id: 'v1', description: 'AND rule blocks when both conditions match',
    input: { transaction: { id: 't1', amount: 1500, merchant: 'ACME Corp', country: 'US' }, rules: ['BLOCK if merchant == "ACME Corp" AND amount > 1000'] }, expectedOutput: 'BLOCK' },
  { id: 'v2', description: 'AND rule does not match when second condition fails',
    input: { transaction: { id: 't2', amount: 500, merchant: 'ACME Corp', country: 'US' }, rules: ['BLOCK if merchant == "ACME Corp" AND amount > 1000'] }, expectedOutput: 'ACCEPT' },
  { id: 'v3', description: 'AND rule does not match when first condition fails',
    input: { transaction: { id: 't3', amount: 1500, merchant: 'Walmart', country: 'US' }, rules: ['BLOCK if merchant == "ACME Corp" AND amount > 1000'] }, expectedOutput: 'ACCEPT' },
  { id: 'v4', description: 'single-condition rule still works (Part 1 compat)',
    input: { transaction: { id: 't4', amount: 50, merchant: 'Co', country: 'KP' }, rules: ['BLOCK if country == "KP"'] }, expectedOutput: 'BLOCK' },
  { id: 'v5', description: 'first matching AND rule wins',
    input: { transaction: { id: 't5', amount: 2000, merchant: 'ACME Corp', country: 'US' }, rules: ['BLOCK if merchant == "ACME Corp" AND amount > 1000', 'ACCEPT if country == "US"'] }, expectedOutput: 'BLOCK' },
];

const HID_P2 = [
  { id: 'h1', description: 'three-condition AND: all match → BLOCK',
    input: { transaction: { id: 'h1', amount: 5000, merchant: 'ACME Corp', country: 'KP' }, rules: ['BLOCK if merchant == "ACME Corp" AND amount > 1000 AND country == "KP"'] }, expectedOutput: 'BLOCK' },
  { id: 'h2', description: 'three-condition AND: one fails → no match',
    input: { transaction: { id: 'h2', amount: 5000, merchant: 'ACME Corp', country: 'US' }, rules: ['BLOCK if merchant == "ACME Corp" AND amount > 1000 AND country == "KP"'] }, expectedOutput: 'ACCEPT' },
  { id: 'h3', description: 'second rule with AND matches after first misses',
    input: { transaction: { id: 'h3', amount: 2000, merchant: 'Walmart', country: 'US' }, rules: ['BLOCK if merchant == "ACME Corp" AND amount > 1000', 'BLOCK if country == "US" AND amount > 1500'] }, expectedOutput: 'BLOCK' },
  { id: 'h4', description: 'AND rule: numeric and string conditions together',
    input: { transaction: { id: 'h4', amount: 999, merchant: 'RiskyMerch', country: 'RU' }, rules: ['BLOCK if country == "RU" AND amount >= 999'] }, expectedOutput: 'BLOCK' },
  { id: 'h5', description: 'ACCEPT AND rule matches, overrides default',
    input: { transaction: { id: 'h5', amount: 50, merchant: 'Stripe Press', country: 'US' }, rules: ['ACCEPT if merchant == "Stripe Press" AND amount < 100', 'BLOCK if country == "US"'] }, expectedOutput: 'ACCEPT' },
];

const VIS_P3 = [
  { id: 'v1', description: 'OR rule matches when first clause is true',
    input: { transaction: { id: 't1', amount: 50, merchant: 'Co', country: 'KP' }, rules: ['BLOCK if country == "KP" OR country == "IR"'] }, expectedOutput: 'BLOCK' },
  { id: 'v2', description: 'OR rule matches when second clause is true',
    input: { transaction: { id: 't2', amount: 50, merchant: 'Co', country: 'IR' }, rules: ['BLOCK if country == "KP" OR country == "IR"'] }, expectedOutput: 'BLOCK' },
  { id: 'v3', description: 'OR rule does not match when neither clause is true',
    input: { transaction: { id: 't3', amount: 50, merchant: 'Co', country: 'US' }, rules: ['BLOCK if country == "KP" OR country == "IR"'] }, expectedOutput: 'ACCEPT' },
  { id: 'v4', description: 'AND beats OR: A OR B AND C = A OR (B AND C)',
    // Rule: BLOCK if country=="KP" OR merchant=="ACME" AND amount>1000
    // tx: country=US, merchant=ACME, amount=500 → clause1=false, clause2=false → ACCEPT
    input: { transaction: { id: 't4', amount: 500, merchant: 'ACME', country: 'US' }, rules: ['BLOCK if country == "KP" OR merchant == "ACME" AND amount > 1000'] }, expectedOutput: 'ACCEPT' },
  { id: 'v5', description: 'AND beats OR: first clause alone is enough',
    // Rule: BLOCK if country=="KP" OR merchant=="ACME" AND amount>1000
    // tx: country=KP, merchant=Safe, amount=1 → clause1=true → BLOCK
    input: { transaction: { id: 't5', amount: 1, merchant: 'Safe', country: 'KP' }, rules: ['BLOCK if country == "KP" OR merchant == "ACME" AND amount > 1000'] }, expectedOutput: 'BLOCK' },
];

const HID_P3 = [
  { id: 'h1', description: 'three OR clauses, third matches',
    input: { transaction: { id: 'h1', amount: 50, merchant: 'Co', country: 'CU' }, rules: ['BLOCK if country == "KP" OR country == "IR" OR country == "CU"'] }, expectedOutput: 'BLOCK' },
  { id: 'h2', description: 'AND within second OR clause matches',
    // Rule: BLOCK if country=="KP" OR merchant=="ACME" AND amount>1000
    // tx: country=US, merchant=ACME, amount=5000 → clause2 matches
    input: { transaction: { id: 'h2', amount: 5000, merchant: 'ACME', country: 'US' }, rules: ['BLOCK if country == "KP" OR merchant == "ACME" AND amount > 1000'] }, expectedOutput: 'BLOCK' },
  { id: 'h3', description: 'Part 2 AND-only rule still works in Part 3',
    input: { transaction: { id: 'h3', amount: 2000, merchant: 'ACME Corp', country: 'US' }, rules: ['BLOCK if merchant == "ACME Corp" AND amount > 1000'] }, expectedOutput: 'BLOCK' },
  { id: 'h4', description: 'multiple OR rules, first rule matches via second clause',
    input: { transaction: { id: 'h4', amount: 50, merchant: 'Safe', country: 'KP' }, rules: ['BLOCK if merchant == "ACME" OR country == "KP"', 'ACCEPT if amount < 100'] }, expectedOutput: 'BLOCK' },
  { id: 'h5', description: 'precedence: left OR grouping is wrong. Verify AND binds tighter',
    // Rule: BLOCK if merchant=="ACME" AND amount<100 OR country=="US"
    // Correct (AND first): (merchant=="ACME" AND amount<100) OR (country=="US")
    // tx: merchant=Safe, amount=50, country=US → clause1=false, clause2=true → BLOCK
    input: { transaction: { id: 'h5', amount: 50, merchant: 'Safe', country: 'US' }, rules: ['BLOCK if merchant == "ACME" AND amount < 100 OR country == "US"'] }, expectedOutput: 'BLOCK' },
  { id: 'h6', description: 'precedence: wrong grouping would give different result',
    // (merchant=="ACME" AND amount<100) OR country=="US" with tx: merchant=ACME, amount=200, country=DE
    // clause1=false (amount>=100), clause2=false → ACCEPT
    // Wrong: (merchant=="ACME" AND amount<100 OR country)==... doesn't parse meaningfully, but naive left-to-right AND/OR would give different result
    input: { transaction: { id: 'h6', amount: 200, merchant: 'ACME', country: 'DE' }, rules: ['BLOCK if merchant == "ACME" AND amount < 100 OR country == "US"'] }, expectedOutput: 'ACCEPT' },
];

// ── Exported scenario ─────────────────────────────────────────────────────────

export const transactionRulesEngine = {
  id: 'transaction-rules-engine',
  title: 'Transaction Rules Engine',
  difficulty: 'Medium',
  durationMinutes: 30,
  tags: ['parsing', 'string matching', 'boolean logic'],
  description:
    'Build a fraud-rule evaluation engine for a payments platform. Parse structured rule strings and decide whether to accept or block transactions. Three parts: basic matching → AND logic → OR with precedence.',
  parts: [
    {
      id: 'part-1', number: 1, title: 'Basic Rule Matching',
      readme: README_P1, starterFiles: STARTER_PART1,
      visibleTests: VIS_P1, hiddenTests: HID_P1,
      trap: 'First-match-wins, not last-match-wins. If two rules both match, only the first one\'s action is returned. Many AIs scan all rules and return the last match, or assume BLOCK always overrides ACCEPT.',
      edgeCases: ['Empty rules list → ACCEPT', 'No rules match → ACCEPT', 'String comparison is case-sensitive', 'Amount boundary: < vs <=', 'ACCEPT rule appears before BLOCK rule and matches first'],
      answer: {
        fixedCode: `// ── src/parser.js ───────────────────────────────────────────────────────────
function parseRule(ruleStr) {
  const [actionPart, conditionPart] = ruleStr.split(' if ');
  const action = actionPart.trim();
  const condStr = conditionPart.trim();
  const match = condStr.match(/^(\\w+)\\s*(==|!=|<=|>=|<|>)\\s*(.+)$/);
  if (!match) throw new Error('Cannot parse condition: ' + condStr);
  const [, field, operator, rawValue] = match;
  const value = rawValue.startsWith('"') ? rawValue.slice(1, -1) : Number(rawValue);
  return { action, field, operator, value };
}

module.exports = { parseRule };

// ── src/evaluator.js ──────────────────────────────────────────────────────────
function matchesRule(rule, transaction) {
  const txValue = transaction[rule.field];
  switch (rule.operator) {
    case '==': return txValue === rule.value;
    case '!=': return txValue !== rule.value;
    case '<':  return txValue < rule.value;
    case '>':  return txValue > rule.value;
    case '<=': return txValue <= rule.value;
    case '>=': return txValue >= rule.value;
    default:   return false;
  }
}

module.exports = { matchesRule };

// ── solution.js ───────────────────────────────────────────────────────────────
const { parseRule } = require('./src/parser');
const { matchesRule } = require('./src/evaluator');

function processTransaction(transaction, rules) {
  for (const ruleStr of rules) {
    const rule = parseRule(ruleStr);
    if (matchesRule(rule, transaction)) return rule.action;
  }
  return 'ACCEPT'; // default when no rule matches
}

module.exports = { processTransaction };`,
        explanation: 'Three files to implement. parseRule: split on " if " to get action and condition, then regex-match the condition into (field, operator, rawValue). Strip quotes from string values; convert bare numbers with Number(). matchesRule: look up the transaction field, switch on the operator with strict equality (=== not ==). processTransaction: iterate rules in order, return the first matching rule\'s action. First-match-wins means ACCEPT rules can appear before BLOCK rules and win. Default is ACCEPT when nothing matches.',
      },
    },
    {
      id: 'part-2', number: 2, title: 'AND Conditions',
      readme: README_P2, starterFiles: STARTER_PART2,
      visibleTests: VIS_P2, hiddenTests: HID_P2,
      trap: 'ALL conditions must match for an AND rule to fire, not just one. AIs sometimes implement "any condition matches" (OR semantics) when they see multiple conditions.',
      edgeCases: ['Three-condition AND: all must hold', 'Single-condition rules still work (Part 1 compat)', 'First AND rule matches, skips later rules', 'ACCEPT AND rule can win over a later BLOCK rule'],
      answer: {
        fixedCode: `// ── src/parser.js ───────────────────────────────────────────────────────────
function parseRule(ruleStr) {
  const [actionPart, conditionPart] = ruleStr.split(' if ');
  const action = actionPart.trim();
  // Split on ' AND ' to get individual conditions
  const conditions = conditionPart.trim().split(' AND ').map(parseSingleCondition);
  return { action, conditions };
}

function parseSingleCondition(str) {
  const match = str.trim().match(/^(\\w+)\\s*(==|!=|<=|>=|<|>)\\s*(.+)$/);
  if (!match) throw new Error('Cannot parse condition: ' + str);
  const [, field, operator, rawValue] = match;
  const value = rawValue.startsWith('"') ? rawValue.slice(1, -1) : Number(rawValue);
  return { field, operator, value };
}

module.exports = { parseRule };

// ── src/evaluator.js ──────────────────────────────────────────────────────────
function matchesRule(rule, transaction) {
  // ALL conditions must be satisfied
  return rule.conditions.every(c => evaluateCondition(c, transaction));
}

function evaluateCondition(condition, transaction) {
  const txValue = transaction[condition.field];
  const rv = condition.value;
  switch (condition.operator) {
    case '==': return txValue === rv;
    case '!=': return txValue !== rv;
    case '<':  return txValue < rv;
    case '>':  return txValue > rv;
    case '<=': return txValue <= rv;
    case '>=': return txValue >= rv;
    default:   return false;
  }
}

module.exports = { matchesRule, evaluateCondition };`,
        explanation: 'parseRule now splits the condition portion on " AND " (with spaces) before passing each piece to parseSingleCondition. This handles both single-condition rules (the split produces a one-element array) and multi-condition rules. matchesRule uses .every() so all conditions must hold; if any one fails, the rule does not fire. solution.js from Part 1 is unchanged. It still calls parseRule and matchesRule in a first-match-wins loop.',
      },
    },
    {
      id: 'part-3', number: 3, title: 'OR and Precedence',
      readme: README_P3, starterFiles: STARTER_PART3,
      visibleTests: VIS_P3, hiddenTests: HID_P3,
      trap: 'AND binds tighter than OR: "A OR B AND C" is "A OR (B AND C)", not "(A OR B) AND C". AIs that parse left-to-right without considering precedence will fail the precedence test cases.',
      edgeCases: ['AND-only rule still works (Part 2 compat)', 'Three OR clauses', 'Mix of AND clauses and single conditions across OR', 'Precedence: left clause of OR is pure condition, right clause is AND group'],
      answer: {
        fixedCode: `// ── src/parser.js ───────────────────────────────────────────────────────────
function parseRule(ruleStr) {
  const [actionPart, conditionPart] = ruleStr.split(' if ');
  const action = actionPart.trim();
  // Split on ' OR ' first (lowest precedence), then each clause on ' AND '
  const orClauses = conditionPart.trim()
    .split(' OR ')
    .map(clause => clause.trim().split(' AND ').map(parseSingleCondition));
  return { action, orClauses };
}

function parseSingleCondition(str) {
  const match = str.trim().match(/^(\\w+)\\s*(==|!=|<=|>=|<|>)\\s*(.+)$/);
  if (!match) throw new Error('Cannot parse condition: ' + str);
  const [, field, operator, rawValue] = match;
  const value = rawValue.startsWith('"') ? rawValue.slice(1, -1) : Number(rawValue);
  return { field, operator, value };
}

module.exports = { parseRule };

// ── src/evaluator.js ──────────────────────────────────────────────────────────
function matchesRule(rule, transaction) {
  // ANY OR-clause where ALL conditions hold → match
  return rule.orClauses.some(clause =>
    clause.every(c => evaluateCondition(c, transaction))
  );
}

function evaluateCondition(condition, transaction) {
  const txValue = transaction[condition.field];
  const rv = condition.value;
  switch (condition.operator) {
    case '==': return txValue === rv;
    case '!=': return txValue !== rv;
    case '<':  return txValue < rv;
    case '>':  return txValue > rv;
    case '<=': return txValue <= rv;
    case '>=': return txValue >= rv;
    default:   return false;
  }
}

module.exports = { matchesRule, evaluateCondition };`,
        explanation: 'Precedence is enforced by the order of splits: split on " OR " first (outer), then each piece on " AND " (inner). This naturally implements AND-binds-tighter-than-OR without any special lookahead. Example: "A OR B AND C" → split on OR gives ["A", "B AND C"] → split each on AND gives [["A"], ["B", "C"]], exactly the correct parse tree. matchesRule uses .some()/.every() to evaluate: any AND-group that fully holds fires the rule.',
      },
    },
  ],
  testRunner: {
    entryFile: 'solution.js',
    functionName: 'processTransaction',
    inputKeys: ['transaction', 'rules'],
  },
};

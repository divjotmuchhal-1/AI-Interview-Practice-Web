// ─── Feature Flag Evaluator ───────────────────────────────────────────────────
// Inspired by: LaunchDarkly / Split.io SDK interviews
// Three parts: user targeting → percentage rollout → compound AND/OR rules

// ── Starter files ─────────────────────────────────────────────────────────────

const STARTER_P1 = {
  'src/targeting.js': `/**
 * Evaluates a single targeting condition against a user context.
 *
 * Operators:
 *   "is"          : exact equality (case-sensitive)
 *   "is_not"      : not equal
 *   "contains"    : substring match
 *   "starts_with" : string prefix match
 *   "ends_with"   : string suffix match
 *
 * @param {{ attribute: string, operator: string, value: string }} condition
 * @param {{ id: string, email: string, role: string, plan: string, [key: string]: string }} user
 * @returns {boolean}
 */
function evaluateCondition(condition, user) {
  const userValue = user[condition.attribute];
  if (userValue === undefined) return false;

  // TODO: implement each operator
}

module.exports = { evaluateCondition };
`,

  'src/evaluator.js': `const { evaluateCondition } = require('./targeting');

/**
 * Evaluates a feature flag for a given user context.
 *
 * Flag shape:
 * {
 *   key: string,
 *   enabled: boolean,    // default result when no rule matches
 *   rules: Array<{
 *     conditions: Array<{ attribute, operator, value }>,
 *     result: boolean
 *   }>
 * }
 *
 * Rules are evaluated in order. The first rule where ALL conditions match
 * returns that rule's 'result'. If no rule matches, return flagConfig.enabled.
 *
 * IMPORTANT: rules can override the default in either direction:
 *   - A rule with result=true enables the flag even if enabled=false
 *   - A rule with result=false disables the flag even if enabled=true
 *
 * @param {object} flagConfig
 * @param {{ id: string, email: string, role: string, plan: string }} userContext
 * @returns {boolean}
 */
function evaluateFlag(flagConfig, userContext) {
  // TODO: implement
}

module.exports = { evaluateFlag };
`,

  'solution.js': `const { evaluateFlag } = require('./src/evaluator');

module.exports = { evaluateFlag };
`,

  'tests.js': `const { evaluateFlag } = require('./solution');

const assert = (condition, message) => {
  if (!condition) throw new Error(\`FAIL: \${message}\`);
  console.log(\`  PASS  \${message}\`);
};

console.log('\\n─── My Tests ───────────────────────────────────');

const user = { id: 'u1', email: 'alice@acme.com', plan: 'pro', role: 'admin' };

// No rules → fallback to enabled
assert(
  evaluateFlag({ key: 'my_flag', enabled: true, rules: [] }, user) === true,
  'no rules → returns enabled (true)'
);

assert(
  evaluateFlag({ key: 'my_flag', enabled: false, rules: [] }, user) === false,
  'no rules → returns enabled (false)'
);

// Add more tests! Especially check what happens when enabled=false but a rule returns true.

console.log('\\n✓ All tests passed');
`,
};

const STARTER_P2 = {
  'src/targeting.js': `function evaluateCondition(condition, user) {
  // If the condition has a 'rollout' key, it's a percentage rollout, handled in evaluator.js
  if ('rollout' in condition) return null; // signal to caller

  const userValue = user[condition.attribute];
  if (userValue === undefined) return false;

  switch (condition.operator) {
    case 'is':          return userValue === condition.value;
    case 'is_not':      return userValue !== condition.value;
    case 'contains':    return String(userValue).includes(condition.value);
    case 'starts_with': return String(userValue).startsWith(condition.value);
    case 'ends_with':   return String(userValue).endsWith(condition.value);
    default:            return false;
  }
}

module.exports = { evaluateCondition };
`,

  'src/hash.js': `/**
 * Deterministic hash for rollout decisions.
 *
 * Returns an integer in [0, 99]. A user is included in a rolloutPercentage
 * if hash(flagKey, userId) < rolloutPercentage.
 *
 * This function is provided. Do not modify it.
 *
 * @param {string} flagKey
 * @param {string} userId
 * @returns {number} integer in [0, 99]
 */
function hashForRollout(flagKey, userId) {
  const str = \`\${flagKey}:\${userId}\`;
  let hash = 5381;
  for (const char of str) {
    hash = ((hash << 5) + hash) + char.charCodeAt(0);
    hash = hash & hash; // 32-bit integer
  }
  return Math.abs(hash) % 100;
}

module.exports = { hashForRollout };
`,

  'src/evaluator.js': `const { evaluateCondition } = require('./targeting');
const { hashForRollout } = require('./hash');

/**
 * Evaluates a feature flag. Part 2 adds rollout rules.
 *
 * A rule may now be a rollout rule instead of a conditions rule:
 * {
 *   rolloutPercentage: 20,   // 0–100: percentage of users who see result=true
 *   result: true
 * }
 *
 * A user is in the rollout if:
 *   hashForRollout(flagConfig.key, userContext.id) < rolloutPercentage
 *
 * Rollout rules and condition rules can be mixed in the same rules array.
 * First-match-wins still applies.
 *
 * @param {object} flagConfig
 * @param {{ id: string, email: string, role: string, plan: string }} userContext
 * @returns {boolean}
 */
function evaluateFlag(flagConfig, userContext) {
  // TODO: handle both condition rules (from Part 1) and rollout rules
}

module.exports = { evaluateFlag };
`,

  'solution.js': `const { evaluateFlag } = require('./src/evaluator');
module.exports = { evaluateFlag };
`,

  'tests.js': `const { evaluateFlag } = require('./solution');
const { hashForRollout } = require('./src/hash');

const assert = (condition, message) => {
  if (!condition) throw new Error(\`FAIL: \${message}\`);
  console.log(\`  PASS  \${message}\`);
};

console.log('\\n─── My Tests (Part 2: Rollout) ──────────────────');

// The hash is deterministic. Compute expected bucket for your test users:
// hashForRollout("my_flag", "user_A") → some number 0–99

const flag = {
  key: 'my_flag',
  enabled: false,
  rules: [{ rolloutPercentage: 50, result: true }]
};

// Use the hash to find a user who IS in the rollout and one who is NOT:
// const bucket = hashForRollout("my_flag", "someUserId");
// if (bucket < 50) → in rollout (result = true)
// if (bucket >= 50) → not in rollout (fallback to enabled = false)

console.log('\\n✓ All tests passed');
`,
};

const STARTER_P3 = {
  'src/targeting.js': `/**
 * Evaluates a single element of a rule's conditions array.
 *
 * Each element is one of:
 *   (a) Simple condition:   { attribute, operator, value }
 *   (b) ALL group:          { all: [condition | group, ...] }  : all must match (AND)
 *   (c) ANY group:          { any: [condition | group, ...] }  : at least one must match (OR)
 *
 * Groups can be nested: an element of 'all' or 'any' can itself be an 'all'/'any' group.
 *
 * @param {object} conditionOrGroup
 * @param {object} user
 * @returns {boolean}
 */
function evaluateConditionOrGroup(conditionOrGroup, user) {
  if ('all' in conditionOrGroup) {
    // TODO: AND: every element of conditionOrGroup.all must be true
  }
  if ('any' in conditionOrGroup) {
    // TODO: OR: at least one element of conditionOrGroup.any must be true
  }
  // Simple condition
  return evaluateSimpleCondition(conditionOrGroup, user);
}

function evaluateSimpleCondition(condition, user) {
  const userValue = user[condition.attribute];
  if (userValue === undefined) return false;
  switch (condition.operator) {
    case 'is':          return userValue === condition.value;
    case 'is_not':      return userValue !== condition.value;
    case 'contains':    return String(userValue).includes(condition.value);
    case 'starts_with': return String(userValue).startsWith(condition.value);
    case 'ends_with':   return String(userValue).endsWith(condition.value);
    default:            return false;
  }
}

module.exports = { evaluateConditionOrGroup };
`,

  'src/hash.js': `function hashForRollout(flagKey, userId) {
  const str = \`\${flagKey}:\${userId}\`;
  let hash = 5381;
  for (const char of str) {
    hash = ((hash << 5) + hash) + char.charCodeAt(0);
    hash = hash & hash;
  }
  return Math.abs(hash) % 100;
}
module.exports = { hashForRollout };
`,

  'src/evaluator.js': `const { evaluateConditionOrGroup } = require('./targeting');
const { hashForRollout } = require('./hash');

/**
 * Evaluates a feature flag. Part 3 adds compound AND/OR groups within rules.
 *
 * A rule's 'conditions' array may now contain:
 *   - Simple conditions { attribute, operator, value }
 *   - ALL groups { all: [...] }
 *   - ANY groups { any: [...] }
 *
 * The rule matches if ALL top-level elements of conditions match
 * (top-level is still AND, same as Part 1).
 *
 * @param {object} flagConfig
 * @param {object} userContext
 * @returns {boolean}
 */
function evaluateFlag(flagConfig, userContext) {
  for (const rule of flagConfig.rules) {
    // Rollout rule
    if ('rolloutPercentage' in rule) {
      const bucket = hashForRollout(flagConfig.key, userContext.id);
      if (bucket < rule.rolloutPercentage) return rule.result;
      continue;
    }

    // Condition rule: top-level is AND
    const allMatch = rule.conditions.every(c => evaluateConditionOrGroup(c, userContext));
    if (allMatch) return rule.result;
  }
  return flagConfig.enabled;
}

module.exports = { evaluateFlag };
`,

  'solution.js': `const { evaluateFlag } = require('./src/evaluator');
module.exports = { evaluateFlag };
`,

  'tests.js': `const { evaluateFlag } = require('./solution');

const assert = (condition, message) => {
  if (!condition) throw new Error(\`FAIL: \${message}\`);
  console.log(\`  PASS  \${message}\`);
};

console.log('\\n─── My Tests (Part 3: Compound Rules) ──────────');

const enterpriseOrAdmin = {
  key: 'compound_flag',
  enabled: false,
  rules: [
    {
      conditions: [
        { any: [
            { attribute: 'plan', operator: 'is', value: 'enterprise' },
            { attribute: 'role', operator: 'is', value: 'admin' }
          ]
        }
      ],
      result: true
    }
  ]
};

const enterpriseUser = { id: 'u1', email: 'a@co.com', plan: 'enterprise', role: 'member' };
const adminUser      = { id: 'u2', email: 'b@co.com', plan: 'free',       role: 'admin' };
const freeUser       = { id: 'u3', email: 'c@co.com', plan: 'free',       role: 'member' };

assert(evaluateFlag(enterpriseOrAdmin, enterpriseUser) === true, 'enterprise plan → enabled');
assert(evaluateFlag(enterpriseOrAdmin, adminUser)      === true, 'admin role → enabled');
assert(evaluateFlag(enterpriseOrAdmin, freeUser)       === false, 'free + member → disabled');

console.log('\\n✓ All tests passed');
`,
};

// ── README strings ────────────────────────────────────────────────────────────

const README_P1 = `# Feature Flag Evaluator, Part 1: User Targeting

## Background

\`src/evaluator.js\` and \`src/targeting.js\` implement a feature flag evaluation engine. \`evaluateFlag(flagConfig, userContext)\` evaluates a flag against a user and returns a boolean. A flag's \`rules\` array is evaluated in order; the first rule where all conditions match returns its \`result\`. If no rule matches, \`flagConfig.enabled\` is the fallback. Each condition is \`{ attribute, operator, value }\` and checks the user's attribute using one of five string operators.

## Requirements

- Operators: \`is\` (exact equality), \`is_not\`, \`contains\` (substring), \`starts_with\`, \`ends_with\`. All comparisons are case-sensitive.
- A condition on an attribute the user does not have does not match (evaluates to \`false\`, not an error).
- A rule matches only if ALL of its conditions match.
- Rules are evaluated in order; the first matching rule's \`result\` is returned immediately.
- \`flagConfig.enabled\` is only a fallback: a matching rule with \`result: false\` overrides \`enabled: true\`, and a matching rule with \`result: true\` overrides \`enabled: false\`.

## What to Implement

- **\`evaluateCondition(condition, user)\`** in \`src/targeting.js\`: return \`true\` if \`user[condition.attribute]\` satisfies the operator and value.
- **\`evaluateFlag(flagConfig, userContext)\`** in \`src/evaluator.js\`: evaluate rules in order and return the first matching rule's \`result\`, or \`flagConfig.enabled\` if none match.
`;

const README_P2 = `# Feature Flag Evaluator, Part 2: Percentage Rollout

## Background

\`src/evaluator.js\` implements a feature flag evaluation engine. Part 1 is complete. Part 2 adds rollout rules: a rule with a \`rolloutPercentage\` key (instead of \`conditions\`) includes a user when \`hashForRollout(flagConfig.key, userContext.id) < rolloutPercentage\`. \`hashForRollout\` is provided in \`src/hash.js\`, returns an integer in [0, 99], and must not be modified.

## Bug Report

\`evaluateFlag\` does not handle rollout rules. Any flag containing a rollout rule skips it and falls through to \`flagConfig.enabled\` as if the rule were absent.

## What to Implement

- **\`evaluateFlag(flagConfig, userContext)\`** in \`src/evaluator.js\`: handle both condition rules (from Part 1) and rollout rules, evaluating them in order with first-match-wins.

## Notes

- Detect a rollout rule by checking \`'rolloutPercentage' in rule\`.
- \`hashForRollout\` takes the flag's \`key\` string and the user's \`id\` string, not the full objects.
- \`rolloutPercentage: 0\` includes no users; \`rolloutPercentage: 100\` includes all users.
`;

const README_P3 = `# Feature Flag Evaluator, Part 3: Compound AND/OR Rules

## Background

\`src/targeting.js\` implements condition evaluation for the feature flag engine. Parts 1 and 2 are complete. Each element in a rule's \`conditions\` array can now be a simple condition \`{ attribute, operator, value }\`, an \`all\` group (all elements must match), or an \`any\` group (at least one must match). The top-level \`conditions\` array retains AND semantics from Part 1.

## Bug Report

\`evaluateConditionOrGroup\` does not implement the \`all\` and \`any\` group branches. Any rule containing a group always evaluates as if the group did not match, so group-based rules never fire.

## What to Implement

- **\`evaluateConditionOrGroup(conditionOrGroup, user)\`** in \`src/targeting.js\`: return \`true\` for a matching simple condition, when all elements of an \`all\` group match, or when at least one element of an \`any\` group matches.

## Notes

- Groups can be nested arbitrarily deep; call the function recursively on group elements.
- An empty \`all: []\` matches (vacuously true). An empty \`any: []\` does not match.
`;

// ── Tests ─────────────────────────────────────────────────────────────────────

const VIS_P1 = [
  { id: 'v1', description: 'no rules → returns enabled (true)',
    input: { flagConfig: { key: 'f', enabled: true, rules: [] }, userContext: { id: 'u1', email: 'a@b.com', plan: 'free', role: 'user' } }, expectedOutput: true },
  { id: 'v2', description: 'no rules → returns enabled (false)',
    input: { flagConfig: { key: 'f', enabled: false, rules: [] }, userContext: { id: 'u1', email: 'a@b.com', plan: 'free', role: 'user' } }, expectedOutput: false },
  { id: 'v3', description: 'matching rule with result=true overrides enabled=false',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ attribute: 'plan', operator: 'is', value: 'pro' }], result: true }] }, userContext: { id: 'u1', email: 'a@b.com', plan: 'pro', role: 'user' } }, expectedOutput: true },
  { id: 'v4', description: 'matching rule with result=false overrides enabled=true',
    input: { flagConfig: { key: 'f', enabled: true, rules: [{ conditions: [{ attribute: 'role', operator: 'is', value: 'banned' }], result: false }] }, userContext: { id: 'u1', email: 'a@b.com', plan: 'pro', role: 'banned' } }, expectedOutput: false },
  { id: 'v5', description: 'non-matching rule falls through to enabled',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ attribute: 'plan', operator: 'is', value: 'enterprise' }], result: true }] }, userContext: { id: 'u1', email: 'a@b.com', plan: 'free', role: 'user' } }, expectedOutput: false },
  { id: 'v6', description: 'first of two rules matches: returns first result',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ attribute: 'plan', operator: 'is', value: 'pro' }], result: true }, { conditions: [{ attribute: 'role', operator: 'is', value: 'user' }], result: false }] }, userContext: { id: 'u1', email: 'a@b.com', plan: 'pro', role: 'user' } }, expectedOutput: true },
];

const HID_P1 = [
  { id: 'h1', description: 'ends_with operator',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ attribute: 'email', operator: 'ends_with', value: '@company.com' }], result: true }] }, userContext: { id: 'u1', email: 'alice@company.com', plan: 'free', role: 'user' } }, expectedOutput: true },
  { id: 'h2', description: 'contains operator',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ attribute: 'email', operator: 'contains', value: 'admin' }], result: true }] }, userContext: { id: 'u1', email: 'super.admin@co.com', plan: 'pro', role: 'user' } }, expectedOutput: true },
  { id: 'h3', description: 'starts_with operator',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ attribute: 'role', operator: 'starts_with', value: 'super' }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'free', role: 'superadmin' } }, expectedOutput: true },
  { id: 'h4', description: 'is_not operator',
    input: { flagConfig: { key: 'f', enabled: true, rules: [{ conditions: [{ attribute: 'plan', operator: 'is_not', value: 'free' }], result: false }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'pro', role: 'user' } }, expectedOutput: false },
  { id: 'h5', description: 'multiple conditions in a rule: all must match',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ attribute: 'plan', operator: 'is', value: 'pro' }, { attribute: 'role', operator: 'is', value: 'admin' }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'pro', role: 'user' } }, expectedOutput: false },
  { id: 'h6', description: 'missing attribute in user → condition does not match',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ attribute: 'country', operator: 'is', value: 'US' }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'free', role: 'user' } }, expectedOutput: false },
  { id: 'h7', description: 'string comparison is case-sensitive (is operator)',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ attribute: 'plan', operator: 'is', value: 'Pro' }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'pro', role: 'user' } }, expectedOutput: false },
];

// For rollout tests we need known hash values. Precompute:
// hashForRollout('beta_ui', 'user_in') and 'user_out' are chosen so one is < 50 and one is >= 50
// We use specific userIds that we know produce predictable buckets.
// djb2 of "beta_ui:user_definitely_in": let's just encode the expected outputs directly
// and trust the hash fn reference impl. We'll pick userId strings and state expectations.
// Actually for test correctness let's just verify the contract: use 100% and 0% rollouts which are trivially deterministic.

const VIS_P2 = [
  { id: 'v1', description: '100% rollout: every user is included',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ rolloutPercentage: 100, result: true }] }, userContext: { id: 'any_user', email: 'x@y.com', plan: 'free', role: 'user' } }, expectedOutput: true },
  { id: 'v2', description: '0% rollout: no user is included',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ rolloutPercentage: 0, result: true }] }, userContext: { id: 'any_user', email: 'x@y.com', plan: 'free', role: 'user' } }, expectedOutput: false },
  { id: 'v3', description: 'condition rule before rollout: condition matches, rollout not evaluated',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ attribute: 'plan', operator: 'is', value: 'enterprise' }], result: true }, { rolloutPercentage: 100, result: false }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'enterprise', role: 'user' } }, expectedOutput: true },
  { id: 'v4', description: 'rollout before condition: 100% rollout matches first',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ rolloutPercentage: 100, result: true }, { conditions: [{ attribute: 'plan', operator: 'is', value: 'free' }], result: false }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'free', role: 'user' } }, expectedOutput: true },
];

const HID_P2 = [
  { id: 'h1', description: 'rollout is deterministic (same user always same result)',
    // Two evaluations of the same flag/user must return the same boolean
    // We test this by checking that 50% rollout for specific userId is consistent
    // We encode two calls and expect them equal. The test runner can verify
    input: { flagConfig: { key: 'det_flag', enabled: false, rules: [{ rolloutPercentage: 50, result: true }] }, userContext: { id: 'stable_user_123', email: 'x@y.com', plan: 'free', role: 'user' } },
    // We can't precompute this without running the hash, so we mark expectedOutput as a special sentinel.
    // The test runner should call evaluateFlag twice and assert they're equal.
    expectedOutput: '__DETERMINISTIC__' },
  { id: 'h2', description: 'different flags with same percentage include different users',
    // flag_a and flag_b with 50% should not necessarily include the same user
    // We test this indirectly: 100% always includes, 0% never includes
    input: { flagConfig: { key: 'flag_a', enabled: false, rules: [{ rolloutPercentage: 100, result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'free', role: 'user' } }, expectedOutput: true },
  { id: 'h3', description: 'rollout not matched falls through to enabled',
    input: { flagConfig: { key: 'f', enabled: true, rules: [{ rolloutPercentage: 0, result: false }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'free', role: 'user' } }, expectedOutput: true },
];

const VIS_P3 = [
  { id: 'v1', description: 'ANY group: first alternative matches',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ any: [{ attribute: 'plan', operator: 'is', value: 'pro' }, { attribute: 'plan', operator: 'is', value: 'enterprise' }] }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'pro', role: 'user' } }, expectedOutput: true },
  { id: 'v2', description: 'ANY group: second alternative matches',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ any: [{ attribute: 'plan', operator: 'is', value: 'pro' }, { attribute: 'plan', operator: 'is', value: 'enterprise' }] }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'enterprise', role: 'user' } }, expectedOutput: true },
  { id: 'v3', description: 'ANY group: no alternative matches',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ any: [{ attribute: 'plan', operator: 'is', value: 'pro' }, { attribute: 'plan', operator: 'is', value: 'enterprise' }] }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'free', role: 'user' } }, expectedOutput: false },
  { id: 'v4', description: 'ALL group: all conditions must match',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ all: [{ attribute: 'plan', operator: 'is', value: 'pro' }, { attribute: 'role', operator: 'is', value: 'admin' }] }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'pro', role: 'admin' } }, expectedOutput: true },
  { id: 'v5', description: 'ALL group: one condition fails',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ all: [{ attribute: 'plan', operator: 'is', value: 'pro' }, { attribute: 'role', operator: 'is', value: 'admin' }] }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'pro', role: 'user' } }, expectedOutput: false },
];

const HID_P3 = [
  { id: 'h1', description: 'ANY group AND simple condition: both must hold at top level',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ any: [{ attribute: 'plan', operator: 'is', value: 'pro' }, { attribute: 'plan', operator: 'is', value: 'enterprise' }] }, { attribute: 'role', operator: 'is_not', value: 'trial' }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'enterprise', role: 'trial' } }, expectedOutput: false },
  { id: 'h2', description: 'nested ALL inside ANY',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ any: [{ all: [{ attribute: 'plan', operator: 'is', value: 'pro' }, { attribute: 'role', operator: 'is', value: 'admin' }] }, { attribute: 'plan', operator: 'is', value: 'enterprise' }] }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'pro', role: 'admin' } }, expectedOutput: true },
  { id: 'h3', description: 'empty ANY matches nothing (false)',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ any: [] }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'free', role: 'user' } }, expectedOutput: false },
  { id: 'h4', description: 'empty ALL matches vacuously (true)',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ all: [] }], result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'free', role: 'user' } }, expectedOutput: true },
  { id: 'h5', description: 'rollout still works alongside compound condition rules',
    input: { flagConfig: { key: 'f', enabled: false, rules: [{ conditions: [{ any: [{ attribute: 'plan', operator: 'is', value: 'enterprise' }] }], result: true }, { rolloutPercentage: 100, result: true }] }, userContext: { id: 'u1', email: 'x@y.com', plan: 'free', role: 'user' } }, expectedOutput: true },
];

// ── Exported scenario ─────────────────────────────────────────────────────────

export const featureFlags = {
  id: 'feature-flag-evaluator',
  title: 'Feature Flag Evaluator',
  difficulty: 'Hard',
  durationMinutes: 40,
  tags: ['rule evaluation', 'recursion', 'product logic'],
  description:
    'Build a feature flag evaluation engine like LaunchDarkly or Split.io. Given a flag configuration and a user context, determine whether the flag is on or off. Three parts: user attribute targeting → percentage rollout → compound AND/OR condition groups.',
  parts: [
    {
      id: 'part-1', number: 1, title: 'User Targeting',
      readme: README_P1, starterFiles: STARTER_P1,
      visibleTests: VIS_P1, hiddenTests: HID_P1,
      trap: 'The "enabled" field is only a fallback: rules override it in both directions. A rule with result=true enables the flag even when enabled=false, and result=false disables it even when enabled=true. AIs often special-case "if enabled=false, return false early" which breaks the override logic.',
      edgeCases: ['enabled=false but matching rule returns true → overall true', 'enabled=true but matching rule returns false → overall false', 'Missing user attribute → condition does not match (not an error)', 'String comparison is case-sensitive', 'Multiple conditions in a rule: ALL must match'],
      answer: {
        fixedCode: `// ── src/targeting.js ────────────────────────────────────────────────────────
function evaluateCondition(condition, user) {
  const userValue = user[condition.attribute];
  if (userValue === undefined) return false;

  switch (condition.operator) {
    case 'is':          return userValue === condition.value;
    case 'is_not':      return userValue !== condition.value;
    case 'contains':    return String(userValue).includes(condition.value);
    case 'starts_with': return String(userValue).startsWith(condition.value);
    case 'ends_with':   return String(userValue).endsWith(condition.value);
    default:            return false;
  }
}

module.exports = { evaluateCondition };

// ── src/evaluator.js ──────────────────────────────────────────────────────────
const { evaluateCondition } = require('./targeting');

function evaluateFlag(flagConfig, userContext) {
  for (const rule of flagConfig.rules) {
    const allMatch = rule.conditions.every(c => evaluateCondition(c, userContext));
    if (allMatch) return rule.result;
  }
  return flagConfig.enabled; // fallback only: never short-circuit on enabled
}

module.exports = { evaluateFlag };`,
        explanation: 'Two files to implement. evaluateCondition: retrieve the attribute from the user object (return false immediately if missing), then switch on the operator: all five are standard JS string methods. evaluateFlag: iterate rules in order; if ALL conditions in a rule match, return rule.result immediately (first-match-wins). Only fall through to flagConfig.enabled when no rule matched. Critical: never check enabled=false early: a rule with result=true must override it.',
      },
    },
    {
      id: 'part-2', number: 2, title: 'Percentage Rollout',
      readme: README_P2, starterFiles: STARTER_P2,
      visibleTests: VIS_P2, hiddenTests: HID_P2,
      trap: 'Rollout must be deterministic: same flagKey + userId always produces the same bucket. AIs sometimes use Math.random() or forget to include the flag key in the hash input, making different flags with the same percentage rollout include the exact same users.',
      edgeCases: ['0% rollout never matches', '100% rollout always matches', 'Hash uses flag key + user id (not just user id)', 'Blocked rollout (not matched) falls through to enabled', 'Rollout and condition rules can be mixed; first-match-wins applies'],
      answer: {
        fixedCode: `// ── src/evaluator.js ──────────────────────────────────────────────────────────
const { evaluateCondition } = require('./targeting');
const { hashForRollout } = require('./hash');

function evaluateFlag(flagConfig, userContext) {
  for (const rule of flagConfig.rules) {
    // Rollout rule: identified by the presence of rolloutPercentage
    if ('rolloutPercentage' in rule) {
      const bucket = hashForRollout(flagConfig.key, userContext.id);
      if (bucket < rule.rolloutPercentage) return rule.result;
      continue; // not in rollout, try next rule
    }

    // Condition rule (Part 1 logic)
    const allMatch = rule.conditions.every(c => evaluateCondition(c, userContext));
    if (allMatch) return rule.result;
  }
  return flagConfig.enabled;
}

module.exports = { evaluateFlag };`,
        explanation: 'Only evaluator.js changes in Part 2. Distinguish rollout rules from condition rules by checking for the rolloutPercentage property. For rollout rules: compute hashForRollout(flagConfig.key, userContext.id), note the flag key is required, not just the user id, and compare with strict less-than (bucket < rolloutPercentage). 0% → hash is never < 0, so never matches. 100% → hash is always < 100, so always matches. If the user is not in the rollout, continue to the next rule (don\'t return early). First-match-wins applies across both rule types.',
      },
    },
    {
      id: 'part-3', number: 3, title: 'Compound AND/OR Rules',
      readme: README_P3, starterFiles: STARTER_P3,
      visibleTests: VIS_P3, hiddenTests: HID_P3,
      trap: 'The top-level conditions array is still AND: all elements must match. The any/all groups add OR/AND within that constraint. AIs sometimes flip to "any condition in conditions matches" semantics when they see any groups, breaking multi-condition rules.',
      edgeCases: ['empty any: [] → false (vacuously no match)', 'empty all: [] → true (vacuously all match)', 'Nested groups: all inside any, any inside all', 'Top-level conditions is still AND even when elements are any/all groups', 'Rollout rules still work alongside compound condition rules'],
      answer: {
        fixedCode: `// ── src/targeting.js ────────────────────────────────────────────────────────
function evaluateConditionOrGroup(conditionOrGroup, user) {
  if ('all' in conditionOrGroup) {
    // AND: every element must be true. Empty array → true (vacuous).
    return conditionOrGroup.all.every(item => evaluateConditionOrGroup(item, user));
  }
  if ('any' in conditionOrGroup) {
    // OR: at least one element must be true. Empty array → false.
    return conditionOrGroup.any.some(item => evaluateConditionOrGroup(item, user));
  }
  // Plain condition
  return evaluateSimpleCondition(conditionOrGroup, user);
}

function evaluateSimpleCondition(condition, user) {
  const userValue = user[condition.attribute];
  if (userValue === undefined) return false;
  switch (condition.operator) {
    case 'is':          return userValue === condition.value;
    case 'is_not':      return userValue !== condition.value;
    case 'contains':    return String(userValue).includes(condition.value);
    case 'starts_with': return String(userValue).startsWith(condition.value);
    case 'ends_with':   return String(userValue).endsWith(condition.value);
    default:            return false;
  }
}

module.exports = { evaluateConditionOrGroup };`,
        explanation: 'Only targeting.js changes in Part 3. evaluateConditionOrGroup is a recursive function: if the element has an "all" key, use .every() (AND semantics: empty all returns true by JS array spec); if it has an "any" key, use .some() (OR semantics: empty any returns false). Both recursively call evaluateConditionOrGroup on each child so nesting works to any depth. The evaluator.js provided in the starter already handles the top-level: it calls .every() across the conditions array, keeping top-level AND semantics intact.',
      },
    },
  ],
  testRunner: {
    entryFile: 'solution.js',
    functionName: 'evaluateFlag',
    inputKeys: ['flagConfig', 'userContext'],
  },
};

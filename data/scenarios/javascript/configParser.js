// ─── Config File Parser ───────────────────────────────────────────────────────
// Inspired by: HashiCorp / generic devtools infrastructure interviews
// Three parts: key=value pairs → sections → lists and type coercion

// ── Starter files ─────────────────────────────────────────────────────────────

const STARTER_P1 = {
  'src/tokenizer.js': `/**
 * Tokenizes a config file into a stream of meaningful tokens.
 * This module is partially implemented: the token types are defined for you.
 */

const TokenType = {
  KEY: 'KEY',
  EQUALS: 'EQUALS',
  STRING: 'STRING',     // quoted: "hello world"
  INTEGER: 'INTEGER',   // e.g. 42 or -7
  FLOAT: 'FLOAT',       // e.g. 3.14
  BOOLEAN: 'BOOLEAN',   // true or false
  NEWLINE: 'NEWLINE',
  EOF: 'EOF',
};

/**
 * Split a line into tokens. Comments and blank lines return empty arrays.
 *
 * @param {string} line
 * @returns {Array<{ type: string, value: any }>}
 */
function tokenizeLine(line) {
  // Strip comment (everything from # onward, outside of quoted strings)
  const commentIdx = findCommentStart(line);
  const stripped = (commentIdx >= 0 ? line.slice(0, commentIdx) : line).trim();
  if (!stripped) return [];

  // TODO: tokenize 'stripped' into KEY, EQUALS, and a VALUE token
  // Return an array like: [{ type: 'KEY', value: 'host' }, { type: 'EQUALS', value: '=' }, { type: 'STRING', value: 'localhost' }]
}

function findCommentStart(line) {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inString = !inString;
    if (!inString && line[i] === '#') return i;
  }
  return -1;
}

module.exports = { tokenizeLine, TokenType };
`,

  'src/parser.js': `const { tokenizeLine, TokenType } = require('./tokenizer');

/**
 * Parse a config file string and return a flat key→value map.
 *
 * Rules:
 *   - Lines are: blank, comment (#...), or key = value
 *   - Keys are case-insensitive (normalize to lowercase)
 *   - Value types: quoted string, integer, float, boolean (true/false)
 *   - Duplicate keys: last declaration wins
 *
 * @param {string} text  The full config file content
 * @returns {Record<string, string | number | boolean>}
 */
function parseConfig(text) {
  const result = {};
  const lines = text.split('\\n');

  for (const line of lines) {
    const tokens = tokenizeLine(line);
    if (tokens.length === 0) continue;

    // TODO: extract key and value from tokens, store in result
  }

  return result;
}

module.exports = { parseConfig };
`,

  'solution.js': `const { parseConfig } = require('./src/parser');

// Re-export for the test runner
module.exports = { parseConfig };
`,

  'tests.js': `const { parseConfig } = require('./solution');

const assert = (condition, message) => {
  if (!condition) throw new Error(\`FAIL: \${message}\`);
  console.log(\`  PASS  \${message}\`);
};

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('\\n─── My Tests ───────────────────────────────────');

assert(
  parseConfig('name = "Alice"').name === 'Alice',
  'parses a quoted string'
);

assert(
  parseConfig('age = 30').age === 30,
  'parses an integer'
);

assert(
  parseConfig('active = true').active === true,
  'parses boolean true'
);

// Add more tests, especially around case sensitivity!

console.log('\\n✓ All tests passed');
`,

  'fixtures/example.conf': `# Example configuration file
# Blank lines and comments are ignored

app_name = "My App"
version = 2
debug = false
ratio = 0.95

# Keys are case-insensitive
HOST = "localhost"
Port = 8080

# Duplicate keys: last value wins
timeout = 30
timeout = 60
`,
};

const STARTER_P2 = {
  'src/tokenizer.js': `const TokenType = {
  KEY: 'KEY',
  EQUALS: 'EQUALS',
  STRING: 'STRING',
  INTEGER: 'INTEGER',
  FLOAT: 'FLOAT',
  BOOLEAN: 'BOOLEAN',
  SECTION: 'SECTION',  // NEW: [section.name]
  NEWLINE: 'NEWLINE',
  EOF: 'EOF',
};

/**
 * Tokenize a single line. Now also recognizes [section.name] headers.
 * A SECTION token's value is the section name string (e.g. "database.replica").
 */
function tokenizeLine(line) {
  const stripped = stripComment(line).trim();
  if (!stripped) return [];

  // Section header: [section.name]
  const sectionMatch = stripped.match(/^\\[([\\w.]+)\\]$/);
  if (sectionMatch) return [{ type: TokenType.SECTION, value: sectionMatch[1].toLowerCase() }];

  // TODO: rest of tokenization (same as Part 1)
}

function stripComment(line) {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inString = !inString;
    if (!inString && line[i] === '#') return line.slice(0, i);
  }
  return line;
}

module.exports = { tokenizeLine, TokenType };
`,

  'src/parser.js': `const { tokenizeLine, TokenType } = require('./tokenizer');

/**
 * Parse a config file with sections.
 *
 * Section headers like [database] or [database.replica] establish a
 * namespace prefix. All keys under a section are stored as "section.key".
 *
 * Global keys (before any section header) have no prefix.
 *
 * Keys and section names are case-insensitive (normalize to lowercase).
 *
 * @param {string} text
 * @returns {Record<string, string | number | boolean>}
 */
function parseConfig(text) {
  const result = {};
  let currentSection = '';  // empty string = global namespace

  for (const line of text.split('\\n')) {
    const tokens = tokenizeLine(line);
    if (tokens.length === 0) continue;

    if (tokens[0].type === TokenType.SECTION) {
      // TODO: update currentSection
      continue;
    }

    // TODO: extract key/value and store under the correct prefix
  }

  return result;
}

module.exports = { parseConfig };
`,

  'solution.js': `const { parseConfig } = require('./src/parser');
module.exports = { parseConfig };
`,

  'tests.js': `const { parseConfig } = require('./solution');

const assert = (condition, message) => {
  if (!condition) throw new Error(\`FAIL: \${message}\`);
  console.log(\`  PASS  \${message}\`);
};

console.log('\\n─── My Tests (Part 2: Sections) ─────────────────');

const cfg = parseConfig(\`
name = "global"

[server]
host = "localhost"
port = 8080

[server.tls]
enabled = true
\`);

assert(cfg['name'] === 'global', 'global key accessible without prefix');
assert(cfg['server.host'] === 'localhost', 'section key accessible as section.key');
assert(cfg['server.tls.enabled'] === true, 'nested section key');

console.log('\\n✓ All tests passed');
`,

  'fixtures/example.conf': `# Config with sections

app = "Deployer"

[database]
host = "db.internal"
port = 5432
pool_size = 10

[database.replica]
host = "replica.internal"
port = 5433

[cache]
ttl = 300
enabled = true
`,
};

const STARTER_P3 = {
  'src/tokenizer.js': `const TokenType = {
  KEY: 'KEY',
  EQUALS: 'EQUALS',
  STRING: 'STRING',
  INTEGER: 'INTEGER',
  FLOAT: 'FLOAT',
  BOOLEAN: 'BOOLEAN',
  SECTION: 'SECTION',
  LBRACKET: 'LBRACKET',   // NEW: [ starting a list value
  RBRACKET: 'RBRACKET',   // NEW: ] ending a list value
  COMMA: 'COMMA',          // NEW: , between list items
  NEWLINE: 'NEWLINE',
  EOF: 'EOF',
};

// NOTE: For Part 3, the tokenizer needs to handle multi-line lists.
// The parser will call tokenizeLine multiple times and accumulate
// tokens across lines until a RBRACKET is seen.
// You may restructure this module as needed.

function tokenizeLine(line) {
  const stripped = stripComment(line).trim();
  if (!stripped) return [];

  const sectionMatch = stripped.match(/^\\[([\\w.]+)\\]$/);
  if (sectionMatch) return [{ type: TokenType.SECTION, value: sectionMatch[1].toLowerCase() }];

  // TODO: also recognize LBRACKET, RBRACKET, COMMA for list values
}

function stripComment(line) {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inString = !inString;
    if (!inString && line[i] === '#') return line.slice(0, i);
  }
  return line;
}

module.exports = { tokenizeLine, TokenType };
`,

  'src/parser.js': `const { tokenizeLine, TokenType } = require('./tokenizer');

/**
 * Parse a config file with sections and list values.
 *
 * Lists:
 *   ports = [8080, 8081, 8082]
 *   tags  = ["web", "api"]
 *   ips   = [
 *     "192.168.1.1",
 *     "10.0.0.1",   ← trailing comma is allowed
 *   ]
 *
 * List values are returned as JavaScript arrays.
 * Trailing commas are permitted.
 * Lists may span multiple lines.
 *
 * @param {string} text
 * @returns {Record<string, string | number | boolean | Array>}
 */
function parseConfig(text) {
  const result = {};
  let currentSection = '';
  const lines = text.split('\\n');
  let i = 0;

  while (i < lines.length) {
    const tokens = tokenizeLine(lines[i]);
    i++;
    if (tokens.length === 0) continue;

    if (tokens[0].type === TokenType.SECTION) {
      currentSection = tokens[0].value;
      continue;
    }

    // TODO: detect if value starts a list (LBRACKET), then accumulate
    // lines until RBRACKET. Parse each item. Handle trailing commas.
  }

  return result;
}

module.exports = { parseConfig };
`,

  'solution.js': `const { parseConfig } = require('./src/parser');
module.exports = { parseConfig };
`,

  'tests.js': `const { parseConfig } = require('./solution');

const assert = (condition, message) => {
  if (!condition) throw new Error(\`FAIL: \${message}\`);
  console.log(\`  PASS  \${message}\`);
};
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('\\n─── My Tests (Part 3: Lists) ─────────────────────');

assert(
  deepEqual(parseConfig('ports = [8080, 8081]').ports, [8080, 8081]),
  'parses inline integer list'
);

assert(
  deepEqual(parseConfig('tags = ["web", "api"]').tags, ['web', 'api']),
  'parses inline string list'
);

// Don\\'t forget: trailing commas are explicitly allowed!

console.log('\\n✓ All tests passed');
`,

  'fixtures/example.conf': `# Full config with sections and lists

app = "Deployer"
version = 3

[server]
host = "0.0.0.0"
port = 8080
allowed_methods = ["GET", "POST", "PUT"]

[server.workers]
count = 4
tags = [
  "production",
  "us-east-1",
  "v3",
]

[database]
host = "db.internal"
port = 5432
replica_ports = [5433, 5434, 5435]
`,
};

// ── README strings ────────────────────────────────────────────────────────────

const README_P1 = `# Config File Parser, Part 1: Key-Value Pairs

## Background

\`src/parser.js\` and \`src/tokenizer.js\` implement a plain-text config file parser. \`parseConfig(text)\` takes the full content of a \`.conf\` file and returns a flat object mapping keys to typed values. Lines are blank, comments (anything from \`#\` to end of line), or \`key = value\` pairs. Value types are: quoted string, integer, float, or boolean (\`true\`/\`false\`). Keys are case-insensitive and stored lowercase; if a key appears more than once, the last value wins.

## Bug Report

Both \`tokenizeLine\` in \`src/tokenizer.js\` and the key-extraction loop in \`parseConfig\` are unimplemented stubs. All calls to \`parseConfig\` return an empty object.

## What to Implement

- **\`tokenizeLine(line)\`** in \`src/tokenizer.js\`: tokenize a stripped line into \`[KEY, EQUALS, VALUE]\` tokens; return an empty array for blank or comment-only lines.
- **\`parseConfig(text)\`** in \`src/parser.js\`: build and return the key-value map, coercing each value to the correct JS type.

## Notes

- \`#\` inside a double-quoted string is not a comment start. \`findCommentStart\` handles this and is already implemented.
- Values are not case-insensitive; only keys are.
`;

const README_P2 = `# Config File Parser, Part 2: Sections

## Background

\`src/parser.js\` implements a config file parser. Part 1 is complete. Part 2 adds section headers: a line of the form \`[section_name]\` begins a namespace, and all subsequent keys are stored as \`sectionName.key\` until the next header appears. Keys before any section header are stored without a prefix. Section names are case-insensitive and normalized to lowercase.

## Bug Report

\`parseConfig\` does not handle section headers. Lines beginning with \`[\` are treated as key-value pairs or cause an error, and all keys are stored without any namespace prefix.

## What to Implement

- **\`parseConfig(text)\`** in \`src/parser.js\`: detect section headers, track the current namespace, and prefix subsequent keys with \`sectionName.\` until the next header.

## Notes

- \`[database.replica]\` is a single namespace string, not two levels of nesting. Keys become \`database.replica.key\`.
- Duplicate section headers are allowed; keys continue accumulating in that namespace.
- Section names are lowercased in the output key path even if written in mixed case.
`;

const README_P3 = `# Config File Parser, Part 3: Lists

## Background

\`src/parser.js\` implements a config file parser. Parts 1 and 2 are complete. Part 3 adds list values: a value starting with \`[\` is an array of comma-separated items enclosed in \`[...]\`. Lists may span multiple lines; the list ends at the first \`]\`. Each item follows the same type rules as scalar values.

## Bug Report

\`parseConfig\` does not handle list values. A key whose value starts with \`[\` either crashes, is skipped, or returns the raw string instead of a JavaScript array.

## What to Implement

- **\`parseConfig(text)\`** in \`src/parser.js\`: detect list values, collect items across lines until the closing \`]\`, parse each item to its correct JS type, and store the result as an array.

## Notes

- Trailing commas are valid: \`["a", "b",]\` produces \`["a", "b"]\`.
- Comments and blank lines within a multi-line list are ignored.
- A \`[\` starting a section header is not a list; distinguish by whether the line contains \`=\`.
- Mixed-type lists are valid; do not enforce type homogeneity.
`;

// ── Tests ─────────────────────────────────────────────────────────────────────

const VIS_P1 = [
  { id: 'v1', description: 'parses a quoted string',
    input: { text: 'name = "Alice Smith"' }, expectedOutput: { name: 'Alice Smith' } },
  { id: 'v2', description: 'parses an integer',
    input: { text: 'age = 30' }, expectedOutput: { age: 30 } },
  { id: 'v3', description: 'parses a float',
    input: { text: 'ratio = 1.75' }, expectedOutput: { ratio: 1.75 } },
  { id: 'v4', description: 'parses booleans',
    input: { text: 'active = true\ndebug = false' }, expectedOutput: { active: true, debug: false } },
  { id: 'v5', description: 'ignores comments',
    input: { text: '# comment\nhost = "localhost" # inline comment' }, expectedOutput: { host: 'localhost' } },
  { id: 'v6', description: 'ignores blank lines',
    input: { text: '\n\nhost = "localhost"\n\n' }, expectedOutput: { host: 'localhost' } },
  { id: 'v7', description: 'keys are case-insensitive (lowercased in output)',
    input: { text: 'HOST = "db"\nPort = 5432' }, expectedOutput: { host: 'db', port: 5432 } },
];

const HID_P1 = [
  { id: 'h1', description: 'duplicate key: last value wins',
    input: { text: 'timeout = 30\ntimeout = 60' }, expectedOutput: { timeout: 60 } },
  { id: 'h2', description: 'negative integer',
    input: { text: 'offset = -7' }, expectedOutput: { offset: -7 } },
  { id: 'h3', description: 'quoted string that contains # is not a comment',
    input: { text: 'url = "http://example.com/#section"' }, expectedOutput: { url: 'http://example.com/#section' } },
  { id: 'h4', description: 'MIXED_CASE key lowercased in output',
    input: { text: 'MAX_Retries = 3' }, expectedOutput: { max_retries: 3 } },
  { id: 'h5', description: 'string that looks like a number stays a string (quoted)',
    input: { text: 'zip = "02134"' }, expectedOutput: { zip: '02134' } },
  { id: 'h6', description: 'empty string value',
    input: { text: 'prefix = ""' }, expectedOutput: { prefix: '' } },
  { id: 'h7', description: 'multiple keys of different types in one file',
    input: { text: 'host = "localhost"\nport = 5432\ntls = true\nmax_conns = 10' },
    expectedOutput: { host: 'localhost', port: 5432, tls: true, max_conns: 10 } },
];

const VIS_P2 = [
  { id: 'v1', description: 'global key has no prefix',
    input: { text: 'app = "MyApp"\n[server]\nport = 8080' }, expectedOutput: { app: 'MyApp', 'server.port': 8080 } },
  { id: 'v2', description: 'section prefix applied to all keys under it',
    input: { text: '[db]\nhost = "localhost"\nport = 5432' }, expectedOutput: { 'db.host': 'localhost', 'db.port': 5432 } },
  { id: 'v3', description: 'nested section (dot notation)',
    input: { text: '[db.replica]\nhost = "replica"' }, expectedOutput: { 'db.replica.host': 'replica' } },
  { id: 'v4', description: 'section names are case-insensitive',
    input: { text: '[DATABASE]\nhost = "db"' }, expectedOutput: { 'database.host': 'db' } },
  { id: 'v5', description: 'multiple sections in one file',
    input: { text: '[a]\nx = 1\n[b]\ny = 2' }, expectedOutput: { 'a.x': 1, 'b.y': 2 } },
];

const HID_P2 = [
  { id: 'h1', description: 'keys before first section header are global',
    input: { text: 'version = 1\n[server]\nhost = "localhost"' }, expectedOutput: { version: 1, 'server.host': 'localhost' } },
  { id: 'h2', description: 'duplicate section headers accumulate keys',
    input: { text: '[server]\nhost = "a"\n[server]\nport = 80' }, expectedOutput: { 'server.host': 'a', 'server.port': 80 } },
  { id: 'h3', description: 'last value wins across duplicate sections',
    input: { text: '[db]\nhost = "primary"\n[db]\nhost = "secondary"' }, expectedOutput: { 'db.host': 'secondary' } },
  { id: 'h4', description: 'three-level nesting',
    input: { text: '[a.b.c]\nval = 42' }, expectedOutput: { 'a.b.c.val': 42 } },
];

const VIS_P3 = [
  { id: 'v1', description: 'parses inline integer list',
    input: { text: 'ports = [8080, 8081, 8082]' }, expectedOutput: { ports: [8080, 8081, 8082] } },
  { id: 'v2', description: 'parses inline string list',
    input: { text: 'tags = ["web", "api"]' }, expectedOutput: { tags: ['web', 'api'] } },
  { id: 'v3', description: 'parses empty list',
    input: { text: 'features = []' }, expectedOutput: { features: [] } },
  { id: 'v4', description: 'trailing comma is allowed',
    input: { text: 'items = [1, 2, 3,]' }, expectedOutput: { items: [1, 2, 3] } },
  { id: 'v5', description: 'multi-line list',
    input: { text: 'hosts = [\n  "a.example.com",\n  "b.example.com",\n]' }, expectedOutput: { hosts: ['a.example.com', 'b.example.com'] } },
];

const HID_P3 = [
  { id: 'h1', description: 'list under a section gets the section prefix',
    input: { text: '[server]\nports = [80, 443]' }, expectedOutput: { 'server.ports': [80, 443] } },
  { id: 'h2', description: 'mixed-type list',
    input: { text: 'mixed = [1, "two", true]' }, expectedOutput: { mixed: [1, 'two', true] } },
  { id: 'h3', description: 'multi-line list with comments inside',
    input: { text: 'ips = [\n  "10.0.0.1", # primary\n  "10.0.0.2", # backup\n]' }, expectedOutput: { ips: ['10.0.0.1', '10.0.0.2'] } },
  { id: 'h4', description: 'list followed by another key in the same section',
    input: { text: '[s]\nports = [80, 443]\nhost = "x"' }, expectedOutput: { 's.ports': [80, 443], 's.host': 'x' } },
  { id: 'h5', description: 'list of booleans',
    input: { text: 'flags = [true, false, true]' }, expectedOutput: { flags: [true, false, true] } },
];

// ── Exported scenario ─────────────────────────────────────────────────────────

export const configParser = {
  id: 'config-parser',
  title: 'Config File Parser',
  difficulty: 'Medium',
  durationMinutes: 30,
  tags: ['parsing', 'tokenization', 'type inference'],
  description:
    'Build a parser for a structured plain-text config format. Handle type inference, comments, and progressively complex structures. Three parts: key=value pairs → sections/namespaces → list values.',
  parts: [
    {
      id: 'part-1', number: 1, title: 'Key-Value Pairs',
      readme: README_P1, starterFiles: STARTER_P1,
      visibleTests: VIS_P1, hiddenTests: HID_P1,
      trap: 'Keys are case-insensitive but values are case-sensitive. "HOST" and "host" and "Host" all map to the same output key "host", but the string value "Alice" is not the same as "alice".',
      edgeCases: ['Keys normalized to lowercase in output', 'Duplicate key: last value wins', '# inside a quoted string is not a comment', 'Negative integers', 'Quoted string that looks like a number stays a string', 'Empty string value ""'],
      answer: {
        fixedCode: `// ── src/tokenizer.js ────────────────────────────────────────────────────────
const TokenType = {
  KEY: 'KEY', EQUALS: 'EQUALS', STRING: 'STRING',
  INTEGER: 'INTEGER', FLOAT: 'FLOAT', BOOLEAN: 'BOOLEAN',
  NEWLINE: 'NEWLINE', EOF: 'EOF',
};

function tokenizeLine(line) {
  const commentIdx = findCommentStart(line);
  const stripped = (commentIdx >= 0 ? line.slice(0, commentIdx) : line).trim();
  if (!stripped) return [];

  const eqIdx = stripped.indexOf('=');
  if (eqIdx === -1) return [];

  const key = stripped.slice(0, eqIdx).trim();
  const rawValue = stripped.slice(eqIdx + 1).trim();

  const tokens = [
    { type: TokenType.KEY, value: key },
    { type: TokenType.EQUALS, value: '=' },
  ];

  if (rawValue.startsWith('"')) {
    // Quoted string: content between first and last quote
    tokens.push({ type: TokenType.STRING, value: rawValue.slice(1, rawValue.lastIndexOf('"')) });
  } else if (rawValue === 'true') {
    tokens.push({ type: TokenType.BOOLEAN, value: true });
  } else if (rawValue === 'false') {
    tokens.push({ type: TokenType.BOOLEAN, value: false });
  } else if (/^-?\\d+\\.\\d+$/.test(rawValue)) {
    tokens.push({ type: TokenType.FLOAT, value: parseFloat(rawValue) });
  } else {
    tokens.push({ type: TokenType.INTEGER, value: parseInt(rawValue, 10) });
  }

  return tokens;
}

function findCommentStart(line) {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inString = !inString;
    if (!inString && line[i] === '#') return i;
  }
  return -1;
}

module.exports = { tokenizeLine, TokenType };

// ── src/parser.js ─────────────────────────────────────────────────────────────
const { tokenizeLine: _tokenizeLine, TokenType: _TT } = require('./tokenizer');

function parseConfig(text) {
  const result = {};
  for (const line of text.split('\\n')) {
    const tokens = _tokenizeLine(line);
    if (tokens.length === 0) continue;
    // tokens: [KEY, EQUALS, value-token]
    const key = tokens[0].value.toLowerCase();
    result[key] = tokens[2].value;
  }
  return result;
}

module.exports = { parseConfig };`,
        explanation: 'tokenizeLine: strip comments first using findCommentStart (which respects quoted strings), then split on the first = to get key and rawValue. Detect value type in order: starts with " → STRING (slice off both quotes); is literal "true"/"false" → BOOLEAN; matches /^-?\\d+\\.\\d+$/ → FLOAT; otherwise → INTEGER. parseConfig: call tokenizeLine per line, skip empties, store tokens[2].value under the lowercased key. Last write wins for duplicates because later iterations overwrite earlier ones.',
      },
    },
    {
      id: 'part-2', number: 2, title: 'Sections',
      readme: README_P2, starterFiles: STARTER_P2,
      visibleTests: VIS_P2, hiddenTests: HID_P2,
      trap: 'Section names are also case-insensitive. [DATABASE] and [database] refer to the same namespace. AIs often normalize key names but forget to normalize section names.',
      edgeCases: ['Global keys before first section have no prefix', 'Duplicate section headers accumulate keys from both occurrences', 'Three-level nesting: [a.b.c] → prefix "a.b.c."', 'Last value wins for duplicate keys across repeated section headers'],
      answer: {
        fixedCode: `// ── src/tokenizer.js ────────────────────────────────────────────────────────
const TokenType = {
  KEY: 'KEY', EQUALS: 'EQUALS', STRING: 'STRING', INTEGER: 'INTEGER',
  FLOAT: 'FLOAT', BOOLEAN: 'BOOLEAN', SECTION: 'SECTION', NEWLINE: 'NEWLINE', EOF: 'EOF',
};

function tokenizeLine(line) {
  const stripped = stripComment(line).trim();
  if (!stripped) return [];

  // Section header: [section.name], must be the entire line
  const sectionMatch = stripped.match(/^\\[([\\w.]+)\\]$/);
  if (sectionMatch) return [{ type: TokenType.SECTION, value: sectionMatch[1].toLowerCase() }];

  const eqIdx = stripped.indexOf('=');
  if (eqIdx === -1) return [];

  const key = stripped.slice(0, eqIdx).trim();
  const rawValue = stripped.slice(eqIdx + 1).trim();
  const tokens = [{ type: TokenType.KEY, value: key }, { type: TokenType.EQUALS, value: '=' }];

  if (rawValue.startsWith('"')) {
    tokens.push({ type: TokenType.STRING, value: rawValue.slice(1, rawValue.lastIndexOf('"')) });
  } else if (rawValue === 'true') {
    tokens.push({ type: TokenType.BOOLEAN, value: true });
  } else if (rawValue === 'false') {
    tokens.push({ type: TokenType.BOOLEAN, value: false });
  } else if (/^-?\\d+\\.\\d+$/.test(rawValue)) {
    tokens.push({ type: TokenType.FLOAT, value: parseFloat(rawValue) });
  } else {
    tokens.push({ type: TokenType.INTEGER, value: parseInt(rawValue, 10) });
  }
  return tokens;
}

function stripComment(line) {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inString = !inString;
    if (!inString && line[i] === '#') return line.slice(0, i);
  }
  return line;
}

module.exports = { tokenizeLine, TokenType };

// ── src/parser.js ─────────────────────────────────────────────────────────────
const { tokenizeLine: _tokenizeLine, TokenType: _TT } = require('./tokenizer');

function parseConfig(text) {
  const result = {};
  let currentSection = ''; // empty = global namespace

  for (const line of text.split('\\n')) {
    const tokens = _tokenizeLine(line);
    if (tokens.length === 0) continue;

    if (tokens[0].type === _TT.SECTION) {
      currentSection = tokens[0].value; // already lowercased by tokenizer
      continue;
    }

    const key = tokens[0].value.toLowerCase();
    const fullKey = currentSection ? currentSection + '.' + key : key;
    result[fullKey] = tokens[2].value;
  }

  return result;
}

module.exports = { parseConfig };`,
        explanation: 'tokenizeLine now also matches section headers with /^\\[(\\w.+)\\]$/ and returns a SECTION token whose value is already lowercased. parseConfig maintains a currentSection string (empty = global). When a SECTION token is seen, update currentSection. For key-value lines, prefix the key with currentSection + "." when a section is active. Duplicate section headers work naturally: they just set currentSection back to a name that may already have keys, and subsequent keys continue accumulating there.',
      },
    },
    {
      id: 'part-3', number: 3, title: 'Lists',
      readme: README_P3, starterFiles: STARTER_P3,
      visibleTests: VIS_P3, hiddenTests: HID_P3,
      trap: 'Trailing commas in lists are explicitly permitted. Most JSON-style parsers reject them. [1, 2, 3,] must produce [1, 2, 3], not a parse error.',
      edgeCases: ['Trailing comma in list: [1, 2,] → [1, 2]', 'Empty list []', 'Multi-line list with comments inside the list body', 'List under a section gets the section prefix', 'Mixed-type list [1, "two", true]'],
      answer: {
        fixedCode: `// ── src/tokenizer.js ────────────────────────────────────────────────────────
// (Same as Part 2: tokenizeLine handles KEY/EQUALS/value and SECTION tokens.
//  The parser handles list accumulation directly rather than via extra token types.)
const TokenType = {
  KEY: 'KEY', EQUALS: 'EQUALS', STRING: 'STRING', INTEGER: 'INTEGER',
  FLOAT: 'FLOAT', BOOLEAN: 'BOOLEAN', SECTION: 'SECTION', NEWLINE: 'NEWLINE', EOF: 'EOF',
};

function tokenizeLine(line) {
  const stripped = stripComment(line).trim();
  if (!stripped) return [];

  const sectionMatch = stripped.match(/^\\[([\\w.]+)\\]$/);
  if (sectionMatch) return [{ type: TokenType.SECTION, value: sectionMatch[1].toLowerCase() }];

  const eqIdx = stripped.indexOf('=');
  if (eqIdx === -1) return [];

  const key = stripped.slice(0, eqIdx).trim();
  // Preserve the full raw value string for list detection in the parser
  const rawValue = stripped.slice(eqIdx + 1).trim();
  return [
    { type: TokenType.KEY, value: key },
    { type: TokenType.EQUALS, value: '=' },
    { type: 'RAW', value: rawValue },
  ];
}

function stripComment(line) {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inString = !inString;
    if (!inString && line[i] === '#') return line.slice(0, i);
  }
  return line;
}

module.exports = { tokenizeLine, TokenType, stripComment };

// ── src/parser.js ─────────────────────────────────────────────────────────────
const { tokenizeLine: _tokenizeLine, TokenType: _TT, stripComment: _strip } = require('./tokenizer');

function parseScalar(raw) {
  raw = raw.trim();
  if (raw.startsWith('"')) return raw.slice(1, raw.lastIndexOf('"'));
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\\d+\\.\\d+$/.test(raw)) return parseFloat(raw);
  return parseInt(raw, 10);
}

function parseConfig(text) {
  const result = {};
  let currentSection = '';
  const lines = text.split('\\n');
  let i = 0;

  while (i < lines.length) {
    const tokens = _tokenizeLine(lines[i]);
    i++;
    if (tokens.length === 0) continue;

    if (tokens[0].type === _TT.SECTION) {
      currentSection = tokens[0].value;
      continue;
    }

    const key = tokens[0].value.toLowerCase();
    const fullKey = currentSection ? currentSection + '.' + key : key;
    const rawValue = tokens[2].value;

    if (rawValue.startsWith('[')) {
      // List value: accumulate lines until we have the closing ]
      let content = rawValue.slice(1); // drop the opening [
      while (!content.includes(']')) {
        const nextLine = _strip(lines[i] || '').trim();
        i++;
        content += ',' + nextLine;
      }
      content = content.slice(0, content.lastIndexOf(']'));
      // Split on comma, trim, drop empties (handles trailing commas)
      result[fullKey] = content
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(parseScalar);
    } else {
      result[fullKey] = parseScalar(rawValue);
    }
  }

  return result;
}

module.exports = { parseConfig };`,
        explanation: 'List parsing is handled entirely in the parser by inspecting the raw value string. When rawValue starts with "[", drop that character and accumulate subsequent lines (stripped of comments) until the accumulated string contains "]". Then cut off at the last "]" and split on comma. Filtering with .filter(Boolean) after trimming removes the empty string produced by a trailing comma, so [1, 2, 3,] yields [1, 2, 3]. Each item is parsed by parseScalar using the same type-detection logic as scalar values.',
      },
    },
  ],
  testRunner: {
    entryFile: 'solution.js',
    functionName: 'parseConfig',
    inputKeys: ['text'],
  },
};

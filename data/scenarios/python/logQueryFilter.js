// ── Buggy lib files (one per part) ───────────────────────────────────────────

// Part 1: level filter uses <= instead of <. Lines at exactly min_level are skipped
const P1_LIB = `
LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']

def get_level(line):
    """Extract the log level from a log line.

    Log format: "[YYYY-MM-DD HH:MM:SS] LEVEL key=val ... free text"
    Splits on '] ' to skip the timestamp bracket, then takes the first word.
    Returns None if the line doesn't match the expected format.
    """
    parts = line.split('] ')
    if len(parts) < 2:
        return None
    return parts[1].split()[0].strip()

def filter_logs(logs, query):
    """Filter log lines according to a query dict.

    Supported query keys:
      min_level (str): inclusive lower-bound level. Keep lines at or above this level
      contains  (str): substring that must appear somewhere in the line

    Returns a list of matching log lines.
    """
    results = []
    for line in logs:
        if 'min_level' in query:
            level = get_level(line)
            if level not in LEVELS:
                continue
            min_rank = LEVELS.index(query['min_level'])
            cur_rank = LEVELS.index(level)
            if cur_rank <= min_rank:
                continue
        if 'contains' in query:
            if query['contains'] not in line:
                continue
        results.append(line)
    return results
`.trim();

// Part 2: level filter fixed; field extraction uses split('=') instead of split('=', 1)
const P2_LIB = `
LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']

def get_level(line):
    """Extract the log level from a log line."""
    parts = line.split('] ')
    if len(parts) < 2:
        return None
    return parts[1].split()[0].strip()

def parse_fields(line):
    """Extract key=value tokens from a log line.

    Scans the tokens that appear after the LEVEL word. A token is treated as a
    field if it contains an '=' character; the part before the first '=' is the
    key and the rest is the value.

    Example:
      "[2024-01-15 10:30:03] ERROR service=api task_id=abc=42 Connection refused"
      => {'service': 'api', 'task_id': 'abc=42'}
    """
    parts = line.split('] ')
    if len(parts) < 2:
        return {}
    tokens = parts[1].split()[1:]  # skip the LEVEL word
    fields = {}
    for token in tokens:
        if '=' in token:
            kv = token.split('=')
            fields[kv[0]] = kv[1]
    return fields

def filter_logs(logs, query):
    """Filter log lines according to a query dict.

    Supported query keys:
      min_level (str):        inclusive lower-bound level
      contains  (str):        substring that must appear in the line
      fields    (dict):       {field_name: expected_value}. ALL pairs must match (AND)

    Returns a list of matching log lines.
    """
    results = []
    for line in logs:
        if 'min_level' in query:
            level = get_level(line)
            if level not in LEVELS:
                continue
            min_rank = LEVELS.index(query['min_level'])
            cur_rank = LEVELS.index(level)
            if cur_rank < min_rank:
                continue
        if 'contains' in query:
            if query['contains'] not in line:
                continue
        if 'fields' in query:
            parsed = parse_fields(line)
            match = all(parsed.get(k) == v for k, v in query['fields'].items())
            if not match:
                continue
        results.append(line)
    return results
`.trim();

// Part 3: field extraction fixed; not_contains condition is inverted
const P3_LIB = `
LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']

def get_level(line):
    """Extract the log level from a log line."""
    parts = line.split('] ')
    if len(parts) < 2:
        return None
    return parts[1].split()[0].strip()

def parse_fields(line):
    """Extract key=value tokens from a log line (split on first '=' only)."""
    parts = line.split('] ')
    if len(parts) < 2:
        return {}
    tokens = parts[1].split()[1:]
    fields = {}
    for token in tokens:
        if '=' in token:
            k, v = token.split('=', 1)
            fields[k] = v
    return fields

def filter_logs(logs, query):
    """Filter log lines according to a query dict.

    Supported query keys:
      min_level    (str):  inclusive lower-bound level
      contains     (str):  substring that MUST appear in the line
      not_contains (str):  substring that must NOT appear in the line
      fields       (dict): {field_name: expected_value}. ALL pairs must match

    Returns a list of matching log lines.
    """
    results = []
    for line in logs:
        if 'min_level' in query:
            level = get_level(line)
            if level not in LEVELS:
                continue
            min_rank = LEVELS.index(query['min_level'])
            cur_rank = LEVELS.index(level)
            if cur_rank < min_rank:
                continue
        if 'contains' in query:
            if query['contains'] not in line:
                continue
        if 'not_contains' in query:
            if query['not_contains'] not in line:
                continue
        if 'fields' in query:
            parsed = parse_fields(line)
            match = all(parsed.get(k) == v for k, v in query['fields'].items())
            if not match:
                continue
        results.append(line)
    return results
`.trim();

// ── Correct solution files (one per part) ────────────────────────────────────

const SOLUTION_PY1 = `
from lib.filter_logs import filter_logs

# Do not modify this file. Fix the bugs in lib/filter_logs.py.
`.trim();

const SOLUTION_PY2 = `
from lib.filter_logs import filter_logs

# Do not modify this file. Fix the bugs in lib/filter_logs.py.
`.trim();

const SOLUTION_PY3 = `
from lib.filter_logs import filter_logs

# Do not modify this file. Fix the bugs in lib/filter_logs.py.
`.trim();

const TESTS_PY = `
from solution import filter_logs

# Use this file to try your own filters. Output appears in the
# "tests.py output" panel below the test results when you click Run Tests.
#
# filter_logs(logs, query) returns only the lines that match the query.
# Query keys:
#   'min_level'  : keep lines at this level or higher (DEBUG < INFO < WARN < ERROR < FATAL)
#   'contains'   : keep lines that contain this substring

LOGS = [
    "[2024-01-15 10:30:00] DEBUG service=api Cache check",
    "[2024-01-15 10:30:01] INFO  service=web user=alice Request received",
    "[2024-01-15 10:30:02] WARN  service=api Slow query detected",
    "[2024-01-15 10:30:03] ERROR service=api task_id=abc=42 Connection refused",
    "[2024-01-15 10:30:04] FATAL service=db Out of disk space",
    "[2024-01-15 10:30:05] INFO  service=api user=bob Logout successful",
    "[2024-01-15 10:30:06] ERROR service=web task_id=x=1 Timeout exceeded",
]

# Example 1: keep only WARN and above
result = filter_logs(LOGS, {'min_level': 'WARN'})
print("WARN+:")
for line in result:
    print(" ", line)
# -> WARN, ERROR, FATAL lines

# Example 2: keep lines mentioning service=api
result = filter_logs(LOGS, {'contains': 'service=api'})
print("service=api:")
for line in result:
    print(" ", line)

# Try your own:
# print(filter_logs(LOGS, {'min_level': 'ERROR'}))
`.trim();

// ── Sample log lines (shared across all test arrays) ─────────────────────────

const L = [
  "[2024-01-15 10:30:00] DEBUG service=api Cache check",
  "[2024-01-15 10:30:01] INFO  service=web user=alice Request received",
  "[2024-01-15 10:30:02] WARN  service=api Slow query detected",
  "[2024-01-15 10:30:03] ERROR service=api task_id=abc=42 Connection refused",
  "[2024-01-15 10:30:04] FATAL service=db Out of disk space",
  "[2024-01-15 10:30:05] INFO  service=api user=bob Logout successful",
  "[2024-01-15 10:30:06] ERROR service=web task_id=x=1 Timeout exceeded",
];

// ── Part 1 tests: level filter off-by-one (<=  instead of <) ─────────────────

const P1_VISIBLE = [
  {
    id: 'lqf-p1-v1',
    description: 'min_level=DEBUG returns all 7 lines (DEBUG is the lowest level)',
    input: { logs: L, query: { min_level: 'DEBUG' } },
    expectedOutput: [L[0], L[1], L[2], L[3], L[4], L[5], L[6]],
  },
  {
    id: 'lqf-p1-v2',
    description: 'min_level=WARN returns WARN, ERROR, FATAL. The bug skips WARN itself',
    input: { logs: L, query: { min_level: 'WARN' } },
    expectedOutput: [L[2], L[3], L[4], L[6]],
  },
  {
    id: 'lqf-p1-v3',
    description: 'min_level=ERROR returns ERROR and FATAL lines only',
    input: { logs: L, query: { min_level: 'ERROR' } },
    expectedOutput: [L[3], L[4], L[6]],
  },
  {
    id: 'lqf-p1-v4',
    description: 'min_level=FATAL returns only the single FATAL line',
    input: { logs: L, query: { min_level: 'FATAL' } },
    expectedOutput: [L[4]],
  },
  {
    id: 'lqf-p1-v5',
    description: 'contains filter with no level filter returns all matching lines',
    input: { logs: L, query: { contains: 'service=api' } },
    expectedOutput: [L[0], L[2], L[3], L[5]],
  },
];

const P1_HIDDEN = [
  {
    id: 'lqf-p1-h1',
    description: 'min_level=INFO returns INFO, WARN, ERROR, FATAL (4 of 5 distinct levels)',
    input: { logs: L, query: { min_level: 'INFO' } },
    expectedOutput: [L[1], L[2], L[3], L[4], L[5], L[6]],
  },
  {
    id: 'lqf-p1-h2',
    description: 'min_level=INFO combined with contains=service=api narrows to api lines',
    input: { logs: L, query: { min_level: 'INFO', contains: 'service=api' } },
    expectedOutput: [L[2], L[3], L[5]],
  },
  {
    id: 'lqf-p1-h3',
    description: 'min_level=WARN combined with contains=Connection keeps only the ERROR line',
    input: { logs: L, query: { min_level: 'WARN', contains: 'Connection' } },
    expectedOutput: [L[3]],
  },
  {
    id: 'lqf-p1-h4',
    description: 'empty log list returns empty list regardless of query',
    input: { logs: [], query: { min_level: 'DEBUG' } },
    expectedOutput: [],
  },
  {
    id: 'lqf-p1-h5',
    description: 'single ERROR line with min_level=ERROR is kept (boundary case)',
    input: {
      logs: ["[2024-01-15 12:00:00] ERROR service=svc Fatal error occurred"],
      query: { min_level: 'ERROR' },
    },
    expectedOutput: ["[2024-01-15 12:00:00] ERROR service=svc Fatal error occurred"],
  },
];

// ── Part 2 tests: field extraction split('=') vs split('=', 1) ───────────────

const P2_VISIBLE = [
  {
    id: 'lqf-p2-v1',
    description: 'fields filter on service=api matches all api-service lines',
    input: { logs: L, query: { fields: { service: 'api' } } },
    expectedOutput: [L[0], L[2], L[3], L[5]],
  },
  {
    id: 'lqf-p2-v2',
    description: 'task_id=abc=42 must be extracted whole. The bug splits at first = and gets abc',
    input: { logs: L, query: { fields: { task_id: 'abc=42' } } },
    expectedOutput: [L[3]],
  },
  {
    id: 'lqf-p2-v3',
    description: 'task_id=x=1 is also a value with = inside; correct split returns x=1',
    input: { logs: L, query: { fields: { task_id: 'x=1' } } },
    expectedOutput: [L[6]],
  },
  {
    id: 'lqf-p2-v4',
    description: 'multiple field constraints are AND\'d: service=api AND user=bob',
    input: { logs: L, query: { fields: { service: 'api', user: 'bob' } } },
    expectedOutput: [L[5]],
  },
];

const P2_HIDDEN = [
  {
    id: 'lqf-p2-h1',
    description: 'field value that does not appear in any line returns empty list',
    input: { logs: L, query: { fields: { service: 'cache' } } },
    expectedOutput: [],
  },
  {
    id: 'lqf-p2-h2',
    description: 'min_level combined with fields filter stacks both conditions',
    input: { logs: L, query: { min_level: 'ERROR', fields: { service: 'api' } } },
    expectedOutput: [L[3]],
  },
  {
    id: 'lqf-p2-h3',
    description: 'user=alice appears only on the INFO line for the web service',
    input: { logs: L, query: { fields: { user: 'alice' } } },
    expectedOutput: [L[1]],
  },
  {
    id: 'lqf-p2-h4',
    description: 'field key that exists on no line returns empty list',
    input: { logs: L, query: { fields: { region: 'us-east-1' } } },
    expectedOutput: [],
  },
  {
    id: 'lqf-p2-h5',
    description: 'both task_id lines returned when filtering by service=web',
    input: { logs: L, query: { fields: { service: 'web' } } },
    expectedOutput: [L[1], L[6]],
  },
];

// ── Part 3 tests: not_contains inverted condition ─────────────────────────────

const P3_VISIBLE = [
  {
    id: 'lqf-p3-v1',
    description: 'not_contains=INFO excludes both INFO lines, keeping the other 5',
    input: { logs: L, query: { not_contains: 'INFO' } },
    expectedOutput: [L[0], L[2], L[3], L[4], L[6]],
  },
  {
    id: 'lqf-p3-v2',
    description: 'contains=service=api AND not_contains=Cache keeps non-DEBUG api lines',
    input: { logs: L, query: { contains: 'service=api', not_contains: 'Cache' } },
    expectedOutput: [L[2], L[3], L[5]],
  },
  {
    id: 'lqf-p3-v3',
    description: 'min_level=WARN AND not_contains=ERROR keeps only WARN and FATAL',
    input: { logs: L, query: { min_level: 'WARN', not_contains: 'ERROR' } },
    expectedOutput: [L[2], L[4]],
  },
  {
    id: 'lqf-p3-v4',
    description: 'not_contains string absent from all lines: all lines pass through',
    input: { logs: L, query: { not_contains: 'TRACE' } },
    expectedOutput: [L[0], L[1], L[2], L[3], L[4], L[5], L[6]],
  },
];

const P3_HIDDEN = [
  {
    id: 'lqf-p3-h1',
    description: 'not_contains=FATAL removes only the FATAL line',
    input: { logs: L, query: { not_contains: 'FATAL' } },
    expectedOutput: [L[0], L[1], L[2], L[3], L[5], L[6]],
  },
  {
    id: 'lqf-p3-h2',
    description: 'not_contains string present on every line: result is empty',
    input: { logs: L, query: { not_contains: 'service=' } },
    expectedOutput: [],
  },
  {
    id: 'lqf-p3-h3',
    description: 'min_level=INFO AND contains=service=api AND not_contains=bob',
    input: { logs: L, query: { min_level: 'INFO', contains: 'service=api', not_contains: 'bob' } },
    expectedOutput: [L[2], L[3]],
  },
  {
    id: 'lqf-p3-h4',
    description: 'empty log list with not_contains always returns empty list',
    input: { logs: [], query: { not_contains: 'ERROR' } },
    expectedOutput: [],
  },
];

// ── READMEs ───────────────────────────────────────────────────────────────────

const P1_README = `# Log Query Filter, Part 1: Level Filtering

## Background

\`lib/filter_logs.py\` implements a log search engine. \`filter_logs(logs, query)\` takes a list of log line strings and a query dict, and returns only the lines satisfying all query conditions. Log lines follow the format \`[YYYY-MM-DD HH:MM:SS] LEVEL key=val free text\`. Severity levels in ascending order: DEBUG(0), INFO(1), WARN(2), ERROR(3), FATAL(4).

## Bug Report

When the query includes \`min_level\`, lines at exactly that severity are excluded. Only lines strictly above the specified level are returned. \`filter_logs(logs, {'min_level': 'WARN'})\` returns ERROR and FATAL but omits WARN.

## What to Implement

- **\`filter_logs(logs, query)\`** in \`lib/filter_logs.py\`: when \`min_level\` is present, keep lines whose severity rank is greater than or equal to the rank of the specified level.
`;

const P2_README = `# Log Query Filter, Part 2: Field Extraction

## Background

\`lib/filter_logs.py\` is a log search engine. Bugs from Part 1 are fixed. The \`fields\` query key filters by structured key=value pairs embedded in log lines. In the log format \`[YYYY-MM-DD HH:MM:SS] LEVEL key=val free text\`, each space-separated token after LEVEL that contains \`=\` is a field; everything after the first \`=\` is the value.

## Bug Report

Field values containing \`=\` are truncated at the first \`=\`. A line with \`task_id=abc=42\` is parsed as \`task_id=abc\`, so \`filter_logs(logs, {'fields': {'task_id': 'abc=42'}})\` returns no results even when a matching line exists.

## What to Implement

- **\`filter_logs(logs, query)\`** in \`lib/filter_logs.py\`: when \`fields\` is present, parse each field token by splitting on the first \`=\` only, then include only lines where all specified field/value pairs match.

## Notes

A field value may contain multiple \`=\` characters. Only the first \`=\` in a token separates the key from the value.
`;

const P3_README = `# Log Query Filter, Part 3: NOT Filter

## Background

\`lib/filter_logs.py\` is a log search engine. Bugs from Parts 1 and 2 are fixed. The \`not_contains\` query key excludes lines that contain a given substring. All query conditions apply simultaneously: a line must pass every condition present in the query to be included.

## Bug Report

The \`not_contains\` filter is inverted: lines containing the substring are kept and all others are excluded. \`filter_logs(logs, {'not_contains': 'INFO'})\` returns only the INFO line instead of excluding it.

## What to Implement

- **\`filter_logs(logs, query)\`** in \`lib/filter_logs.py\`: when \`not_contains\` is present, exclude lines that contain the specified substring.
`;

// ── Scenario export ───────────────────────────────────────────────────────────

export const logQueryFilter = {
  id: 'log-query-filter',
  title: 'Log Query Filter',
  difficulty: 'Medium',
  durationMinutes: 35,
  tags: ['string parsing', 'filtering', 'log analysis'],
  description:
    'Build a log filtering engine for structured log lines. ' +
    'Three progressive bugs: a level-filter off-by-one that drops lines at exactly ' +
    'min_level, a field-extraction split that truncates values containing "=", and an ' +
    'inverted NOT condition that keeps excluded lines instead of removing them.',
  parts: [
    {
      title: 'Level Filtering',
      readme: P1_README,
      starterFiles: {
        'lib/filter_logs.py': P1_LIB,
        'solution.py': SOLUTION_PY1,
        'tests.py': TESTS_PY,
      },
      visibleTests: P1_VISIBLE,
      hiddenTests: P1_HIDDEN,
      answer: {
        fixedCode: `LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']

def get_level(line):
    parts = line.split('] ')
    if len(parts) < 2:
        return None
    return parts[1].split()[0].strip()

def filter_logs(logs, query):
    results = []
    for line in logs:
        if 'min_level' in query:
            level = get_level(line)
            if level not in LEVELS:
                continue
            min_rank = LEVELS.index(query['min_level'])
            cur_rank = LEVELS.index(level)
            if cur_rank < min_rank:  # Fix: < instead of <=
                continue
        if 'contains' in query:
            if query['contains'] not in line:
                continue
        results.append(line)
    return results`,
        explanation: 'Changed "cur_rank <= min_rank" to "cur_rank < min_rank" in the level filter. The condition is supposed to skip lines whose level is strictly below min_level. The original <= also skipped lines at exactly min_level, making the lower bound exclusive instead of inclusive, so a query for min_level="WARN" dropped WARN lines and only kept ERROR and FATAL.',
      },
    },
    {
      title: 'Field Extraction',
      readme: P2_README,
      starterFiles: {
        'lib/filter_logs.py': P2_LIB,
        'solution.py': SOLUTION_PY2,
        'tests.py': TESTS_PY,
      },
      visibleTests: P2_VISIBLE,
      hiddenTests: P2_HIDDEN,
      answer: {
        fixedCode: `LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']

def get_level(line):
    parts = line.split('] ')
    if len(parts) < 2:
        return None
    return parts[1].split()[0].strip()

def parse_fields(line):
    parts = line.split('] ')
    if len(parts) < 2:
        return {}
    tokens = parts[1].split()[1:]
    fields = {}
    for token in tokens:
        if '=' in token:
            kv = token.split('=', 1)  # Fix: limit to 1 split
            fields[kv[0]] = kv[1]
    return fields

def filter_logs(logs, query):
    results = []
    for line in logs:
        if 'min_level' in query:
            level = get_level(line)
            if level not in LEVELS:
                continue
            min_rank = LEVELS.index(query['min_level'])
            cur_rank = LEVELS.index(level)
            if cur_rank < min_rank:
                continue
        if 'contains' in query:
            if query['contains'] not in line:
                continue
        if 'fields' in query:
            parsed = parse_fields(line)
            match = all(parsed.get(k) == v for k, v in query['fields'].items())
            if not match:
                continue
        results.append(line)
    return results`,
        explanation: 'Changed "token.split(\'=\')" to "token.split(\'=\', 1)" to limit the split to at most one separator. Without the limit, a token like "task_id=abc=42" splits into three parts and only kv[1]="abc" is stored, truncating the real value "abc=42". Splitting on the first = only gives exactly two parts, the key and the full value, regardless of how many = signs appear in the value.',
      },
    },
    {
      title: 'NOT Filter',
      readme: P3_README,
      starterFiles: {
        'lib/filter_logs.py': P3_LIB,
        'solution.py': SOLUTION_PY3,
        'tests.py': TESTS_PY,
      },
      visibleTests: P3_VISIBLE,
      hiddenTests: P3_HIDDEN,
      answer: {
        fixedCode: `LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']

def get_level(line):
    parts = line.split('] ')
    if len(parts) < 2:
        return None
    return parts[1].split()[0].strip()

def parse_fields(line):
    parts = line.split('] ')
    if len(parts) < 2:
        return {}
    tokens = parts[1].split()[1:]
    fields = {}
    for token in tokens:
        if '=' in token:
            k, v = token.split('=', 1)
            fields[k] = v
    return fields

def filter_logs(logs, query):
    results = []
    for line in logs:
        if 'min_level' in query:
            level = get_level(line)
            if level not in LEVELS:
                continue
            min_rank = LEVELS.index(query['min_level'])
            cur_rank = LEVELS.index(level)
            if cur_rank < min_rank:
                continue
        if 'contains' in query:
            if query['contains'] not in line:
                continue
        if 'not_contains' in query:
            if query['not_contains'] in line:  # Fix: skip if found, not if absent
                continue
        if 'fields' in query:
            parsed = parse_fields(line)
            match = all(parsed.get(k) == v for k, v in query['fields'].items())
            if not match:
                continue
        results.append(line)
    return results`,
        explanation: 'Inverted the not_contains condition from "if query[\'not_contains\'] not in line" to "if query[\'not_contains\'] in line". The intent is to exclude lines that contain the forbidden substring, so the filter should skip a line when the substring IS found. The original code skipped lines that did NOT contain it, effectively keeping every line that contained the excluded text and filtering out all the innocent ones.',
      },
    },
  ],
  testRunner: {
    language: 'python',
    entryFile: 'solution.py',
    functionName: 'filter_logs',
    inputKeys: ['logs', 'query'],
  },
};

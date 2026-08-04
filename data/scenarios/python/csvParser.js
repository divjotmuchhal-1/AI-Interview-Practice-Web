// ── Buggy lib files (one per part) ───────────────────────────────────────────

// Part 1: last field dropped + whitespace trimmed from unquoted fields
const P1_LIB = `
def parse_csv(text):
    rows = []
    for line in text.split('\\n'):
        if line == '':
            continue
        fields = []
        field = ''
        in_quotes = False
        i = 0
        while i < len(line):
            c = line[i]
            if c == '"':
                in_quotes = not in_quotes
            elif c == ',' and not in_quotes:
                fields.append(field.strip())
                field = ''
            else:
                field += c
            i += 1
        rows.append(fields)
    return rows
`.trim();

// Part 2: both P1 bugs fixed; commas split inside quoted fields + "" escaped quotes produce empty string
const P2_LIB = `
def parse_csv(text):
    rows = []
    for line in text.split('\\n'):
        if line == '':
            continue
        fields = []
        field = ''
        in_quotes = False
        i = 0
        while i < len(line):
            c = line[i]
            if c == '"':
                in_quotes = not in_quotes
            elif c == ',':
                fields.append(field)
                field = ''
            else:
                field += c
            i += 1
        fields.append(field)
        rows.append(fields)
    return rows
`.trim();

// Part 3 (trap): all common bugs fixed; a " mid-unquoted-field wrongly enters quote mode
const P3_LIB = `
def parse_csv(text):
    rows = []
    for line in text.split('\\n'):
        if line == '':
            continue
        fields = []
        field = ''
        in_quotes = False
        i = 0
        while i < len(line):
            c = line[i]
            if c == '"':
                if in_quotes and i + 1 < len(line) and line[i + 1] == '"':
                    field += '"'
                    i += 1  # skip the second quote of the pair
                else:
                    in_quotes = not in_quotes
            elif c == ',' and not in_quotes:
                fields.append(field)
                field = ''
            else:
                field += c
            i += 1
        fields.append(field)
        rows.append(fields)
    return rows
`.trim();

// ── Shared solution harness ───────────────────────────────────────────────────

const SOLUTION_PY = `
from lib.parser import parse_csv

# Do not modify this file. Fix the bugs in lib/parser.py.
`.trim();

const TESTS_PY = `
from solution import parse_csv

# Use this file to try your own inputs. Output appears in the
# "tests.py output" panel below the test results when you click Run Tests.
#
# parse_csv(text) takes a CSV string and returns a list of rows,
# where each row is a list of string fields.

# Example 1: plain comma-separated values
print("simple:", parse_csv('a,b,c'))
# -> [['a', 'b', 'c']]

# Example 2: quoted field containing a comma
print("quoted:", parse_csv('"hello, world",42'))
# -> [['hello, world', '42']]

# Example 3: multiple rows
print("multiline:", parse_csv('name,age\\nalice,30\\nbob,25'))
# -> [['name', 'age'], ['alice', '30'], ['bob', '25']]

# Try your own:
# print(parse_csv('...'))
`.trim();

// ── Part 1 tests: last field + whitespace trim bugs ───────────────────────────

const P1_VISIBLE = [
  {
    id: 'csv-p1-v1',
    description: 'three plain fields: all three are returned',
    input: { text: 'a,b,c' },
    expectedOutput: [['a', 'b', 'c']],
  },
  {
    id: 'csv-p1-v2',
    description: 'field with leading/trailing spaces preserves the whitespace',
    input: { text: '  hello  , world ' },
    expectedOutput: [['  hello  ', ' world ']],
  },
  {
    id: 'csv-p1-v3',
    description: 'two-row CSV produces two rows with all fields',
    input: { text: '1,2,3\n4,5,6' },
    expectedOutput: [['1', '2', '3'], ['4', '5', '6']],
  },
  {
    id: 'csv-p1-v4',
    description: 'single field per row (no commas)',
    input: { text: 'alpha\nbeta\ngamma' },
    expectedOutput: [['alpha'], ['beta'], ['gamma']],
  },
];

const P1_HIDDEN = [
  {
    id: 'csv-p1-h1',
    description: 'trailing comma creates an empty field at the end',
    input: { text: 'a,b,' },
    expectedOutput: [['a', 'b', '']],
  },
  {
    id: 'csv-p1-h2',
    description: 'leading comma creates an empty field at the start',
    input: { text: ',b,c' },
    expectedOutput: [['', 'b', 'c']],
  },
  {
    id: 'csv-p1-h3',
    description: 'empty lines between rows are skipped',
    input: { text: 'a,b\n\nc,d' },
    expectedOutput: [['a', 'b'], ['c', 'd']],
  },
];

// ── Part 2 tests: quoted fields containing commas + escaped "" ─────────────────

const P2_VISIBLE = [
  {
    id: 'csv-p2-v1',
    description: 'quoted field containing a comma is treated as a single field',
    input: { text: '"hello, world",42' },
    expectedOutput: [['hello, world', '42']],
  },
  {
    id: 'csv-p2-v2',
    description: 'escaped quote "" inside a quoted field produces a single "',
    input: { text: '"say ""hello"""' },
    expectedOutput: [['say "hello"']],
  },
  {
    id: 'csv-p2-v3',
    description: 'quoted field followed by normal fields on the same row',
    input: { text: '"a,b",c,"d,e"' },
    expectedOutput: [['a,b', 'c', 'd,e']],
  },
];

const P2_HIDDEN = [
  {
    id: 'csv-p2-h1',
    description: 'empty quoted field "" is an empty string',
    input: { text: '"",b,""' },
    expectedOutput: [['', 'b', '']],
  },
  {
    id: 'csv-p2-h2',
    description: 'multiple escaped quotes inside one field',
    input: { text: '"it\'s a ""test"""' },
    expectedOutput: [["it's a \"test\""]],
  },
  {
    id: 'csv-p2-h3',
    description: 'quoted fields across multiple rows',
    input: { text: '"x,y",1\n"a,b",2' },
    expectedOutput: [['x,y', '1'], ['a,b', '2']],
  },
];

// ── Part 3 tests: mid-field quote treated as literal ──────────────────────────

const P3_VISIBLE = [
  {
    id: 'csv-p3-v1',
    description: 'a " appearing mid-unquoted-field is treated as a literal character',
    input: { text: 'abc"def,ghi' },
    expectedOutput: [['abc"def', 'ghi']],
  },
  {
    id: 'csv-p3-v2',
    description: 'URL with quotes in an unquoted field stays intact',
    input: { text: 'href="page.html",42' },
    expectedOutput: [['href="page.html"', '42']],
  },
];

const P3_HIDDEN = [
  {
    id: 'csv-p3-h1',
    description: 'quoted field works correctly alongside unquoted fields that contain literal quotes',
    input: { text: '"a,b",c"d",e' },
    expectedOutput: [['a,b', 'c"d"', 'e']],
  },
  {
    id: 'csv-p3-h2',
    description: 'multiple unquoted fields each containing a literal quote',
    input: { text: 'a"b,c"d,e"f' },
    expectedOutput: [['a"b', 'c"d', 'e"f']],
  },
];

// ── READMEs ───────────────────────────────────────────────────────────────────

const P1_README = `# CSV Parser, Part 1: Field Boundaries and Whitespace

## Background

\`lib/parser.py\` implements a CSV parser. \`parse_csv(text)\` takes a multi-line string and returns a list of rows, where each row is a list of field strings. Fields are separated by commas, empty lines are skipped, and consecutive commas produce empty string fields.

## Bug Report

Two bugs. The last field on every row is silently dropped: a row with three fields returns only two. Field values are also trimmed of leading and trailing whitespace, so a field like \`  padded  \` is returned as \`padded\`.

## What to Implement

- **\`parse_csv(text)\`** in \`lib/parser.py\`: return every field on each row and preserve field values exactly as they appear in the input with no whitespace trimming.
`;

const P2_README = `# CSV Parser, Part 2: Quoted Fields and Escaped Quotes

## Background

\`lib/parser.py\` is a CSV parser. Bugs from Part 1 are fixed. A field wrapped in double-quotes is a quoted field: commas inside it are not delimiters, and \`""\` inside it represents a single literal \`"\`.

## Bug Report

Two bugs. Commas inside quoted fields are treated as delimiters, splitting \`"hello, world"\` into two fields. Escaped quotes (\`""\`) inside a quoted field produce an empty string instead of a single \`"\`.

## What to Implement

- **\`parse_csv(text)\`** in \`lib/parser.py\`: treat fields beginning with \`"\` as quoted, suppressing comma splits inside them and expanding \`""\` to a single \`"\`.

## Notes

A quoted field ends at the next unescaped \`"\`. A \`"\` is unescaped if it is not immediately followed by another \`"\`.
`;

const P3_README = `# CSV Parser, Part 3: Mid-Field Quotes

## Background

\`lib/parser.py\` is a CSV parser. Bugs from Parts 1 and 2 are fixed. A field is quoted only if its first character is \`"\`; a \`"\` anywhere else in a field is a literal character.

## Bug Report

A \`"\` encountered mid-field incorrectly activates quote mode. A value like \`href="x"\` causes the parser to treat everything after the mid-field \`"\` as quoted, producing wrong output for the remainder of the row.

## What to Implement

- **\`parse_csv(text)\`** in \`lib/parser.py\`: enter quote mode only when \`"\` is the very first character of a new field; treat \`"\` anywhere else as a literal character.
`;

// ── Scenario export ───────────────────────────────────────────────────────────

export const csvParser = {
  id: 'csv-parser',
  title: 'CSV Parser',
  difficulty: 'Medium',
  durationMinutes: 25,
  tags: ['debugging', 'parsing', 'strings'],
  description:
    'A CSV parser drops the last field on every row, strips whitespace, ' +
    'mishandles quoted fields with commas, and enters quote mode at the wrong time. ' +
    'Read the character-by-character loop and fix each defect.',
  parts: [
    {
      title: 'Field Boundaries & Whitespace',
      readme: P1_README,
      starterFiles: {
        'lib/parser.py': P1_LIB,
        'solution.py': SOLUTION_PY,
        'tests.py': TESTS_PY,
      },
      visibleTests: P1_VISIBLE,
      hiddenTests: P1_HIDDEN,
      answer: {
        fixedCode: `def parse_csv(text):
    rows = []
    for line in text.split('\\n'):
        if line == '':
            continue
        fields = []
        field = ''
        in_quotes = False
        i = 0
        while i < len(line):
            c = line[i]
            if c == '"':
                in_quotes = not in_quotes
            elif c == ',' and not in_quotes:
                fields.append(field)  # Fix 2: no .strip(), preserve whitespace
                field = ''
            else:
                field += c
            i += 1
        fields.append(field)  # Fix 1: append the last field after the loop
        rows.append(fields)
    return rows`,
        explanation: 'Fix 1: added "fields.append(field)" before "rows.append(fields)". The while loop only appends a field when it hits a comma, so the final field after the last comma was always silently dropped. Fix 2: removed ".strip()" from the field append inside the loop; stripping trims meaningful leading and trailing whitespace from unquoted field values, which is not valid CSV behaviour.',
      },
    },
    {
      title: 'Quoted Fields & Escaped Quotes',
      readme: P2_README,
      starterFiles: {
        'lib/parser.py': P2_LIB,
        'solution.py': SOLUTION_PY,
        'tests.py': TESTS_PY,
      },
      visibleTests: P2_VISIBLE,
      hiddenTests: P2_HIDDEN,
      answer: {
        fixedCode: `def parse_csv(text):
    rows = []
    for line in text.split('\\n'):
        if line == '':
            continue
        fields = []
        field = ''
        in_quotes = False
        i = 0
        while i < len(line):
            c = line[i]
            if c == '"':
                if in_quotes and i + 1 < len(line) and line[i + 1] == '"':
                    field += '"'  # Fix: "" inside quotes → literal "
                    i += 1        # skip the second quote
                else:
                    in_quotes = not in_quotes
            elif c == ',' and not in_quotes:
                fields.append(field)
                field = ''
            else:
                field += c
            i += 1
        fields.append(field)
        rows.append(fields)
    return rows`,
        explanation: 'Added a look-ahead check: when inside a quoted field and the current character is a double-quote followed immediately by another double-quote, append a literal quote character to the field and skip both characters (i += 1 extra). The original code just toggled in_quotes on every quote, so the first " of a "" pair exited quote mode and the second re-entered it, producing an empty string rather than the intended escaped quote character.',
      },
    },
    {
      title: 'Mid-Field Quotes (Literal Characters)',
      readme: P3_README,
      starterFiles: {
        'lib/parser.py': P3_LIB,
        'solution.py': SOLUTION_PY,
        'tests.py': TESTS_PY,
      },
      visibleTests: P3_VISIBLE,
      hiddenTests: P3_HIDDEN,
      answer: {
        fixedCode: `def parse_csv(text):
    rows = []
    for line in text.split('\\n'):
        if line == '':
            continue
        fields = []
        field = ''
        in_quotes = False
        i = 0
        while i < len(line):
            c = line[i]
            if c == '"':
                if in_quotes and i + 1 < len(line) and line[i + 1] == '"':
                    field += '"'
                    i += 1
                elif not in_quotes and field == '':
                    # Fix: only enter quote mode at the very start of a field
                    in_quotes = True
                elif in_quotes:
                    in_quotes = False
                else:
                    field += c  # literal quote mid-unquoted-field
            elif c == ',' and not in_quotes:
                fields.append(field)
                field = ''
            else:
                field += c
            i += 1
        fields.append(field)
        rows.append(fields)
    return rows`,
        explanation: 'Changed the quote-toggle to only enter quote mode ("in_quotes = True") when the field is empty (field == ""), i.e. at the very start of a new field. A quote character that appears mid-way through an unquoted field is treated as a literal character appended to field. The original code toggled in_quotes on any quote regardless of position, causing mid-field quotes like the inch symbol in \'6"bolt\' to accidentally start a quoted section.',
      },
    },
  ],
  testRunner: {
    language: 'python',
    entryFile: 'solution.py',
    functionName: 'parse_csv',
    inputKeys: ['text'],
  },
};

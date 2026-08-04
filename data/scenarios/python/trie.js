// ── Buggy lib files (one per part) ───────────────────────────────────────────

// Part 1: search() returns True for prefixes (missing end-of-word check)
const P1_LIB = `
class Trie:
    def __init__(self):
        # Each node is a dict: {char: child_node, '$': True}
        # '$' marks that a complete word ends here.
        self.root = {}

    def insert(self, word):
        node = self.root
        for c in word:
            if c not in node:
                node[c] = {}
            node = node[c]
        node['$'] = True

    def search(self, word):
        node = self.root
        for c in word:
            if c not in node:
                return False
            node = node[c]
        return True

    def starts_with(self, prefix):
        node = self.root
        for c in prefix:
            if c not in node:
                return False
            node = node[c]
        return True

    def get_words_with_prefix(self, prefix):
        node = self.root
        for c in prefix:
            if c not in node:
                return []
            node = node[c]
        results = []
        self._dfs(node, prefix, results)
        return results

    def _dfs(self, node, current, results):
        if node.get('$'):
            results.append(current)
        for key, child in node.items():
            if key != '$':
                self._dfs(child, current + key, results)
`.trim();

// Part 2: search() fixed; get_words_with_prefix() passes reversed prefix to _dfs
const P2_LIB = `
class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for c in word:
            if c not in node:
                node[c] = {}
            node = node[c]
        node['$'] = True

    def search(self, word):
        node = self.root
        for c in word:
            if c not in node:
                return False
            node = node[c]
        return node.get('$') is True

    def starts_with(self, prefix):
        node = self.root
        for c in prefix:
            if c not in node:
                return False
            node = node[c]
        return True

    def get_words_with_prefix(self, prefix):
        node = self.root
        for c in prefix:
            if c not in node:
                return []
            node = node[c]
        results = []
        self._dfs(node, prefix[::-1], results)
        return results

    def _dfs(self, node, current, results):
        if node.get('$'):
            results.append(current)
        for key, child in node.items():
            if key != '$':
                self._dfs(child, current + key, results)
`.trim();

// Part 3 (trap): insert() lowercases; search/starts_with/get_words_with_prefix use original case
const P3_LIB = `
class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for c in word:
            key = c.lower()
            if key not in node:
                node[key] = {}
            node = node[key]
        node['$'] = True

    def search(self, word):
        node = self.root
        for c in word:
            if c not in node:
                return False
            node = node[c]
        return node.get('$') is True

    def starts_with(self, prefix):
        node = self.root
        for c in prefix:
            if c not in node:
                return False
            node = node[c]
        return True

    def get_words_with_prefix(self, prefix):
        node = self.root
        for c in prefix:
            if c not in node:
                return []
            node = node[c]
        results = []
        self._dfs(node, prefix, results)
        return results

    def _dfs(self, node, current, results):
        if node.get('$'):
            results.append(current)
        for key, child in node.items():
            if key != '$':
                self._dfs(child, current + key, results)
`.trim();

// ── Shared solution harness ───────────────────────────────────────────────────

const SOLUTION_PY = `
from lib.trie import Trie


def simulate(operations):
    """
    Runs a sequence of Trie operations and returns the results.

    Operations:
        {'function': 'insert',               'word': str}
        {'function': 'search',               'word': str}              -> bool
        {'function': 'starts_with',          'prefix': str}            -> bool
        {'function': 'get_words_with_prefix','prefix': str}            -> list[str]

    Only non-insert operations contribute to the returned results list.

    Do not modify this file. Fix the bugs in lib/trie.py.
    """
    trie = Trie()
    results = []
    for op in operations:
        action = op['function']
        if action == 'insert':
            trie.insert(op['word'])
        elif action == 'search':
            results.append(trie.search(op['word']))
        elif action == 'starts_with':
            results.append(trie.starts_with(op['prefix']))
        elif action == 'get_words_with_prefix':
            results.append(trie.get_words_with_prefix(op['prefix']))
    return results
`.trim();

const TESTS_PY = `
from solution import simulate

# Use this file to try your own inputs. Output appears in the
# "tests.py output" panel below the test results when you click Run Tests.
#
# Available functions. Use the exact names from lib/trie.py:
#   {'function': 'insert',               'word':   'apple'}  : insert a word (no return value)
#   {'function': 'search',               'word':   'apple'}  : True if that exact word was inserted
#   {'function': 'starts_with',          'prefix': 'app'}    : True if any inserted word starts with prefix
#   {'function': 'get_words_with_prefix','prefix': 'app'}    : list of all inserted words with that prefix
#
# simulate() returns one result per non-insert call (inserts are skipped).

# Example 1: search vs starts_with
result = simulate([
    {'function': 'insert',               'word':   'apple'},
    {'function': 'search',               'word':   'apple'},   # True  : exact word exists
    {'function': 'search',               'word':   'app'},     # False : prefix only, not a full word
    {'function': 'starts_with',          'prefix': 'app'},     # True  : "apple" starts with "app"
    {'function': 'search',               'word':   'banana'},  # False : never inserted
])
print(result)
# -> [True, False, True, False]

# Try your own:
# result = simulate([...])
# print(result)
`.trim();

// ── Part 1 tests: search() returns True for prefixes ─────────────────────────

const P1_VISIBLE = [
  {
    id: 'trie-p1-v1',
    description: 'search("apple") returns True after insert("apple")',
    input: { operations: [
      { function: 'insert', word: 'apple' },
      { function: 'search', word: 'apple' },
    ]},
    expectedOutput: [true],
  },
  {
    id: 'trie-p1-v2',
    description: 'search("app") returns False when only "apple" was inserted',
    input: { operations: [
      { function: 'insert', word: 'apple' },
      { function: 'search', word: 'app' },
    ]},
    expectedOutput: [false],
  },
  {
    id: 'trie-p1-v3',
    description: 'search("app") returns True when "app" was explicitly inserted',
    input: { operations: [
      { function: 'insert', word: 'apple' },
      { function: 'insert', word: 'app' },
      { function: 'search', word: 'app' },
    ]},
    expectedOutput: [true],
  },
  {
    id: 'trie-p1-v4',
    description: 'startsWith returns True for a valid prefix and False for unknown',
    input: { operations: [
      { function: 'insert', word: 'apple' },
      { function: 'starts_with', prefix: 'app' },
      { function: 'starts_with', prefix: 'xyz' },
    ]},
    expectedOutput: [true, false],
  },
];

const P1_HIDDEN = [
  {
    id: 'trie-p1-h1',
    description: 'search a word whose prefix matches another inserted word',
    input: { operations: [
      { function: 'insert', word: 'application' },
      { function: 'search', word: 'app' },
      { function: 'search', word: 'appli' },
      { function: 'search', word: 'application' },
    ]},
    expectedOutput: [false, false, true],
  },
  {
    id: 'trie-p1-h2',
    description: 'search returns False for an entirely unknown word',
    input: { operations: [
      { function: 'insert', word: 'hello' },
      { function: 'search', word: 'world' },
    ]},
    expectedOutput: [false],
  },
  {
    id: 'trie-p1-h3',
    description: 'multiple words: search correctly identifies each',
    input: { operations: [
      { function: 'insert', word: 'cat' },
      { function: 'insert', word: 'car' },
      { function: 'insert', word: 'card' },
      { function: 'search', word: 'ca' },
      { function: 'search', word: 'cat' },
      { function: 'search', word: 'car' },
      { function: 'search', word: 'card' },
    ]},
    expectedOutput: [false, true, true, true],
  },
];

// ── Part 2 tests: getWordsWithPrefix() reversed prefix ───────────────────────

const P2_VISIBLE = [
  {
    id: 'trie-p2-v1',
    description: 'getWordsWithPrefix("app") returns ["app", "apple"] in insertion order',
    input: { operations: [
      { function: 'insert', word: 'app' },
      { function: 'insert', word: 'apple' },
      { function: 'insert', word: 'banana' },
      { function: 'get_words_with_prefix', prefix: 'app' },
    ]},
    expectedOutput: [['app', 'apple']],
  },
  {
    id: 'trie-p2-v2',
    description: 'getWordsWithPrefix returns [] when prefix is not in trie',
    input: { operations: [
      { function: 'insert', word: 'apple' },
      { function: 'get_words_with_prefix', prefix: 'xyz' },
    ]},
    expectedOutput: [[]],
  },
  {
    id: 'trie-p2-v3',
    description: 'prefix that is itself a complete word is included in results',
    input: { operations: [
      { function: 'insert', word: 'do' },
      { function: 'insert', word: 'dog' },
      { function: 'insert', word: 'door' },
      { function: 'get_words_with_prefix', prefix: 'do' },
    ]},
    expectedOutput: [['do', 'dog', 'door']],
  },
];

const P2_HIDDEN = [
  {
    id: 'trie-p2-h1',
    description: 'getWordsWithPrefix("") returns all inserted words',
    input: { operations: [
      { function: 'insert', word: 'ant' },
      { function: 'insert', word: 'bee' },
      { function: 'get_words_with_prefix', prefix: '' },
    ]},
    expectedOutput: [['ant', 'bee']],
  },
  {
    id: 'trie-p2-h2',
    description: 'single-character prefix covers multiple words',
    input: { operations: [
      { function: 'insert', word: 'cat' },
      { function: 'insert', word: 'car' },
      { function: 'insert', word: 'dog' },
      { function: 'get_words_with_prefix', prefix: 'c' },
    ]},
    expectedOutput: [['cat', 'car']],
  },
];

// ── Part 3 tests (trap): case-insensitive normalisation ───────────────────────

const P3_VISIBLE = [
  {
    id: 'trie-p3-v1',
    description: 'insert("Apple"): search("apple"), search("Apple"), search("APPLE") all True',
    input: { operations: [
      { function: 'insert', word: 'Apple' },
      { function: 'search', word: 'apple' },
      { function: 'search', word: 'Apple' },
      { function: 'search', word: 'APPLE' },
    ]},
    expectedOutput: [true, true, true],
  },
  {
    id: 'trie-p3-v2',
    description: 'startsWith is also case-insensitive',
    input: { operations: [
      { function: 'insert', word: 'Banana' },
      { function: 'starts_with', prefix: 'ban' },
      { function: 'starts_with', prefix: 'BAN' },
      { function: 'starts_with', prefix: 'Ban' },
    ]},
    expectedOutput: [true, true, true],
  },
  {
    id: 'trie-p3-v3',
    description: 'getWordsWithPrefix normalises the prefix and returns lowercased words',
    input: { operations: [
      { function: 'insert', word: 'CAT' },
      { function: 'insert', word: 'CATFISH' },
      { function: 'get_words_with_prefix', prefix: 'cat' },
    ]},
    expectedOutput: [['cat', 'catfish']],
  },
];

const P3_HIDDEN = [
  {
    id: 'trie-p3-h1',
    description: 'mixed-case inserts resolve to the same canonical form',
    input: { operations: [
      { function: 'insert', word: 'GoLang' },
      { function: 'insert', word: 'golang' },
      { function: 'search', word: 'GOLANG' },
      { function: 'get_words_with_prefix', prefix: 'GO' },
    ]},
    expectedOutput: [true, ['golang']],
  },
  {
    id: 'trie-p3-h2',
    description: 'case-insensitive startsWith does not false-positive on a different word',
    input: { operations: [
      { function: 'insert', word: 'Hello' },
      { function: 'starts_with', prefix: 'HEL' },
      { function: 'starts_with', prefix: 'WORLD' },
    ]},
    expectedOutput: [true, false],
  },
  {
    id: 'trie-p3-h3',
    description: 'getWordsWithPrefix with an uppercase prefix must return lowercase words: catches per-char lowering without lowercasing the DFS seed',
    input: { operations: [
      { function: 'insert', word: 'python' },
      { function: 'insert', word: 'pytest' },
      { function: 'get_words_with_prefix', prefix: 'PY' },
    ]},
    expectedOutput: [['python', 'pytest']],
  },
];

// ── READMEs ───────────────────────────────────────────────────────────────────

const P1_README = `# Trie, Part 1: Exact-Word Search

## Background

\`lib/trie.py\` implements a prefix tree using plain Python dicts as nodes. The special key \`'$'\` marks that a complete word ends at that node.

## Bug Report

\`search(word)\` returns \`True\` for words that were never inserted. After \`insert("apple")\`, \`search("app")\` returns \`True\` even though \`"app"\` was never inserted, while \`search("banana")\` correctly returns \`False\`.

## What to Implement

- **\`search(word)\`** in \`lib/trie.py\`: return \`True\` only for words that were inserted exactly; return \`False\` for everything else, including proper prefixes of inserted words.
`;

const P2_README = `# Trie, Part 2: get_words_with_prefix()

## Background

\`lib/trie.py\` is a prefix tree. The \`search()\` bug from Part 1 is fixed.

## Bug Report

\`get_words_with_prefix(prefix)\` should return every inserted word that begins with \`prefix\`. Instead it returns words whose leading characters are the prefix reversed: \`get_words_with_prefix("app")\` yields \`["ppa", "ppale"]\` instead of \`["app", "apple"]\`.

## What to Implement

- **\`get_words_with_prefix(prefix)\`** in \`lib/trie.py\`: collect and return all words in the trie that start with \`prefix\`.
`;

const P3_README = `# Trie, Part 3: Case-Insensitive Operations

## Background

\`lib/trie.py\` is a prefix tree. Bugs from Parts 1–2 are fixed. \`insert()\` already normalises every character to lowercase via \`c.lower()\` before storing it.

## Bug Report

\`search()\`, \`starts_with()\`, and \`get_words_with_prefix()\` traverse using the original (unnormalised) input characters. Mixed-case lookups silently fail: after \`insert("Apple")\` (stored as \`"apple"\`), \`search("Apple")\` returns \`False\` because it looks for \`'A'\`, which does not exist in the trie.

## What to Implement

- **\`search(word)\`**, **\`starts_with(prefix)\`**, **\`get_words_with_prefix(prefix)\`** in \`lib/trie.py\`: normalise each input character to lowercase when traversing, so lookups match the stored keys regardless of input case.

## Notes

Returned words must be fully lowercase regardless of the casing of the original \`insert()\` or lookup input.
`;

// ── Scenario export ───────────────────────────────────────────────────────────

export const trie = {
  id: 'trie',
  title: 'Prefix Tree (Trie)',
  difficulty: 'Easy',
  durationMinutes: 30,
  tags: ['debugging', 'data-structures', 'recursion'],
  description:
    'A trie has three bugs: search() returns True for prefixes, ' +
    'get_words_with_prefix() builds results with the prefix reversed, ' +
    'and case normalisation is inconsistent across methods. ' +
    'Trace the node structure and fix each defect.',
  parts: [
    {
      title: 'Exact-Word Search',
      readme: P1_README,
      starterFiles: {
        'lib/trie.py': P1_LIB,
        'solution.py': SOLUTION_PY,
        'tests.py': TESTS_PY,
      },
      visibleTests: P1_VISIBLE,
      hiddenTests: P1_HIDDEN,
      answer: {
        fixedCode: `class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for c in word:
            if c not in node:
                node[c] = {}
            node = node[c]
        node['$'] = True

    def search(self, word):
        node = self.root
        for c in word:
            if c not in node:
                return False
            node = node[c]
        return node.get('$') is True  # Fix: check end-of-word marker

    def starts_with(self, prefix):
        node = self.root
        for c in prefix:
            if c not in node:
                return False
            node = node[c]
        return True

    def get_words_with_prefix(self, prefix):
        node = self.root
        for c in prefix:
            if c not in node:
                return []
            node = node[c]
        results = []
        self._dfs(node, prefix, results)
        return results

    def _dfs(self, node, current, results):
        if node.get('$'):
            results.append(current)
        for key, child in node.items():
            if key != '$':
                self._dfs(child, current + key, results)`,
        explanation: 'Changed the return value of search() from "return True" to "return node.get(\'$\') is True". After traversing all characters the node pointer lands on the final character\'s node, but that node exists for any word that is a prefix of a longer inserted word. The \'$\' sentinel marks that a complete word ends there; without this check, search("app") returns True even if only "apple" was inserted.',
      },
    },
    {
      title: 'get_words_with_prefix()',
      readme: P2_README,
      starterFiles: {
        'lib/trie.py': P2_LIB,
        'solution.py': SOLUTION_PY,
        'tests.py': TESTS_PY,
      },
      visibleTests: P2_VISIBLE,
      hiddenTests: P2_HIDDEN,
      answer: {
        fixedCode: `class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for c in word:
            if c not in node:
                node[c] = {}
            node = node[c]
        node['$'] = True

    def search(self, word):
        node = self.root
        for c in word:
            if c not in node:
                return False
            node = node[c]
        return node.get('$') is True

    def starts_with(self, prefix):
        node = self.root
        for c in prefix:
            if c not in node:
                return False
            node = node[c]
        return True

    def get_words_with_prefix(self, prefix):
        node = self.root
        for c in prefix:
            if c not in node:
                return []
            node = node[c]
        results = []
        self._dfs(node, prefix, results)  # Fix: pass prefix, not prefix[::-1]
        return results

    def _dfs(self, node, current, results):
        if node.get('$'):
            results.append(current)
        for key, child in node.items():
            if key != '$':
                self._dfs(child, current + key, results)`,
        explanation: 'Changed "self._dfs(node, prefix[::-1], results)" to "self._dfs(node, prefix, results)". The DFS accumulates characters by appending them to the current string; starting with the reversed prefix ("ppa" instead of "app") produced reversed word prefixes in all returned results. The prefix must be passed as-is so that characters appended during traversal extend it correctly.',
      },
    },
    {
      title: 'Case-Insensitive Operations',
      readme: P3_README,
      starterFiles: {
        'lib/trie.py': P3_LIB,
        'solution.py': SOLUTION_PY,
        'tests.py': TESTS_PY,
      },
      visibleTests: P3_VISIBLE,
      hiddenTests: P3_HIDDEN,
      answer: {
        fixedCode: `class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for c in word:
            key = c.lower()
            if key not in node:
                node[key] = {}
            node = node[key]
        node['$'] = True

    def search(self, word):
        node = self.root
        for c in word:
            if c.lower() not in node:  # Fix: normalise to lowercase
                return False
            node = node[c.lower()]
        return node.get('$') is True

    def starts_with(self, prefix):
        node = self.root
        for c in prefix:
            if c.lower() not in node:  # Fix: normalise to lowercase
                return False
            node = node[c.lower()]
        return True

    def get_words_with_prefix(self, prefix):
        node = self.root
        for c in prefix:
            if c.lower() not in node:  # Fix: normalise to lowercase
                return []
            node = node[c.lower()]
        results = []
        self._dfs(node, prefix.lower(), results)
        return results

    def _dfs(self, node, current, results):
        if node.get('$'):
            results.append(current)
        for key, child in node.items():
            if key != '$':
                self._dfs(child, current + key, results)`,
        explanation: 'Applied c.lower() consistently in search(), starts_with(), and get_words_with_prefix() when looking up each character in the trie. insert() already stored keys in lowercase, so lookups using the original case never found nodes and always returned False/empty. All three lookup methods must normalise their character to lowercase before the dictionary lookup to match the case-normalised keys stored on insert.',
      },
    },
  ],
  testRunner: {
    language: 'python',
    entryFile: 'solution.py',
    functionName: 'simulate',
    inputKeys: ['operations'],
  },
};

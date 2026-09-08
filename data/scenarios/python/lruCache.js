// ── Buggy lib files (one per part) ───────────────────────────────────────────

// Part 1: missing tail.prev = head sentinel link + wrong eviction end
const P1_LIB = `
class Node:
    def __init__(self, key=None, val=None):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}
        self.head = Node()   # sentinel: LRU end
        self.tail = Node()   # sentinel: MRU end
        self.head.next = self.tail
        # Without it, the first _add_last() crashes on self.tail.prev.next

    def get(self, key):
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._add_last(node)
        return node.val

    def put(self, key, value):
        if key in self.cache:
            node = self.cache[key]
            node.val = value
            self._remove(node)
            self._add_last(node)
            return
        node = Node(key, value)
        self.cache[key] = node
        self._add_last(node)
        if len(self.cache) > self.capacity:
            evict = self.tail.prev
            self._remove(evict)
            del self.cache[evict.key]

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_last(self, node):
        node.prev = self.tail.prev
        node.next = self.tail
        self.tail.prev.next = node
        self.tail.prev = node
`.trim();

// Part 2: get() doesn't update access order
const P2_LIB = `
class Node:
    def __init__(self, key=None, val=None):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key):
        if key not in self.cache:
            return -1
        return self.cache[key].val   # missing: _remove + _add_last

    def put(self, key, value):
        if key in self.cache:
            self.cache[key].val = value
            return
        node = Node(key, value)
        self.cache[key] = node
        self._add_last(node)
        if len(self.cache) > self.capacity:
            evict = self.head.next
            self._remove(evict)
            del self.cache[evict.key]

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_last(self, node):
        node.prev = self.tail.prev
        node.next = self.tail
        self.tail.prev.next = node
        self.tail.prev = node
`.trim();

// Part 3 (trap): put(existing key) updates value but doesn't move to MRU
const P3_LIB = `
class Node:
    def __init__(self, key=None, val=None):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key):
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._add_last(node)
        return node.val

    # Trap: updates the value of an existing key but doesn't reorder the node
    def put(self, key, value):
        if key in self.cache:
            self.cache[key].val = value
            return
        node = Node(key, value)
        self.cache[key] = node
        self._add_last(node)
        if len(self.cache) > self.capacity:
            evict = self.head.next
            self._remove(evict)
            del self.cache[evict.key]

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_last(self, node):
        node.prev = self.tail.prev
        node.next = self.tail
        self.tail.prev.next = node
        self.tail.prev = node
`.trim();

// ── Shared solution harness ───────────────────────────────────────────────────

const SOLUTION_PY = `
from lib.lru_cache import LRUCache


def simulate(capacity, operations):
    """
    Runs a sequence of LRU cache operations and returns results of every get().

    Operations:
        {'function': 'put', 'key': int, 'value': int}
        {'function': 'get', 'key': int}   -> appends result to return list

    Do not modify this file. Fix the bugs in lib/lru_cache.py.
    """
    cache = LRUCache(capacity)
    results = []
    for op in operations:
        if op['function'] == 'put':
            cache.put(op['key'], op['value'])
        elif op['function'] == 'get':
            results.append(cache.get(op['key']))
    return results
`.trim();

const TESTS_PY = `
from solution import simulate

# Use this file to try your own inputs. Output appears in the
# "tests.py output" panel below the test results when you click Run Tests.
#
# simulate(capacity, operations): first arg is the cache size.
# Available functions. Use the exact names from lib/lru_cache.py:
#   {'function': 'put', 'key': k, 'value': v}  : insert or update a key (no return value)
#   {'function': 'get', 'key': k}               : returns the value, or -1 if not in cache
#
# simulate() returns one result per get() call.

# Example: capacity 2, so the least-recently-used key is evicted when full
result = simulate(2, [
    {'function': 'put', 'key': 1, 'value': 10},
    {'function': 'put', 'key': 2, 'value': 20},
    {'function': 'get', 'key': 1},               # -> 10  (key 1 is now most-recent)
    {'function': 'put', 'key': 3, 'value': 30},  # cache full, evicts key 2 (least-recent)
    {'function': 'get', 'key': 2},               # -> -1  (evicted)
    {'function': 'get', 'key': 3},               # -> 30
])
print(result)
# -> [10, -1, 30]

# Try your own:
# result = simulate(capacity, [...])
# print(result)
`.trim();

// ── Tests ─────────────────────────────────────────────────────────────────────

const P1_VISIBLE = [
  {
    id: 'lru-p1-v1',
    description: 'get on a missing key returns -1',
    input: {
      capacity: 2,
      operations: [{ function: 'get', key: 1 }],
    },
    expectedOutput: [-1],
  },
  {
    id: 'lru-p1-v2',
    description: 'put then get returns the stored value',
    input: {
      capacity: 2,
      operations: [
        { function: 'put', key: 1, value: 10 },
        { function: 'get', key: 1 },
      ],
    },
    expectedOutput: [10],
  },
  {
    id: 'lru-p1-v3',
    description: 'LRU eviction: third put evicts key 1 (least recently used)',
    input: {
      capacity: 2,
      operations: [
        { function: 'put', key: 1, value: 1 },
        { function: 'put', key: 2, value: 2 },
        { function: 'put', key: 3, value: 3 },
        { function: 'get', key: 1 },
        { function: 'get', key: 2 },
        { function: 'get', key: 3 },
      ],
    },
    expectedOutput: [-1, 2, 3],
  },
];

const P1_HIDDEN = [
  {
    id: 'lru-p1-h1',
    description: 'capacity-1 cache: every new put evicts the only resident',
    input: {
      capacity: 1,
      operations: [
        { function: 'put', key: 1, value: 1 },
        { function: 'put', key: 2, value: 2 },
        { function: 'get', key: 1 },
        { function: 'get', key: 2 },
      ],
    },
    expectedOutput: [-1, 2],
  },
  {
    id: 'lru-p1-h2',
    description: 'two puts within capacity: both keys retrievable',
    input: {
      capacity: 3,
      operations: [
        { function: 'put', key: 1, value: 100 },
        { function: 'put', key: 2, value: 200 },
        { function: 'get', key: 1 },
        { function: 'get', key: 2 },
      ],
    },
    expectedOutput: [100, 200],
  },
];

const P2_VISIBLE = [
  {
    id: 'lru-p2-v1',
    description: 'get() promotes a key so it is not evicted next',
    input: {
      capacity: 2,
      operations: [
        { function: 'put', key: 1, value: 1 },
        { function: 'put', key: 2, value: 2 },
        { function: 'get', key: 1 },
        { function: 'put', key: 3, value: 3 },
        { function: 'get', key: 2 },
        { function: 'get', key: 1 },
        { function: 'get', key: 3 },
      ],
    },
    expectedOutput: [1, -1, 1, 3],
  },
  {
    id: 'lru-p2-v2',
    description: 'repeated gets do not evict the accessed key',
    input: {
      capacity: 2,
      operations: [
        { function: 'put', key: 1, value: 1 },
        { function: 'put', key: 2, value: 2 },
        { function: 'get', key: 1 },
        { function: 'get', key: 1 },
        { function: 'put', key: 3, value: 3 },
        { function: 'get', key: 1 },
        { function: 'get', key: 2 },
      ],
    },
    expectedOutput: [1, 1, 1, -1],
  },
];

const P2_HIDDEN = [
  {
    id: 'lru-p2-h1',
    description: 'LRU order tracks gets across three keys',
    input: {
      capacity: 3,
      operations: [
        { function: 'put', key: 1, value: 1 },
        { function: 'put', key: 2, value: 2 },
        { function: 'put', key: 3, value: 3 },
        { function: 'get', key: 1 },
        { function: 'put', key: 4, value: 4 },
        { function: 'get', key: 2 },
        { function: 'get', key: 3 },
        { function: 'get', key: 4 },
      ],
    },
    expectedOutput: [1, -1, 3, 4],
  },
];

const P3_VISIBLE = [
  {
    id: 'lru-p3-v1',
    description: 'put() on an existing key counts as a recent access',
    input: {
      capacity: 2,
      operations: [
        { function: 'put', key: 1, value: 1 },
        { function: 'put', key: 2, value: 2 },
        { function: 'put', key: 1, value: 10 },
        { function: 'put', key: 3, value: 3 },
        { function: 'get', key: 1 },
        { function: 'get', key: 2 },
        { function: 'get', key: 3 },
      ],
    },
    expectedOutput: [10, -1, 3],
  },
  {
    id: 'lru-p3-v2',
    description: 'put() updates the value and promotes the node to MRU',
    input: {
      capacity: 2,
      operations: [
        { function: 'put', key: 'a', value: 1 },
        { function: 'put', key: 'b', value: 2 },
        { function: 'put', key: 'a', value: 99 },
        { function: 'put', key: 'c', value: 3 },
        { function: 'get', key: 'b' },
        { function: 'get', key: 'a' },
      ],
    },
    expectedOutput: [-1, 99],
  },
];

const P3_HIDDEN = [
  {
    id: 'lru-p3-h1',
    description: 'interleaved puts and updates with full eviction pressure',
    input: {
      capacity: 2,
      operations: [
        { function: 'put', key: 1, value: 1 },
        { function: 'put', key: 2, value: 2 },
        { function: 'put', key: 2, value: 22 },
        { function: 'put', key: 3, value: 3 },
        { function: 'get', key: 1 },
        { function: 'get', key: 2 },
        { function: 'get', key: 3 },
      ],
    },
    expectedOutput: [-1, 22, 3],
  },
];

// ── READMEs ───────────────────────────────────────────────────────────────────

const P1_README = `# LRU Cache, Part 1: Doubly-Linked List Setup and Eviction

## Background

\`lib/lru_cache.py\` implements an LRU cache using a hash map and a doubly-linked list. Sentinel nodes \`head\` (LRU end) and \`tail\` (MRU end) bracket all real nodes and simplify pointer operations.

## Bug Report

There are two bugs. First, the constructor sets \`self.head.next = self.tail\` but never sets \`self.tail.prev = self.head\`, so \`_add_last()\` crashes on the very first \`put()\` when it dereferences \`self.tail.prev\`. Second, when the cache exceeds capacity, the code evicts \`self.tail.prev\` (the MRU node) instead of \`self.head.next\` (the LRU node), so the most-recently-used entry is discarded instead of the oldest.

## What to Implement

- **\`__init__\`** in \`lib/lru_cache.py\`: complete the sentinel link so \`head\` and \`tail\` point to each other in both directions.
- **\`put(key, value)\`** in \`lib/lru_cache.py\`: evict from the correct end of the list when over capacity.
`;

const P2_README = `# LRU Cache, Part 2: get() Order Update

## Background

\`lib/lru_cache.py\` is an LRU cache backed by a hash map and doubly-linked list. Bugs from Part 1 are fixed.

## Bug Report

\`get(key)\` returns the correct value but does not move the accessed node to the MRU end. A key that is read stays at its old position in the list and can be evicted on the next insertion as if it had never been accessed.

## What to Implement

- **\`get(key)\`** in \`lib/lru_cache.py\`: after retrieving the node, remove it from its current position and reinsert it at the MRU end before returning the value.
`;

const P3_README = `# LRU Cache, Part 3: put() on an Existing Key

## Background

\`lib/lru_cache.py\` is an LRU cache backed by a hash map and doubly-linked list. Bugs from Parts 1 and 2 are fixed.

## Bug Report

When \`put(key, value)\` is called for a key already in the cache, the value is updated but the node is not moved to the MRU end. The updated key stays at its old position and is treated as if it was never recently accessed, making it a candidate for premature eviction.

## What to Implement

- **\`put(key, value)\`** in \`lib/lru_cache.py\`: when updating an existing key's value, also move its node to the MRU end.
`;

// ── Scenario export ───────────────────────────────────────────────────────────

export const lruCache = {
  id: 'lru-cache',
  title: 'LRU Cache',
  difficulty: 'Easy',
  durationMinutes: 35,
  tags: ['debugging', 'data-structures', 'linked-list'],
  description:
    'An LRU cache built on a doubly-linked list has three bugs: ' +
    'the sentinel link is missing so the first put crashes, ' +
    'eviction hits the MRU end instead of LRU, ' +
    'and get() / put(existing) do not promote nodes to MRU. ' +
    'Trace the pointer manipulations to fix each defect.',
  parts: [
    {
      title: 'Doubly-Linked List Setup & Eviction',
      readme: P1_README,
      starterFiles: {
        'lib/lru_cache.py': P1_LIB,
        'solution.py': SOLUTION_PY,
        'tests.py': TESTS_PY,
      },
      visibleTests: P1_VISIBLE,
      hiddenTests: P1_HIDDEN,
      answer: {
        fixedCode: `class Node:
    def __init__(self, key=None, val=None):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head  # Fix 1: establish the back-link

    def get(self, key):
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._add_last(node)
        return node.val

    def put(self, key, value):
        if key in self.cache:
            node = self.cache[key]
            node.val = value
            self._remove(node)
            self._add_last(node)
            return
        node = Node(key, value)
        self.cache[key] = node
        self._add_last(node)
        if len(self.cache) > self.capacity:
            evict = self.head.next  # Fix 2: evict from LRU end, not MRU
            self._remove(evict)
            del self.cache[evict.key]

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_last(self, node):
        node.prev = self.tail.prev
        node.next = self.tail
        self.tail.prev.next = node
        self.tail.prev = node`,
        explanation: 'Fix 1: added self.tail.prev = self.head in __init__ so the sentinel doubly-linked list is fully connected before any insertions. Without it, _add_last() crashes on self.tail.prev.next during the first put(). Fix 2: changed the eviction target from self.tail.prev (MRU end) to self.head.next (LRU end), so the least-recently-used entry is correctly evicted when the cache is over capacity.',
      },
    },
    {
      title: 'get() Order Update',
      readme: P2_README,
      starterFiles: {
        'lib/lru_cache.py': P2_LIB,
        'solution.py': SOLUTION_PY,
        'tests.py': TESTS_PY,
      },
      visibleTests: P2_VISIBLE,
      hiddenTests: P2_HIDDEN,
      answer: {
        fixedCode: `class Node:
    def __init__(self, key=None, val=None):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key):
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)    # Fix: promote accessed node to MRU
        self._add_last(node)
        return node.val

    def put(self, key, value):
        if key in self.cache:
            self.cache[key].val = value
            return
        node = Node(key, value)
        self.cache[key] = node
        self._add_last(node)
        if len(self.cache) > self.capacity:
            evict = self.head.next
            self._remove(evict)
            del self.cache[evict.key]

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_last(self, node):
        node.prev = self.tail.prev
        node.next = self.tail
        self.tail.prev.next = node
        self.tail.prev = node`,
        explanation: 'Added self._remove(node) and self._add_last(node) inside get() before returning the value. A cache access must move the node to the MRU end so it is last in line for eviction; without these two calls the node stays at its original position and can be incorrectly evicted even though it was just accessed.',
      },
    },
    {
      title: 'put() on an Existing Key',
      readme: P3_README,
      starterFiles: {
        'lib/lru_cache.py': P3_LIB,
        'solution.py': SOLUTION_PY,
        'tests.py': TESTS_PY,
      },
      visibleTests: P3_VISIBLE,
      hiddenTests: P3_HIDDEN,
      answer: {
        fixedCode: `class Node:
    def __init__(self, key=None, val=None):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key):
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._add_last(node)
        return node.val

    def put(self, key, value):
        if key in self.cache:
            node = self.cache[key]
            node.val = value
            self._remove(node)    # Fix: treat update as a recent access
            self._add_last(node)
            return
        node = Node(key, value)
        self.cache[key] = node
        self._add_last(node)
        if len(self.cache) > self.capacity:
            evict = self.head.next
            self._remove(evict)
            del self.cache[evict.key]

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_last(self, node):
        node.prev = self.tail.prev
        node.next = self.tail
        self.tail.prev.next = node
        self.tail.prev = node`,
        explanation: 'In the existing-key branch of put(), added self._remove(node) and self._add_last(node) after updating node.val. The spec treats a put() on an existing key as a recent access, so the node must move to the MRU end; without the reorder, the updated key stays at its old position and becomes a candidate for eviction as if it had never been touched.',
      },
    },
  ],
  testRunner: {
    language: 'python',
    entryFile: 'solution.py',
    functionName: 'simulate',
    inputKeys: ['capacity', 'operations'],
  },
};

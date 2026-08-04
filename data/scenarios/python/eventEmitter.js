// ── Buggy lib files (one per part) ───────────────────────────────────────────

// Part 1: emit() reverses order + off() deletes entire event
const P1_LIB = `
class EventEmitter:
    def __init__(self):
        self._listeners = {}

    def on(self, event, fn):
        if event not in self._listeners:
            self._listeners[event] = []
        self._listeners[event].append(fn)
        return self

    def once(self, event, fn):
        def wrapper(*args):
            fn(*args)
        wrapper._original = fn
        return self.on(event, wrapper)

    def off(self, event, fn):
        if event not in self._listeners:
            return self
        del self._listeners[event]  # Bug: removes ALL listeners for this event
        return self

    def emit(self, event, *args):
        fns = self._listeners.get(event, [])
        if not fns:
            return False
        for f in reversed(list(fns)):  # Bug: fires in reverse insertion order
            f(*args)
        return True
`.trim();

// Part 2: once() never removes itself
const P2_LIB = `
class EventEmitter:
    def __init__(self):
        self._listeners = {}

    def on(self, event, fn):
        if event not in self._listeners:
            self._listeners[event] = []
        self._listeners[event].append(fn)
        return self

    def once(self, event, fn):
        def wrapper(*args):
            fn(*args)  # Bug: missing self.off(event, wrapper)
        wrapper._original = fn
        return self.on(event, wrapper)

    def off(self, event, fn):
        if event not in self._listeners:
            return self
        self._listeners[event] = [
            l for l in self._listeners[event] if l is not fn
        ]
        return self

    def emit(self, event, *args):
        fns = self._listeners.get(event, [])
        if not fns:
            return False
        for f in list(fns):
            f(*args)
        return True
`.trim();

// Part 3 (trap): off() can't cancel once() listeners, doesn't check _original
const P3_LIB = `
class EventEmitter:
    def __init__(self):
        self._listeners = {}

    def on(self, event, fn):
        if event not in self._listeners:
            self._listeners[event] = []
        self._listeners[event].append(fn)
        return self

    def once(self, event, fn):
        def wrapper(*args):
            self.off(event, wrapper)
            fn(*args)
        wrapper._original = fn
        return self.on(event, wrapper)

    def off(self, event, fn):
        if event not in self._listeners:
            return self
        # Bug: only matches by identity, can't cancel a once() wrapper via the original fn
        self._listeners[event] = [l for l in self._listeners[event] if l is not fn]
        return self

    def emit(self, event, *args):
        fns = self._listeners.get(event, [])
        if not fns:
            return False
        for f in list(fns):
            f(*args)
        return True
`.trim();

// ── Shared solution harness ───────────────────────────────────────────────────

const SOLUTION_PY = `
from lib.event_emitter import EventEmitter


def simulate(operations):
    """
    Runs a sequence of EventEmitter operations and returns the invocation log.

    Operations:
        {'function': 'on',          'event': str, 'listener': str}
        {'function': 'once',        'event': str, 'listener': str}
        {'function': 'off',         'event': str, 'listener': str}
        {'function': 'emit',        'event': str, 'args': list}
        {'function': 'once_reemit', 'event': str, 'listener': str, 'reemit_event': str}

    Log entries: {'listener': str, 'event': str, 'args': list}

    Do not modify this file. Fix the bugs in lib/event_emitter.py.
    """
    emitter = EventEmitter()
    log = []
    fns = {}

    for op in operations:
        action = op['function']
        event = op.get('event')

        if action in ('on', 'once'):
            name = op['listener']
            def make_fn(n, e):
                def listener(*args):
                    log.append({'listener': n, 'event': e, 'args': list(args)})
                return listener
            fn = make_fn(name, event)
            fns[name] = fn
            getattr(emitter, action)(event, fn)
        elif action == 'off':
            name = op['listener']
            if name in fns:
                emitter.off(event, fns[name])
        elif action == 'emit':
            emitter.emit(event, *op.get('args', []))
        elif action == 'once_reemit':
            name = op['listener']
            reemit_event = op.get('reemit_event', event)
            fired = [False]
            def make_reemit_fn(n, e, re_e, em, f):
                def listener(*args):
                    log.append({'listener': n, 'event': e, 'args': list(args)})
                    if not f[0]:
                        f[0] = True
                        em.emit(re_e)
                return listener
            fn = make_reemit_fn(name, event, reemit_event, emitter, fired)
            fns[name] = fn
            emitter.once(event, fn)

    return log
`.trim();

const TESTS_PY = `
from solution import simulate

# Use this file to try your own inputs. Output appears in the
# "tests.py output" panel below the test results when you click Run Tests.
#
# Available functions. Use the exact names from lib/event_emitter.py:
#   {'function': 'on',   'event': 'name', 'listener': 'id'}  : subscribe (fires every time)
#   {'function': 'once', 'event': 'name', 'listener': 'id'}  : subscribe once, then auto-remove
#   {'function': 'off',  'event': 'name', 'listener': 'id'}  : unsubscribe
#   {'function': 'emit', 'event': 'name', 'args': [...]}      : fire the event

# Example 1: one listener receives the emitted args
result = simulate([
    {'function': 'on',   'event': 'click', 'listener': 'A'},
    {'function': 'emit', 'event': 'click', 'args': [42]},
])
print("on + emit:", result)
# -> [{'listener': 'A', 'event': 'click', 'args': [42]}]

# Example 2: once() fires only the first time
result = simulate([
    {'function': 'once', 'event': 'load', 'listener': 'B'},
    {'function': 'emit', 'event': 'load', 'args': []},
    {'function': 'emit', 'event': 'load', 'args': []},
])
print("once:", result)
# -> [{'listener': 'B', 'event': 'load', 'args': []}]  (only one entry)

# Try your own. Add operations and print the result:
# result = simulate([...])
# print(result)
`.trim();

// ── Tests ─────────────────────────────────────────────────────────────────────

const P1_VISIBLE = [
  {
    id: 'ee-p1-v1',
    description: 'single listener receives the emitted args',
    input: {
      operations: [
        { function: 'on', event: 'click', listener: 'A' },
        { function: 'emit', event: 'click', args: [1, 2] },
      ],
    },
    expectedOutput: [{ listener: 'A', event: 'click', args: [1, 2] }],
  },
  {
    id: 'ee-p1-v2',
    description: 'two listeners fire in registration order',
    input: {
      operations: [
        { function: 'on', event: 'click', listener: 'A' },
        { function: 'on', event: 'click', listener: 'B' },
        { function: 'emit', event: 'click', args: [] },
      ],
    },
    expectedOutput: [
      { listener: 'A', event: 'click', args: [] },
      { listener: 'B', event: 'click', args: [] },
    ],
  },
  {
    id: 'ee-p1-v3',
    description: 'off() removes exactly one listener',
    input: {
      operations: [
        { function: 'on', event: 'data', listener: 'A' },
        { function: 'on', event: 'data', listener: 'B' },
        { function: 'off', event: 'data', listener: 'A' },
        { function: 'emit', event: 'data', args: [] },
      ],
    },
    expectedOutput: [{ listener: 'B', event: 'data', args: [] }],
  },
  {
    id: 'ee-p1-v4',
    description: 'emit on unknown event produces no log entries',
    input: {
      operations: [{ function: 'emit', event: 'unknown', args: [] }],
    },
    expectedOutput: [],
  },
];

const P1_HIDDEN = [
  {
    id: 'ee-p1-h1',
    description: 'three listeners fire A → B → C in order',
    input: {
      operations: [
        { function: 'on', event: 'e', listener: 'A' },
        { function: 'on', event: 'e', listener: 'B' },
        { function: 'on', event: 'e', listener: 'C' },
        { function: 'emit', event: 'e', args: [] },
      ],
    },
    expectedOutput: [
      { listener: 'A', event: 'e', args: [] },
      { listener: 'B', event: 'e', args: [] },
      { listener: 'C', event: 'e', args: [] },
    ],
  },
  {
    id: 'ee-p1-h2',
    description: 'off() leaves the other listeners intact',
    input: {
      operations: [
        { function: 'on', event: 'x', listener: 'A' },
        { function: 'on', event: 'x', listener: 'B' },
        { function: 'on', event: 'x', listener: 'C' },
        { function: 'off', event: 'x', listener: 'B' },
        { function: 'emit', event: 'x', args: [] },
      ],
    },
    expectedOutput: [
      { listener: 'A', event: 'x', args: [] },
      { listener: 'C', event: 'x', args: [] },
    ],
  },
  {
    id: 'ee-p1-h3',
    description: 'two separate events are independent',
    input: {
      operations: [
        { function: 'on', event: 'a', listener: 'A' },
        { function: 'on', event: 'b', listener: 'B' },
        { function: 'emit', event: 'a', args: [1] },
        { function: 'emit', event: 'b', args: [2] },
      ],
    },
    expectedOutput: [
      { listener: 'A', event: 'a', args: [1] },
      { listener: 'B', event: 'b', args: [2] },
    ],
  },
];

const P2_VISIBLE = [
  {
    id: 'ee-p2-v1',
    description: 'once() fires exactly once: second emit produces no log entry',
    input: {
      operations: [
        { function: 'once', event: 'click', listener: 'A' },
        { function: 'emit', event: 'click', args: [] },
        { function: 'emit', event: 'click', args: [] },
      ],
    },
    expectedOutput: [{ listener: 'A', event: 'click', args: [] }],
  },
  {
    id: 'ee-p2-v2',
    description: 'once() and on() on the same event: once fires once, on fires twice',
    input: {
      operations: [
        { function: 'once', event: 'e', listener: 'A' },
        { function: 'on', event: 'e', listener: 'B' },
        { function: 'emit', event: 'e', args: [] },
        { function: 'emit', event: 'e', args: [] },
      ],
    },
    expectedOutput: [
      { listener: 'A', event: 'e', args: [] },
      { listener: 'B', event: 'e', args: [] },
      { listener: 'B', event: 'e', args: [] },
    ],
  },
  {
    id: 'ee-p2-v3',
    description: 'multiple once() listeners each fire once',
    input: {
      operations: [
        { function: 'once', event: 'e', listener: 'A' },
        { function: 'once', event: 'e', listener: 'B' },
        { function: 'emit', event: 'e', args: [] },
        { function: 'emit', event: 'e', args: [] },
      ],
    },
    expectedOutput: [
      { listener: 'A', event: 'e', args: [] },
      { listener: 'B', event: 'e', args: [] },
    ],
  },
];

const P2_HIDDEN = [
  {
    id: 'ee-p2-h1',
    description: 'three once() listeners each fire exactly once: further emits produce no entries',
    input: {
      operations: [
        { function: 'once', event: 'e', listener: 'A' },
        { function: 'once', event: 'e', listener: 'B' },
        { function: 'once', event: 'e', listener: 'C' },
        { function: 'emit', event: 'e', args: [] },
        { function: 'emit', event: 'e', args: [] },
      ],
    },
    expectedOutput: [
      { listener: 'A', event: 'e', args: [] },
      { listener: 'B', event: 'e', args: [] },
      { listener: 'C', event: 'e', args: [] },
    ],
  },
  {
    id: 'ee-p2-h2',
    description: 'three emits with one once(): listener fires on first emit only',
    input: {
      operations: [
        { function: 'once', event: 'ping', listener: 'X' },
        { function: 'emit', event: 'ping', args: [1] },
        { function: 'emit', event: 'ping', args: [2] },
        { function: 'emit', event: 'ping', args: [3] },
      ],
    },
    expectedOutput: [{ listener: 'X', event: 'ping', args: [1] }],
  },
  {
    id: 'ee-p2-h3',
    description: 're-entrant emit: once() must remove itself before calling fn. If it removes after, the same-event re-emit fires the listener a second time',
    input: {
      operations: [
        { function: 'once_reemit', event: 'ping', listener: 'A', reemit_event: 'ping' },
        { function: 'emit', event: 'ping', args: [] },
      ],
    },
    expectedOutput: [{ listener: 'A', event: 'ping', args: [] }],
  },
];

const P3_VISIBLE = [
  {
    id: 'ee-p3-v1',
    description: 'off() with the original fn cancels a once() listener before it fires',
    input: {
      operations: [
        { function: 'once', event: 'e', listener: 'A' },
        { function: 'off', event: 'e', listener: 'A' },
        { function: 'emit', event: 'e', args: [] },
      ],
    },
    expectedOutput: [],
  },
  {
    id: 'ee-p3-v2',
    description: 'off() cancels once() but leaves a plain on() listener intact',
    input: {
      operations: [
        { function: 'once', event: 'e', listener: 'A' },
        { function: 'on', event: 'e', listener: 'B' },
        { function: 'off', event: 'e', listener: 'A' },
        { function: 'emit', event: 'e', args: [] },
      ],
    },
    expectedOutput: [{ listener: 'B', event: 'e', args: [] }],
  },
];

const P3_HIDDEN = [
  {
    id: 'ee-p3-h1',
    description: 'off() cancels one of two once() listeners: the other still fires once',
    input: {
      operations: [
        { function: 'once', event: 'e', listener: 'A' },
        { function: 'once', event: 'e', listener: 'B' },
        { function: 'off', event: 'e', listener: 'A' },
        { function: 'emit', event: 'e', args: [] },
        { function: 'emit', event: 'e', args: [] },
      ],
    },
    expectedOutput: [{ listener: 'B', event: 'e', args: [] }],
  },
  {
    id: 'ee-p3-h2',
    description: 'off() after once() already fired is a no-op',
    input: {
      operations: [
        { function: 'once', event: 'e', listener: 'A' },
        { function: 'emit', event: 'e', args: [] },
        { function: 'off', event: 'e', listener: 'A' },
        { function: 'emit', event: 'e', args: [] },
      ],
    },
    expectedOutput: [{ listener: 'A', event: 'e', args: [] }],
  },
];

// ── READMEs ───────────────────────────────────────────────────────────────────

const P1_README = `# EventEmitter, Part 1: Emit Order and off()

## Background

\`lib/event_emitter.py\` is a publish/subscribe EventEmitter. Listeners are registered with \`on(event, fn)\` and invoked when \`emit(event)\` is called. \`off(event, fn)\` removes a specific listener.

## Bug Report

Two bugs. Listeners fire in reverse registration order instead of the order they were added. Calling \`off(event, fn)\` with a specific function removes all listeners for that event instead of only \`fn\`.

## What to Implement

- **\`emit(event, *args)\`** in \`lib/event_emitter.py\`: call listeners in the order they were registered.
- **\`off(event, fn)\`** in \`lib/event_emitter.py\`: remove only \`fn\` from the listener list, leaving all other listeners for that event intact.
`;

const P2_README = `# EventEmitter, Part 2: once()

## Background

\`lib/event_emitter.py\` is a publish/subscribe EventEmitter. Bugs from Part 1 are fixed. \`once(event, fn)\` registers a listener intended to fire at most once and then unregister itself.

## Bug Report

A listener added with \`once()\` fires on every subsequent \`emit()\` instead of removing itself after the first call.

## What to Implement

- **\`once(event, fn)\`** in \`lib/event_emitter.py\`: register a listener that automatically removes itself after firing once.
`;

const P3_README = `# EventEmitter, Part 3: Cancelling once() with off()

## Background

\`lib/event_emitter.py\` is a publish/subscribe EventEmitter. Bugs from Parts 1 and 2 are fixed.

## Bug Report

Calling \`off(event, fn)\` with the original function passed to \`once()\` does not remove the listener. The listener continues to fire on subsequent emits as if \`off()\` was never called.

## What to Implement

- **\`off(event, fn)\`** in \`lib/event_emitter.py\`: correctly remove listeners registered via either \`on()\` or \`once()\` when given the original function \`fn\`.
`;

// ── Scenario export ───────────────────────────────────────────────────────────

export const eventEmitter = {
  id: 'event-emitter',
  title: 'EventEmitter',
  difficulty: 'Medium',
  durationMinutes: 30,
  tags: ['debugging', 'pub-sub', 'closures'],
  description:
    'An EventEmitter has three bugs: listeners fire in reverse order, ' +
    'off() wipes the whole event, and once() never removes itself. ' +
    'Trace through the listener list manipulations to fix each defect.',
  parts: [
    {
      title: 'Emit Order & off()',
      readme: P1_README,
      starterFiles: {
        'lib/event_emitter.py': P1_LIB,
        'solution.py': SOLUTION_PY,
        'tests.py': TESTS_PY,
      },
      visibleTests: P1_VISIBLE,
      hiddenTests: P1_HIDDEN,
      answer: {
        fixedCode: `class EventEmitter:
    def __init__(self):
        self._listeners = {}

    def on(self, event, fn):
        if event not in self._listeners:
            self._listeners[event] = []
        self._listeners[event].append(fn)
        return self

    def once(self, event, fn):
        def wrapper(*args):
            fn(*args)
        wrapper._original = fn
        return self.on(event, wrapper)

    def off(self, event, fn):
        if event not in self._listeners:
            return self
        # Fix 1: filter to remove only the specific fn, not the whole list
        self._listeners[event] = [
            l for l in self._listeners[event] if l is not fn
        ]
        return self

    def emit(self, event, *args):
        fns = self._listeners.get(event, [])
        if not fns:
            return False
        for f in list(fns):  # Fix 2: iterate in insertion order, not reversed
            f(*args)
        return True`,
        explanation: 'Fix 1: replaced "del self._listeners[event]" with a list comprehension that keeps all listeners except the one matching fn, so off() removes a single listener instead of deleting the entire event. Fix 2: removed reversed() from the emit() loop so listeners fire in the order they were registered via on(), not backwards.',
      },
    },
    {
      title: 'once()',
      readme: P2_README,
      starterFiles: {
        'lib/event_emitter.py': P2_LIB,
        'solution.py': SOLUTION_PY,
        'tests.py': TESTS_PY,
      },
      visibleTests: P2_VISIBLE,
      hiddenTests: P2_HIDDEN,
      answer: {
        fixedCode: `class EventEmitter:
    def __init__(self):
        self._listeners = {}

    def on(self, event, fn):
        if event not in self._listeners:
            self._listeners[event] = []
        self._listeners[event].append(fn)
        return self

    def once(self, event, fn):
        def wrapper(*args):
            self.off(event, wrapper)  # Fix: remove before firing
            fn(*args)
        wrapper._original = fn
        return self.on(event, wrapper)

    def off(self, event, fn):
        if event not in self._listeners:
            return self
        self._listeners[event] = [
            l for l in self._listeners[event] if l is not fn
        ]
        return self

    def emit(self, event, *args):
        fns = self._listeners.get(event, [])
        if not fns:
            return False
        for f in list(fns):
            f(*args)
        return True`,
        explanation: 'Added self.off(event, wrapper) at the top of the wrapper closure, before calling fn(*args). This removes the once() listener from the list the first time it fires, so subsequent emits on the same event no longer invoke it. Calling off() before fn() (not after) ensures the listener is gone even if fn() raises an exception.',
      },
    },
    {
      title: 'Cancelling once() with off()',
      readme: P3_README,
      starterFiles: {
        'lib/event_emitter.py': P3_LIB,
        'solution.py': SOLUTION_PY,
        'tests.py': TESTS_PY,
      },
      visibleTests: P3_VISIBLE,
      hiddenTests: P3_HIDDEN,
      answer: {
        fixedCode: `class EventEmitter:
    def __init__(self):
        self._listeners = {}

    def on(self, event, fn):
        if event not in self._listeners:
            self._listeners[event] = []
        self._listeners[event].append(fn)
        return self

    def once(self, event, fn):
        def wrapper(*args):
            self.off(event, wrapper)
            fn(*args)
        wrapper._original = fn
        return self.on(event, wrapper)

    def off(self, event, fn):
        if event not in self._listeners:
            return self
        # Fix: also match once() wrappers via their _original attribute
        self._listeners[event] = [
            l for l in self._listeners[event]
            if l is not fn and getattr(l, '_original', None) is not fn
        ]
        return self

    def emit(self, event, *args):
        fns = self._listeners.get(event, [])
        if not fns:
            return False
        for f in list(fns):
            f(*args)
        return True`,
        explanation: 'Added "and getattr(l, \'_original\', None) is not fn" to the off() filter. When once() registers a wrapper closure, the original fn is stored as wrapper._original so that callers who pass the original fn to off() can still cancel it. Without checking _original, the identity comparison l is not fn never matches the wrapper and the listener is never removed.',
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

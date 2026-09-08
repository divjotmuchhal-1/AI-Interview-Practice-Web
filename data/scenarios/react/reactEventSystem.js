// ─── Event System / useEffect Subscriptions ──────────────────────────────────
// Inspired by: Airbnb / real-time feature interviews
// Two parts: broken unsubscribe (anonymous wrapper) → emit doesn't pass data

const README_P1 = `# Event System, Part 1: Unsubscribe Has No Effect

## Background

\`runSubscriptions(ops)\` drives an \`EventEmitter\` through three operation types: \`{ type: 'subscribe', key, event }\`, \`{ type: 'unsubscribe', key, event }\`, and \`{ type: 'emit', event }\`. It returns the total number of times any handler was called across all emits.

## Bug Report

After a handler is unsubscribed, it keeps firing on subsequent emits. The \`off\` call removes nothing.

## What to Implement

- **\`runSubscriptions(ops)\`** in \`solution.js\`: fix \`EventEmitter.prototype.on\` so the reference stored for each handler is the same reference that \`off\` later filters against.
`;

const README_P2 = `# Event System, Part 2: Emit Drops the Payload

## Background

Part 1 is complete. \`runEmitData(ops)\` drives the same \`EventEmitter\` through \`{ type: 'subscribe', event }\` and \`{ type: 'emit', event, data }\` operations. It returns an array of every data value received by the handlers in the order they arrived.

## Bug Report

Every handler receives \`undefined\` regardless of what data was emitted. The correct payload values are never delivered.

## What to Implement

- **\`runEmitData(ops)\`** in \`solution.js\`: fix \`EventEmitter.prototype.emit\` so each handler is invoked with the \`data\` argument passed to \`emit\`.
`;

const STARTER_P1 = {
  'solution.js': `function EventEmitter() {
  this._listeners = {};
}

EventEmitter.prototype.on = function (event, handler) {
  if (!this._listeners[event]) this._listeners[event] = [];
  this._listeners[event].push(function () { handler(); });
};

EventEmitter.prototype.off = function (event, handler) {
  this._listeners[event] = (this._listeners[event] || []).filter(function (h) {
    return h !== handler;
  });
};

EventEmitter.prototype.emit = function (event) {
  (this._listeners[event] || []).forEach(function (h) { h(); });
};

module.exports = {
  runSubscriptions: function (ops) {
    var emitter = new EventEmitter();
    var handlers = {};
    var callCount = 0;

    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op.type === 'subscribe') {
        handlers[op.key] = function () { callCount++; };
        emitter.on(op.event, handlers[op.key]);
      } else if (op.type === 'unsubscribe') {
        emitter.off(op.event, handlers[op.key]);
      } else if (op.type === 'emit') {
        emitter.emit(op.event);
      }
    }

    return callCount;
  },
};
`,
};

const STARTER_P2 = {
  'solution.js': `function EventEmitter() {
  this._listeners = {};
}

EventEmitter.prototype.on = function (event, handler) {
  if (!this._listeners[event]) this._listeners[event] = [];
  this._listeners[event].push(handler);
};

EventEmitter.prototype.off = function (event, handler) {
  this._listeners[event] = (this._listeners[event] || []).filter(function (h) {
    return h !== handler;
  });
};

EventEmitter.prototype.emit = function (event, data) {
  (this._listeners[event] || []).forEach(function (h) { h(); });
};

module.exports = {
  runEmitData: function (ops) {
    var emitter = new EventEmitter();
    var received = [];

    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op.type === 'subscribe') {
        emitter.on(op.event, function (data) { received.push(data); });
      } else if (op.type === 'emit') {
        emitter.emit(op.event, op.data);
      }
    }

    return received;
  },
};
`,
};

const VIS_P1 = [
  {
    description: 'Subscribing then emitting calls the handler once',
    input: {
      ops: [
        { type: 'subscribe', key: 'h1', event: 'click' },
        { type: 'emit', event: 'click' },
      ],
    },
    expectedOutput: 1,
  },
  {
    description: 'Subscribe, unsubscribe, then emit: handler should not fire',
    input: {
      ops: [
        { type: 'subscribe', key: 'h1', event: 'click' },
        { type: 'unsubscribe', key: 'h1', event: 'click' },
        { type: 'emit', event: 'click' },
      ],
    },
    expectedOutput: 0,
  },
];

const HID_P1 = [
  {
    description: 'Two subscribers, one removed: emit reaches only the remaining one',
    input: {
      ops: [
        { type: 'subscribe', key: 'h1', event: 'update' },
        { type: 'subscribe', key: 'h2', event: 'update' },
        { type: 'unsubscribe', key: 'h1', event: 'update' },
        { type: 'emit', event: 'update' },
      ],
    },
    expectedOutput: 1,
  },
  {
    description: 'Multiple emits after unsubscribe still fire zero times',
    input: {
      ops: [
        { type: 'subscribe', key: 'h1', event: 'change' },
        { type: 'unsubscribe', key: 'h1', event: 'change' },
        { type: 'emit', event: 'change' },
        { type: 'emit', event: 'change' },
        { type: 'emit', event: 'change' },
      ],
    },
    expectedOutput: 0,
  },
  {
    description: 'Different events are isolated: unsubscribing one does not affect another',
    input: {
      ops: [
        { type: 'subscribe', key: 'h1', event: 'open' },
        { type: 'subscribe', key: 'h2', event: 'close' },
        { type: 'unsubscribe', key: 'h1', event: 'open' },
        { type: 'emit', event: 'open' },
        { type: 'emit', event: 'close' },
      ],
    },
    expectedOutput: 1,
  },
];

const VIS_P2 = [
  {
    description: 'Emitted string data reaches the handler',
    input: {
      ops: [
        { type: 'subscribe', event: 'message' },
        { type: 'emit', event: 'message', data: 'hello' },
      ],
    },
    expectedOutput: ['hello'],
  },
  {
    description: 'Two emits: both payloads arrive in order',
    input: {
      ops: [
        { type: 'subscribe', event: 'message' },
        { type: 'emit', event: 'message', data: 'hello' },
        { type: 'emit', event: 'message', data: 'world' },
      ],
    },
    expectedOutput: ['hello', 'world'],
  },
];

const HID_P2 = [
  {
    description: 'Object payload is forwarded intact',
    input: {
      ops: [
        { type: 'subscribe', event: 'update' },
        { type: 'emit', event: 'update', data: { price: 120, available: true } },
      ],
    },
    expectedOutput: [{ price: 120, available: true }],
  },
  {
    description: 'Numeric payload is passed through correctly',
    input: {
      ops: [
        { type: 'subscribe', event: 'count' },
        { type: 'emit', event: 'count', data: 42 },
        { type: 'emit', event: 'count', data: 99 },
      ],
    },
    expectedOutput: [42, 99],
  },
  {
    description: 'No emits means no data received',
    input: {
      ops: [
        { type: 'subscribe', event: 'ping' },
      ],
    },
    expectedOutput: [],
  },
];

export const reactEventSystem = {
  id: 'react-event-system',
  title: 'Event System Bugs',
  difficulty: 'Medium',
  durationMinutes: 30,
  tags: ['react', 'useEffect', 'cleanup', 'subscriptions', 'closures'],
  description:
    'Fix two bugs in an EventEmitter that mirrors the useEffect subscription pattern: a wrapped handler that makes unsubscribe silently fail, then an emit that drops its payload before calling listeners.',
  testRunner: {
    entryFile: 'solution.js',
  },
  parts: [
    {
      id: 'part-1', number: 1, title: 'Unsubscribe Has No Effect',
      readme: README_P1,
      starterFiles: STARTER_P1,
      visibleTests: VIS_P1,
      hiddenTests: HID_P1,
      testRunner: { functionName: 'runSubscriptions', inputKeys: ['ops'] },
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function EventEmitter() {
  this._listeners = {};
}

EventEmitter.prototype.on = function (event, handler) {
  if (!this._listeners[event]) this._listeners[event] = [];
  this._listeners[event].push(handler);
};

EventEmitter.prototype.off = function (event, handler) {
  this._listeners[event] = (this._listeners[event] || []).filter(function (h) {
    return h !== handler;
  });
};

EventEmitter.prototype.emit = function (event) {
  (this._listeners[event] || []).forEach(function (h) { h(); });
};

module.exports = {
  runSubscriptions: function (ops) {
    var emitter = new EventEmitter();
    var handlers = {};
    var callCount = 0;

    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op.type === 'subscribe') {
        handlers[op.key] = function () { callCount++; };
        emitter.on(op.event, handlers[op.key]);
      } else if (op.type === 'unsubscribe') {
        emitter.off(op.event, handlers[op.key]);
      } else if (op.type === 'emit') {
        emitter.emit(op.event);
      }
    }

    return callCount;
  },
};
\`\`\`

The fix: \`on\` stores the handler directly instead of wrapping it in a new function, so the reference \`off\` filters against matches the stored one.`,
    },
    {
      id: 'part-2', number: 2, title: 'Emit Loses the Payload',
      readme: README_P2,
      starterFiles: STARTER_P2,
      visibleTests: VIS_P2,
      hiddenTests: HID_P2,
      testRunner: { functionName: 'runEmitData', inputKeys: ['ops'] },
      answer: `Complete corrected \`solution.js\`:

\`\`\`js
function EventEmitter() {
  this._listeners = {};
}

EventEmitter.prototype.on = function (event, handler) {
  if (!this._listeners[event]) this._listeners[event] = [];
  this._listeners[event].push(handler);
};

EventEmitter.prototype.off = function (event, handler) {
  this._listeners[event] = (this._listeners[event] || []).filter(function (h) {
    return h !== handler;
  });
};

EventEmitter.prototype.emit = function (event, data) {
  (this._listeners[event] || []).forEach(function (h) { h(data); });
};

module.exports = {
  runEmitData: function (ops) {
    var emitter = new EventEmitter();
    var received = [];

    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op.type === 'subscribe') {
        emitter.on(op.event, function (data) { received.push(data); });
      } else if (op.type === 'emit') {
        emitter.emit(op.event, op.data);
      }
    }

    return received;
  },
};
\`\`\`

The fix: \`emit\` forwards \`data\` when invoking each handler instead of calling them with no arguments.`,
    },
  ],
};

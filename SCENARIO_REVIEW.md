# Scenario Clarity Review

Every scenario reviewed for (1) clarity: unambiguous instructions and fully specified input/output contracts, and (2) challenge: no solution or cause hints, no simplification of the underlying task. Format per scenario: title, revised scenario (current README text, per part), changes made.


---

## Auth Middleware Review

### Revised scenario

~~~markdown
# Code Review: Auth Middleware Refactor

## Background

A teammate opened this PR to improve the performance of the JWT authentication middleware. The PR description claims `jwt.verify` is slow and switches to a faster approach.

## Your Task

Review the diff and write your findings in `findings.md`. For each issue, note:
- **What** is wrong (the specific line or pattern)
- **Why** it matters (the impact or exploitability)
- **Severity**: Critical / High / Medium / Low

There are at least 3 issues to find. Think about security, correctness, and code quality.

~~~

### Changes made

- **Flagged before:** Task framing did not specify what a finding must contain or how many issues exist.
- **Changes:** Standardized to Background + Your Task with an explicit findings format (what / why / severity) and a minimum issue count. Review dimensions are named without revealing the issues.


---

## Feed Endpoint Review

### Revised scenario

~~~markdown
# Code Review: Feed Endpoint Enrichment

## Background

A teammate added author info and engagement counts to the social feed endpoint. The PR passes CI and all tests are green. The team asked you to review before merge because this endpoint is on the hot path (~50k RPM peak).

## Your Task

Review the diff and write your findings in `findings.md`. For each issue, note:
- **What** is wrong (the specific line or pattern)
- **Why** it matters (the impact or exploitability)
- **Severity**: Critical / High / Medium / Low

There are at least 3 issues to find. Think about performance, correctness, and scalability.

~~~

### Changes made

- **Flagged before:** Same as codeReviewAuth: unspecified finding format.
- **Changes:** Same standardization; added the hot-path context (50k RPM) that motivates the review without hinting at specific defects.


---

## Rate Limiter Review

### Revised scenario

~~~markdown
# Code Review: In-Memory Rate Limiter

## Background

A teammate implemented a new rate-limiting middleware to protect public API endpoints. It uses an in-memory store, so it is fast and has no external dependency. The PR is tagged as "security hardening."

## Your Task

Review the diff and write your findings in `findings.md`. For each issue, note:
- **What** is wrong (the specific line or pattern)
- **Why** it matters (the impact or exploitability)
- **Severity**: Critical / High / Medium / Low

There are at least 4 issues. Think about correctness, security, and operational concerns (what happens in production over time).

~~~

### Changes made

- **Flagged before:** Same finding-format gap.
- **Changes:** Same standardization; minimum issue count set to 4 to match the rubric.


---

## Config File Parser

### Revised scenario

**Part 1:**

~~~markdown
# Config File Parser, Part 1: Key-Value Pairs

## Background

`src/parser.js` and `src/tokenizer.js` implement a plain-text config file parser. `parseConfig(text)` takes the full content of a `.conf` file and returns a flat object mapping keys to typed values. Lines are blank, comments (anything from `#` to end of line), or `key = value` pairs. Value types are: quoted string, integer, float, or boolean (`true`/`false`). Keys are case-insensitive and stored lowercase; if a key appears more than once, the last value wins.

## Bug Report

Both `tokenizeLine` in `src/tokenizer.js` and the key-extraction loop in `parseConfig` are unimplemented stubs. All calls to `parseConfig` return an empty object.

## What to Implement

- **`tokenizeLine(line)`** in `src/tokenizer.js`: tokenize a stripped line into `[KEY, EQUALS, VALUE]` tokens; return an empty array for blank or comment-only lines.
- **`parseConfig(text)`** in `src/parser.js`: build and return the key-value map, coercing each value to the correct JS type.

## Notes

- `#` inside a double-quoted string is not a comment start. `findCommentStart` handles this and is already implemented.
- Values are not case-insensitive; only keys are.

~~~

**Part 2:**

~~~markdown
# Config File Parser, Part 2: Sections

## Background

`src/parser.js` implements a config file parser. Part 1 is complete. Part 2 adds section headers: a line of the form `[section_name]` begins a namespace, and all subsequent keys are stored as `sectionName.key` until the next header appears. Keys before any section header are stored without a prefix. Section names are case-insensitive and normalized to lowercase.

## Bug Report

`parseConfig` does not handle section headers. Lines beginning with `[` are treated as key-value pairs or cause an error, and all keys are stored without any namespace prefix.

## What to Implement

- **`parseConfig(text)`** in `src/parser.js`: detect section headers, track the current namespace, and prefix subsequent keys with `sectionName.` until the next header.

## Notes

- `[database.replica]` is a single namespace string, not two levels of nesting. Keys become `database.replica.key`.
- Duplicate section headers are allowed; keys continue accumulating in that namespace.
- Section names are lowercased in the output key path even if written in mixed case.

~~~

**Part 3:**

~~~markdown
# Config File Parser, Part 3: Lists

## Background

`src/parser.js` implements a config file parser. Parts 1 and 2 are complete. Part 3 adds list values: a value starting with `[` is an array of comma-separated items enclosed in `[...]`. Lists may span multiple lines; the list ends at the first `]`. Each item follows the same type rules as scalar values.

## Bug Report

`parseConfig` does not handle list values. A key whose value starts with `[` either crashes, is skipped, or returns the raw string instead of a JavaScript array.

## What to Implement

- **`parseConfig(text)`** in `src/parser.js`: detect list values, collect items across lines until the closing `]`, parse each item to its correct JS type, and store the result as an array.

## Notes

- Trailing commas are valid: `["a", "b",]` produces `["a", "b"]`.
- Comments and blank lines within a multi-line list are ignored.
- A `[` starting a section header is not a list; distinguish by whether the line contains `=`.
- Mixed-type lists are valid; do not enforce type homogeneity.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed. All three parts state exact type-coercion rules, section-namespace semantics, and list edge cases (trailing commas, comments inside lists) that hidden tests assert.


---

## CSV Parser

### Revised scenario

**Part 1:**

~~~markdown
# CSV Parser, Part 1: Field Boundaries and Whitespace

## Background

`lib/parser.py` implements a CSV parser. `parse_csv(text)` takes a multi-line string and returns a list of rows, where each row is a list of field strings. Fields are separated by commas, empty lines are skipped, and consecutive commas produce empty string fields.

## Bug Report

Two bugs. The last field on every row is silently dropped: a row with three fields returns only two. Field values are also trimmed of leading and trailing whitespace, so a field like `  padded  ` is returned as `padded`.

## What to Implement

- **`parse_csv(text)`** in `lib/parser.py`: return every field on each row and preserve field values exactly as they appear in the input with no whitespace trimming.

~~~

**Part 2:**

~~~markdown
# CSV Parser, Part 2: Quoted Fields and Escaped Quotes

## Background

`lib/parser.py` is a CSV parser. Bugs from Part 1 are fixed. A field wrapped in double-quotes is a quoted field: commas inside it are not delimiters, and `""` inside it represents a single literal `"`.

## Bug Report

Two bugs. Commas inside quoted fields are treated as delimiters, splitting `"hello, world"` into two fields. Escaped quotes (`""`) inside a quoted field produce an empty string instead of a single `"`.

## What to Implement

- **`parse_csv(text)`** in `lib/parser.py`: treat fields beginning with `"` as quoted, suppressing comma splits inside them and expanding `""` to a single `"`.

## Notes

A quoted field ends at the next unescaped `"`. A `"` is unescaped if it is not immediately followed by another `"`.

~~~

**Part 3:**

~~~markdown
# CSV Parser, Part 3: Mid-Field Quotes

## Background

`lib/parser.py` is a CSV parser. Bugs from Parts 1 and 2 are fixed. A field is quoted only if its first character is `"`; a `"` anywhere else in a field is a literal character.

## Bug Report

A `"` encountered mid-field incorrectly activates quote mode. A value like `href="x"` causes the parser to treat everything after the mid-field `"` as quoted, producing wrong output for the remainder of the row.

## What to Implement

- **`parse_csv(text)`** in `lib/parser.py`: enter quote mode only when `"` is the very first character of a new field; treat `"` anywhere else as a literal character.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed. Quoting and escape semantics are stated precisely per part.


---

## Dependency Resolver

### Revised scenario

**Part 1:**

~~~markdown
# Dependency Resolver, Part 1: Topological Sort

## Background

`lib/resolver.py` implements a package dependency resolver. `resolve_order(packages)` takes a dict mapping package names to their list of direct dependencies and returns a valid installation order where every dependency appears before the package that requires it. All dependencies are guaranteed to be keys in the dict. When multiple packages are ready to install simultaneously, they are processed alphabetically.

## Bug Report

The resolver returns packages in reverse dependency order: packages with the most dependencies are installed first and leaves last. `resolve_order({'A': ['B','C'], 'B': ['C'], 'C': []})` returns `['A', 'B', 'C']` instead of `['C', 'B', 'A']`.

## What to Implement

- **`resolve_order(packages)`** in `lib/resolver.py`: return package names in a valid installation order where each package appears only after all its dependencies.

~~~

**Part 2:**

~~~markdown
# Dependency Resolver, Part 2: Cycle Detection

## Background

`lib/resolver.py` implements a package dependency resolver. Bugs from Part 1 are fixed. `resolve_order(packages)` now also detects circular dependencies and returns `['CYCLE']` if one exists. A self-loop (a package that depends on itself) counts as a cycle.

## Bug Report

The cycle detector produces false positives. A graph where two packages share a common dependency but have no actual cycle is incorrectly reported as a cycle. `resolve_order({'A': ['C'], 'B': ['C'], 'C': []})` returns `['CYCLE']` instead of a valid install order.

## What to Implement

- **`resolve_order(packages)`** in `lib/resolver.py`: return `['CYCLE']` if any circular dependency exists, otherwise return the valid installation order.

## Notes

All nodes must be checked, not just those reachable from the first package processed.

~~~

**Part 3:**

~~~markdown
# Dependency Resolver, Part 3: Implicit Dependencies

## Background

`lib/resolver.py` implements a package dependency resolver. Bugs from Parts 1 and 2 are fixed. Not all packages in dependency lists are guaranteed to be top-level keys in the dict. A package referenced as a dependency but absent from the dict is an implicit dependency: treat it as a leaf with no further dependencies.

## Bug Report

When a dependency is not a key in `packages`, the resolver produces incorrect output or crashes. `resolve_order({'my_app': ['numpy']})` fails even though `numpy` should be treated as a leaf and appear before `my_app` in the result.

## What to Implement

- **`resolve_order(packages)`** in `lib/resolver.py`: handle implicit dependencies by treating any package referenced in a dep list but absent from the dict as a leaf with no further dependencies.

## Notes

Cycle detection and alphabetical tie-breaking apply to implicit packages the same as explicit ones.
~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed. Alphabetical tie-breaking, CYCLE sentinel, and implicit-dependency rules are all explicit.


---

## EventEmitter

### Revised scenario

**Part 1:**

~~~markdown
# EventEmitter, Part 1: Emit Order and off()

## Background

`lib/event_emitter.py` is a publish/subscribe EventEmitter. Listeners are registered with `on(event, fn)` and invoked when `emit(event)` is called. `off(event, fn)` removes a specific listener.

## Bug Report

Two bugs. Listeners fire in reverse registration order instead of the order they were added. Calling `off(event, fn)` with a specific function removes all listeners for that event instead of only `fn`.

## What to Implement

- **`emit(event, *args)`** in `lib/event_emitter.py`: call listeners in the order they were registered.
- **`off(event, fn)`** in `lib/event_emitter.py`: remove only `fn` from the listener list, leaving all other listeners for that event intact.

~~~

**Part 2:**

~~~markdown
# EventEmitter, Part 2: once()

## Background

`lib/event_emitter.py` is a publish/subscribe EventEmitter. Bugs from Part 1 are fixed. `once(event, fn)` registers a listener intended to fire at most once and then unregister itself.

## Bug Report

A listener added with `once()` fires on every subsequent `emit()` instead of removing itself after the first call.

## What to Implement

- **`once(event, fn)`** in `lib/event_emitter.py`: register a listener that automatically removes itself after firing once.

~~~

**Part 3:**

~~~markdown
# EventEmitter, Part 3: Cancelling once() with off()

## Background

`lib/event_emitter.py` is a publish/subscribe EventEmitter. Bugs from Parts 1 and 2 are fixed.

## Bug Report

Calling `off(event, fn)` with the original function passed to `once()` does not remove the listener. The listener continues to fire on subsequent emits as if `off()` was never called.

## What to Implement

- **`off(event, fn)`** in `lib/event_emitter.py`: correctly remove listeners registered via either `on()` or `once()` when given the original function `fn`.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed.


---

## Feature Flag Evaluator

### Revised scenario

**Part 1:**

~~~markdown
# Feature Flag Evaluator, Part 1: User Targeting

## Background

`src/evaluator.js` and `src/targeting.js` implement a feature flag evaluation engine. `evaluateFlag(flagConfig, userContext)` evaluates a flag against a user and returns a boolean. A flag's `rules` array is evaluated in order; the first rule where all conditions match returns its `result`. If no rule matches, `flagConfig.enabled` is the fallback. Each condition is `{ attribute, operator, value }` and checks the user's attribute using one of five string operators.

## Requirements

- Operators: `is` (exact equality), `is_not`, `contains` (substring), `starts_with`, `ends_with`. All comparisons are case-sensitive.
- A condition on an attribute the user does not have does not match (evaluates to `false`, not an error).
- A rule matches only if ALL of its conditions match.
- Rules are evaluated in order; the first matching rule's `result` is returned immediately.
- `flagConfig.enabled` is only a fallback: a matching rule with `result: false` overrides `enabled: true`, and a matching rule with `result: true` overrides `enabled: false`.

## What to Implement

- **`evaluateCondition(condition, user)`** in `src/targeting.js`: return `true` if `user[condition.attribute]` satisfies the operator and value.
- **`evaluateFlag(flagConfig, userContext)`** in `src/evaluator.js`: evaluate rules in order and return the first matching rule's `result`, or `flagConfig.enabled` if none match.

~~~

**Part 2:**

~~~markdown
# Feature Flag Evaluator, Part 2: Percentage Rollout

## Background

`src/evaluator.js` implements a feature flag evaluation engine. Part 1 is complete. Part 2 adds rollout rules: a rule with a `rolloutPercentage` key (instead of `conditions`) includes a user when `hashForRollout(flagConfig.key, userContext.id) < rolloutPercentage`. `hashForRollout` is provided in `src/hash.js`, returns an integer in [0, 99], and must not be modified.

## Bug Report

`evaluateFlag` does not handle rollout rules. Any flag containing a rollout rule skips it and falls through to `flagConfig.enabled` as if the rule were absent.

## What to Implement

- **`evaluateFlag(flagConfig, userContext)`** in `src/evaluator.js`: handle both condition rules (from Part 1) and rollout rules, evaluating them in order with first-match-wins.

## Notes

- Detect a rollout rule by checking `'rolloutPercentage' in rule`.
- `hashForRollout` takes the flag's `key` string and the user's `id` string, not the full objects.
- `rolloutPercentage: 0` includes no users; `rolloutPercentage: 100` includes all users.

~~~

**Part 3:**

~~~markdown
# Feature Flag Evaluator, Part 3: Compound AND/OR Rules

## Background

`src/targeting.js` implements condition evaluation for the feature flag engine. Parts 1 and 2 are complete. Each element in a rule's `conditions` array can now be a simple condition `{ attribute, operator, value }`, an `all` group (all elements must match), or an `any` group (at least one must match). The top-level `conditions` array retains AND semantics from Part 1.

## Bug Report

`evaluateConditionOrGroup` does not implement the `all` and `any` group branches. Any rule containing a group always evaluates as if the group did not match, so group-based rules never fire.

## What to Implement

- **`evaluateConditionOrGroup(conditionOrGroup, user)`** in `src/targeting.js`: return `true` for a matching simple condition, when all elements of an `all` group match, or when at least one element of an `any` group matches.

## Notes

- Groups can be nested arbitrarily deep; call the function recursively on group elements.
- An empty `all: []` matches (vacuously true). An empty `any: []` does not match.

~~~

### Changes made

- **Flagged before:** Operator semantics, missing-attribute behavior, and rule-vs-enabled precedence were implicit before.
- **Changes:** Part 1 rewritten as Requirements (build-style) stating all five operators, case sensitivity, missing-attribute = false, first-match-wins, and fallback precedence. Parts 2-3 templated with rollout detection and group semantics (empty all matches, empty any does not) stated.


---

## Log Query Filter

### Revised scenario

**Part 1:**

~~~markdown
# Log Query Filter, Part 1: Level Filtering

## Background

`lib/filter_logs.py` implements a log search engine. `filter_logs(logs, query)` takes a list of log line strings and a query dict, and returns only the lines satisfying all query conditions. Log lines follow the format `[YYYY-MM-DD HH:MM:SS] LEVEL key=val free text`. Severity levels in ascending order: DEBUG(0), INFO(1), WARN(2), ERROR(3), FATAL(4).

## Bug Report

When the query includes `min_level`, lines at exactly that severity are excluded. Only lines strictly above the specified level are returned. `filter_logs(logs, {'min_level': 'WARN'})` returns ERROR and FATAL but omits WARN.

## What to Implement

- **`filter_logs(logs, query)`** in `lib/filter_logs.py`: when `min_level` is present, keep lines whose severity rank is greater than or equal to the rank of the specified level.

~~~

**Part 2:**

~~~markdown
# Log Query Filter, Part 2: Field Extraction

## Background

`lib/filter_logs.py` is a log search engine. Bugs from Part 1 are fixed. The `fields` query key filters by structured key=value pairs embedded in log lines. In the log format `[YYYY-MM-DD HH:MM:SS] LEVEL key=val free text`, each space-separated token after LEVEL that contains `=` is a field; everything after the first `=` is the value.

## Bug Report

Field values containing `=` are truncated at the first `=`. A line with `task_id=abc=42` is parsed as `task_id=abc`, so `filter_logs(logs, {'fields': {'task_id': 'abc=42'}})` returns no results even when a matching line exists.

## What to Implement

- **`filter_logs(logs, query)`** in `lib/filter_logs.py`: when `fields` is present, parse each field token by splitting on the first `=` only, then include only lines where all specified field/value pairs match.

## Notes

A field value may contain multiple `=` characters. Only the first `=` in a token separates the key from the value.

~~~

**Part 3:**

~~~markdown
# Log Query Filter, Part 3: NOT Filter

## Background

`lib/filter_logs.py` is a log search engine. Bugs from Parts 1 and 2 are fixed. The `not_contains` query key excludes lines that contain a given substring. All query conditions apply simultaneously: a line must pass every condition present in the query to be included.

## Bug Report

The `not_contains` filter is inverted: lines containing the substring are kept and all others are excluded. `filter_logs(logs, {'not_contains': 'INFO'})` returns only the INFO line instead of excluding it.

## What to Implement

- **`filter_logs(logs, query)`** in `lib/filter_logs.py`: when `not_contains` is present, exclude lines that contain the specified substring.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed. Split-on-first-equals behavior is stated as a constraint, not a fix.


---

## LRU Cache

### Revised scenario

**Part 1:**

~~~markdown
# LRU Cache, Part 1: Doubly-Linked List Setup and Eviction

## Background

`lib/lru_cache.py` implements an LRU cache using a hash map and a doubly-linked list. Sentinel nodes `head` (LRU end) and `tail` (MRU end) bracket all real nodes and simplify pointer operations.

## Bug Report

There are two bugs. First, the constructor sets `self.head.next = self.tail` but never sets `self.tail.prev = self.head`, so `_add_last()` crashes on the very first `put()` when it dereferences `self.tail.prev`. Second, when the cache exceeds capacity, the code evicts `self.tail.prev` (the MRU node) instead of `self.head.next` (the LRU node), so the most-recently-used entry is discarded instead of the oldest.

## What to Implement

- **`__init__`** in `lib/lru_cache.py`: complete the sentinel link so `head` and `tail` point to each other in both directions.
- **`put(key, value)`** in `lib/lru_cache.py`: evict from the correct end of the list when over capacity.

~~~

**Part 2:**

~~~markdown
# LRU Cache, Part 2: get() Order Update

## Background

`lib/lru_cache.py` is an LRU cache backed by a hash map and doubly-linked list. Bugs from Part 1 are fixed.

## Bug Report

`get(key)` returns the correct value but does not move the accessed node to the MRU end. A key that is read stays at its old position in the list and can be evicted on the next insertion as if it had never been accessed.

## What to Implement

- **`get(key)`** in `lib/lru_cache.py`: after retrieving the node, remove it from its current position and reinsert it at the MRU end before returning the value.

~~~

**Part 3:**

~~~markdown
# LRU Cache, Part 3: put() on an Existing Key

## Background

`lib/lru_cache.py` is an LRU cache backed by a hash map and doubly-linked list. Bugs from Parts 1 and 2 are fixed.

## Bug Report

When `put(key, value)` is called for a key already in the cache, the value is updated but the node is not moved to the MRU end. The updated key stays at its old position and is treated as if it was never recently accessed, making it a candidate for premature eviction.

## What to Implement

- **`put(key, value)`** in `lib/lru_cache.py`: when updating an existing key's value, also move its node to the MRU end.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed.


---

## Merge Intervals

### Revised scenario

**Part 1:**

~~~markdown
# Merge Intervals, Part 1: Merge Overlapping Intervals

## Background

`lib/intervals.py` implements interval utilities. `merge_intervals(intervals)` takes an unsorted list of `[start, end]` integer pairs and returns a sorted list with all overlapping and adjacent intervals combined. Two intervals are overlapping if one starts at or before the other ends; `[1,4]` and `[4,6]` share endpoint 4 and must merge to `[1,6]`.

## Bug Report

Adjacent intervals that share exactly one endpoint are not merged. `merge_intervals([[1,4],[4,6]])` returns `[[1,4],[4,6]]` instead of `[[1,6]]`.

## What to Implement

- **`merge_intervals(intervals)`** in `lib/intervals.py`: merge intervals that overlap or share an endpoint, returning a sorted list of non-overlapping intervals.

## Notes

Single-point intervals (e.g., `[5,5]`) are valid. Empty input returns `[]`.

~~~

**Part 2:**

~~~markdown
# Merge Intervals, Part 2: Count Gaps

## Background

`lib/intervals.py` implements interval utilities. Bugs from Part 1 are fixed. `count_gaps(intervals, range_start, range_end)` returns the total integer length within the query range not covered by any interval. The range uses half-open semantics: `[range_start, range_end)` has length `range_end - range_start`. `merge_intervals` is available and correct.

## Bug Report

`count_gaps` returns a value one greater than the correct answer. For a range `[0, 12)` with intervals `[[2,5],[8,10]]`, it returns 8 instead of 7.

## What to Implement

- **`count_gaps(intervals, range_start, range_end)`** in `lib/intervals.py`: return the total uncovered length within `[range_start, range_end)`.

## Notes

The range is half-open: `range_end` is not included in the range length. Intervals outside the range are clipped. If no interval intersects the range, return `range_end - range_start`.

~~~

**Part 3:**

~~~markdown
# Merge Intervals, Part 3: Task Scheduler

## Background

`lib/intervals.py` implements interval utilities. Bugs from Parts 1 and 2 are fixed. `schedule_tasks(tasks)` takes a list of `[start, end]` task intervals and returns the largest possible subset of non-overlapping tasks in chronological order. Two tasks conflict if one starts strictly before the other ends.

## Bug Report

The scheduler returns a valid non-overlapping set of tasks but consistently selects fewer tasks than the maximum possible. Given inputs where a different selection would allow more tasks to fit, the function misses them.

## What to Implement

- **`schedule_tasks(tasks)`** in `lib/intervals.py`: select and return the maximum number of non-overlapping tasks as `[start, end]` pairs in order.

## Notes

Return the selected tasks themselves, not just the count. Empty input returns `[]`.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed. Half-open range semantics and clipping are explicit.


---

## Middleware Pipeline

### Revised scenario

**Part 1:**

~~~markdown
# Middleware Pipeline, Part 1: Linear Dispatch

## Background

`compose(middlewares)` in `src/pipeline.js` chains an array of `(ctx, next) => void` functions left-to-right. Each middleware mutates `ctx`, then calls `next()` to hand off to the next function in the chain.

## Bug Report

`ctx.requestId` is never set even when the pipeline completes. The middlewares after the first one appear to run correctly.

## What to Implement

- **`compose(middlewares)`** in `src/pipeline.js`: fix it so every middleware in the array runs exactly once, in order.
~~~

**Part 2:**

~~~markdown
# Middleware Pipeline, Part 2: Guard Middleware

## Background

Part 1 is complete. `withGuard(predicate, handler)` in `src/pipeline.js` wraps a handler middleware so it only runs when `predicate(ctx)` returns `true`. When the predicate fails, it sets `ctx.blocked = true` and `ctx.blockReason = 'unauthorized'` and must not invoke the handler.

## Bug Report

Non-admin requests are correctly marked with `ctx.blocked = true` and `ctx.blockReason`, but `ctx.result` is still being set. The protected handler runs regardless of the predicate result.

## What to Implement

- **`withGuard(predicate, handler)`** in `src/pipeline.js`: fix the guard so the handler is not called when the predicate returns `false`.
~~~

**Part 3:**

~~~markdown
# Middleware Pipeline, Part 3: Route Prefix Matching

## Background

Parts 1 and 2 are complete. `matchRoute(path, pattern)` in `src/pipeline.js` matches a request path against a route pattern. Wildcard patterns use the form `/prefix/*` and should match any path that begins with `/prefix/`, but not paths that merely share the same leading characters without a path-segment boundary.

## Bug Report

`/apikey` is being routed to the `api-handler`. Requests to `/api` (no trailing slash) also incorrectly match the `/api/*` pattern.

## What to Implement

- **`matchRoute(path, pattern)`** in `src/pipeline.js`: fix wildcard matching so a `/prefix/*` pattern only matches paths that start with `/prefix/`.

## Notes

- `/api/` (trailing slash, no further segments) must match `/api/*`; `/api` (no slash) must not.
~~~

### Changes made

- **Flagged before:** Part 1 What to Implement said "fix the dispatch so execution starts at the first middleware in the array", which states the root cause outright.
- **Changes:** Replaced with the behavioral contract: every middleware must run exactly once, in order. Symptom unchanged; difficulty restored.


---

## API Rate Limiter

### Revised scenario

**Part 1:**

~~~markdown
# API Rate Limiter, Part 1: Fixed Window

## Background

`src/RateLimiter.js` implements a fixed-window rate limiter. `processRequests(requests, config)` takes an array of requests sorted by timestamp and returns one result per request with a status of `"ALLOWED"` or `"BLOCKED"` and the remaining quota. A request at timestamp `T` belongs to window `Math.floor(T / windowSeconds)`; each user gets `maxRequests` per window, tracked independently per user.

## Bug Report

`RateLimiter.process()` is an unimplemented stub. All calls return `undefined`.

## What to Implement

- **`process(request)`** in `src/RateLimiter.js`: return `{ requestId, status, remainingQuota }` applying fixed-window rate limiting per user.

## Notes

- Windows are epoch-aligned, not relative to each user's first request. With `windowSeconds=60`, resets occur at `t=60, 120, ...` regardless of when the first request in that window arrived.
- `remainingQuota` is `maxRequests - countInWindow` for allowed requests and `0` for blocked.
- Multiple requests at the same timestamp are processed in array order.

~~~

**Part 2:**

~~~markdown
# API Rate Limiter, Part 2: Sliding Window

## Background

`src/RateLimiter.js` implements a sliding-window rate limiter. Part 1 is complete. For a request at time `T`, the relevant window is the interval `(T - windowSeconds, T]`; count all prior allowed requests from the same user within that interval. If the count is already `maxRequests` or more, block the request.

## Bug Report

`RateLimiter.process()` is an unimplemented stub. All calls return `undefined`.

## What to Implement

- **`process(request)`** in `src/RateLimiter.js`: return `{ requestId, status, remainingQuota }` applying sliding-window rate limiting per user.

## Notes

- Only allowed requests count toward the window; blocked requests are not recorded.
- The window is open on the left: a request at exactly `T - windowSeconds` is outside the window and does not count.
- `remainingQuota` is `maxRequests - countInWindow` for allowed requests and `0` for blocked.

~~~

**Part 3:**

~~~markdown
# API Rate Limiter, Part 3: Per-Route Limits

## Background

`src/RateLimiter.js` implements a per-route sliding-window rate limiter. Parts 1 and 2 are complete. Each request now includes a `route` field (e.g. `"GET /api/orders"`). Config specifies per-route limits via a `routes` array and a `defaultLimit` fallback. Route matching priority: exact match first, then most-specific wildcard (longest non-wildcard prefix), then default.

## Bug Report

Both `process()` and `resolveLimit()` are unimplemented stubs. All calls return `undefined`.

## What to Implement

- **`resolveLimit(route)`** in `src/RateLimiter.js`: return the matching `{ maxRequests, windowSeconds }` config for the given route string, following exact-then-wildcard-then-default priority.
- **`process(request)`** in `src/RateLimiter.js`: return `{ requestId, status, remainingQuota, matchedPattern }` using the sliding window algorithm with the per-route limit.

## Notes

- Wildcard patterns end with `/*`; when multiple wildcards match, the one with the longest prefix before `*` wins.
- Limits are tracked per user per matched pattern, not per URL. `GET /api/users` and `GET /api/orders` both matching `GET /api/*` share one quota bucket per user.
- Use `"default"` as `matchedPattern` when the default limit applies.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed. Epoch-aligned windows, open-left sliding interval, and per-pattern quota buckets are all stated.


---

## Cart State Reducer

### Revised scenario

**Part 1:**

~~~markdown
# Cart State Reducer, Part 1: ADD_ITEM Overwrites the Cart

## Background

`cartReducer` manages a shopping cart, handling `ADD_ITEM`, `REMOVE_ITEM`, and `CLEAR` actions. `applyCartActions(initialState, actions)` applies an array of these actions in sequence and returns the final state.

## Bug Report

Adding a second item silently removes the first. The cart never holds more than one item at a time.

## What to Implement

- **`applyCartActions(initialState, actions)`** in `solution.js`: fix `ADD_ITEM` so each new item is appended to the existing list rather than replacing it.

~~~

**Part 2:**

~~~markdown
# Cart State Reducer, Part 2: Total Computed from Stale Data

## Background

Part 1 is complete. The reducer now also tracks a `total` field: the sum of `price * qty` for every item. `UPDATE_QTY` changes the quantity of a single item and must recalculate `total`. Each item has `id`, `name`, `price`, and `qty` fields.

## Bug Report

After `UPDATE_QTY`, the `total` in the returned state always reflects the quantity before the change, not after.

## What to Implement

- **`applyCartActions(initialState, actions)`** in `solution.js`: fix `UPDATE_QTY` so `total` is computed from the post-update items array.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed (templated this session).


---

## Debounced Effect Bugs

### Revised scenario

**Part 1:**

~~~markdown
# Debounced Effect, Part 1: Timer Accumulation

## Background

`runDebouncedSimulation(ops, delay)` models a debounce mechanism. It processes two operation types: `{ type: 'TRIGGER', value }` representing user input, and `{ type: 'TICK' }` representing one unit of elapsed time. A value fires when `delay` ticks elapse without a new trigger. Returns an array of values that fired, in order.

## Bug Report

Issuing multiple triggers in succession causes all of them to fire instead of only the last one. Each trigger adds a new timer without cancelling the previous one, so every accumulated timer expires and fires.

## What to Implement

- **`runDebouncedSimulation(ops, delay)`** in `solution.js`: each `TRIGGER` must cancel any pending timer before scheduling a new one.

~~~

**Part 2:**

~~~markdown
# Debounced Effect, Part 2: New Triggers Ignored While Timer Is Running

## Background

Part 1 is complete. The same `runDebouncedSimulation(ops, delay)` function is used.

## Bug Report

When multiple triggers arrive while a timer is already pending, all but the first are silently dropped. The debouncer fires with the value from the first trigger rather than the most recent one.

## What to Implement

- **`runDebouncedSimulation(ops, delay)`** in `solution.js`: every `TRIGGER` must replace the pending timer with a new one carrying the latest value.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed.


---

## Event System Bugs

### Revised scenario

**Part 1:**

~~~markdown
# Event System, Part 1: Unsubscribe Has No Effect

## Background

`runSubscriptions(ops)` drives an `EventEmitter` through three operation types: `{ type: 'subscribe', key, event }`, `{ type: 'unsubscribe', key, event }`, and `{ type: 'emit', event }`. It returns the total number of times any handler was called across all emits.

## Bug Report

After a handler is unsubscribed, it keeps firing on subsequent emits. The `off` call removes nothing.

## What to Implement

- **`runSubscriptions(ops)`** in `solution.js`: fix `EventEmitter.prototype.on` so the reference stored for each handler is the same reference that `off` later filters against.

~~~

**Part 2:**

~~~markdown
# Event System, Part 2: Emit Drops the Payload

## Background

Part 1 is complete. `runEmitData(ops)` drives the same `EventEmitter` through `{ type: 'subscribe', event }` and `{ type: 'emit', event, data }` operations. It returns an array of every data value received by the handlers in the order they arrived.

## Bug Report

Every handler receives `undefined` regardless of what data was emitted. The correct payload values are never delivered.

## What to Implement

- **`runEmitData(ops)`** in `solution.js`: fix `EventEmitter.prototype.emit` so each handler is invoked with the `data` argument passed to `emit`.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed.


---

## useMemo Dependency Bug

### Revised scenario

**Part 1:**

~~~markdown
# useMemo Dependency Bug, Part 1: Cache Never Hits

## Background

`countComputations(callSets)` runs a memoized function with each argument set in `callSets` (an array of argument arrays) and returns how many times the underlying computation actually ran. The `memoize` wrapper should skip recomputation when called with the same arguments as the previous call.

## Bug Report

The cache never returns a cached result. Every call triggers a full recomputation, even when called with identical arguments back to back.

## What to Implement

- **`countComputations(callSets)`** in `solution.js`: fix `memoize` so repeated calls with the same argument values return the cached result without recomputing.

## Notes

- Arguments are compared by value, not by reference: `[1, 2]` and `[1, 2]` are different array objects but represent the same arguments.

~~~

**Part 2:**

~~~markdown
# useMemo Dependency Bug, Part 2: Only the First Argument Is Checked

## Background

Part 1 is complete. The same `countComputations(callSets)` function is used.

## Bug Report

A change in any argument after the first is not detected as a cache miss. Calling with `(1, 2)` then `(1, 3)` counts as one computation instead of two.

## What to Implement

- **`countComputations(callSets)`** in `solution.js`: fix the argument comparison so every position is checked, not just the first.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed. Value-vs-reference comparison note retained as a Notes constraint.


---

## Multi-Select Reducer Bugs

### Revised scenario

**Part 1:**

~~~markdown
# Multi-Select, Part 1: TOGGLE Condition Is Inverted

## Background

`applySelectActions(initialState, actions)` applies an array of `TOGGLE`, `SELECT_ALL_TOGGLE`, and `CLEAR` actions to a state of `{ items, selected }` and returns the final state. `selected` is an array of item IDs (integers).

## Bug Report

Clicking an unselected item does nothing. Clicking an already-selected item adds it again as a duplicate. Items can never be deselected.

## What to Implement

- **`applySelectActions(initialState, actions)`** in `solution.js`: fix `TOGGLE` so it deselects an item that is already in `selected` and selects one that is not.

~~~

**Part 2:**

~~~markdown
# Multi-Select, Part 2: SELECT_ALL Uses Wrong Threshold

## Background

Part 1 is complete. `SELECT_ALL_TOGGLE` should select all items when none or some are selected, and deselect all only when every item is already selected.

## Bug Report

`SELECT_ALL_TOGGLE` deselects all whenever any items are selected, not only when all items are selected. Clicking the header checkbox with a partial selection clears the selection instead of completing it.

## What to Implement

- **`applySelectActions(initialState, actions)`** in `solution.js`: fix `SELECT_ALL_TOGGLE` so it only deselects when every item in `state.items` is already in `state.selected`.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed.


---

## Optimistic Update Bugs

### Revised scenario

**Part 1:**

~~~markdown
# Optimistic Update, Part 1: ROLLBACK Restores the Wrong Value

## Background

`applyOptimisticActions(initialState, actions)` applies `OPTIMISTIC_UPDATE`, `CONFIRM`, and `ROLLBACK` actions to a state of `{ items, pending }`. `OPTIMISTIC_UPDATE` immediately changes an item's `text` and stores both the original and optimistic text in `pending[id]`. `ROLLBACK` is meant to undo that change.

## Bug Report

After `ROLLBACK`, the item's text appears unchanged. The rollback has no visible effect.

## What to Implement

- **`applyOptimisticActions(initialState, actions)`** in `solution.js`: fix `ROLLBACK` so it restores the item's text to the value it had before `OPTIMISTIC_UPDATE` was applied.

~~~

**Part 2:**

~~~markdown
# Optimistic Update, Part 2: CONFIRM Leaks the Pending Entry

## Background

Part 1 is complete. `ROLLBACK` contains a guard: if `pending[id]` does not exist, it returns state unchanged. This guard exists so that a stale server error arriving after a `CONFIRM` is safely ignored.

## Bug Report

A `ROLLBACK` that arrives after `CONFIRM` still overwrites the item's text with the original value. The guard never fires because `CONFIRM` never removes the entry from `pending`.

## What to Implement

- **`applyOptimisticActions(initialState, actions)`** in `solution.js`: fix `CONFIRM` so it removes `action.id` from `pending`, allowing the `ROLLBACK` guard to correctly ignore stale responses.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed.


---

## Paginated Feed Reducer

### Revised scenario

**Part 1:**

~~~markdown
# Paginated Feed, Part 1: FETCH_SUCCESS Overwrites Existing Items

## Background

`applyFeedActions(initialState, actions)` applies `FETCH_START`, `FETCH_SUCCESS`, and `RESET` actions to a state of `{ items, page, hasMore, loading }`. Each `FETCH_SUCCESS` delivers one page of results and increments `page` by 1.

## Bug Report

Fetching a second page causes the first page's items to disappear. Only the most recently fetched page is ever visible.

## What to Implement

- **`applyFeedActions(initialState, actions)`** in `solution.js`: fix `FETCH_SUCCESS` so new items are appended to `state.items` rather than replacing them.

~~~

**Part 2:**

~~~markdown
# Paginated Feed, Part 2: RESET Doesn't Reset the Page Counter

## Background

Part 1 is complete. `RESET` is used when the user starts a new search: it clears the item list and sets `loading` and `hasMore` back to their initial values so the feed can fetch from the beginning. `page` starts at `0` and increments by 1 on every `FETCH_SUCCESS`.

## Bug Report

After a `RESET`, the next `FETCH_SUCCESS` increments `page` from its pre-reset value instead of from 0. A feed on page 5 before the reset would treat the first response of the new search as page 6.

## What to Implement

- **`applyFeedActions(initialState, actions)`** in `solution.js`: fix `RESET` so `page` is set to `0`.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed.


---

## Search & Filter Reducer Bugs

### Revised scenario

**Part 1:**

~~~markdown
# Search Filter, Part 1: Case-Sensitive Match Misses Results

## Background

`applySearchActions(initialState, actions)` applies `SET_QUERY` and `SORT_BY` actions to a state of `{ allItems, query, sortBy, filteredItems }`. `SET_QUERY` updates `query` and recomputes `filteredItems` by matching item names against the query.

## Bug Report

Searching "report" returns no results even though the list contains "Q3 Report". Searches only succeed when the query's casing exactly matches the item name.

## What to Implement

- **`applySearchActions(initialState, actions)`** in `solution.js`: fix `SET_QUERY` so item name matching is case-insensitive.

~~~

**Part 2:**

~~~markdown
# Search Filter, Part 2: SORT_BY Drops the Active Filter

## Background

Part 1 is complete. `SORT_BY` should sort `filteredItems` while keeping the active query applied.

## Bug Report

Sorting after a search shows all items in sorted order, ignoring the current query. Items that were filtered out reappear after sorting.

## What to Implement

- **`applySearchActions(initialState, actions)`** in `solution.js`: fix `SORT_BY` so it applies both the current query filter and the new sort order when computing `filteredItems`.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed.


---

## Stale Closure Bugs

### Revised scenario

**Part 1:**

~~~markdown
# Stale Closure, Part 1: Batched Updates Read Stale State

## Background

`applyBatchedIncrements(initial, amounts)` schedules all increment updates before running any of them, then executes them in sequence and returns the final count. Each update is a closure that should add its amount to the current running total.

## Bug Report

When multiple amounts are scheduled, only the last one takes effect. Starting from 0 with amounts `[1, 2, 3]` returns `3` instead of `6`.

## What to Implement

- **`applyBatchedIncrements(initial, amounts)`** in `solution.js`: fix the update closures so each one reads the current value of `state` at the time it executes, not at the time it was scheduled.

~~~

**Part 2:**

~~~markdown
# Stale Closure, Part 2: Effect Cleanup Is Missing

## Background

`runPollingRounds(ticksPerRound, rounds)` runs `rounds` iterations. Each iteration registers a new callback, fires `ticksPerRound` ticks, records how many times the callback was called (`activeCalls`), and returns an array of per-round counts.

## Bug Report

Each round's count is higher than expected. By round 3, callbacks from rounds 1 and 2 are still firing, so `activeCalls` reflects all accumulated callbacks rather than only the current round's.

## What to Implement

- **`runPollingRounds(ticksPerRound, rounds)`** in `solution.js`: fix the end-of-round cleanup so the callback registered for the current round stops firing in subsequent rounds.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed.


---

## Customer Lifetime Analysis

### Revised scenario

**Part 1:**

~~~markdown
# Customer Lifetime Analysis, Part 1: Dormant Users

## Background

The `users` table has `id`, `email`, and `created_at`. The `purchases` table has `id`, `user_id`, `amount`, and `created_at`. The query should return all users who have never made a purchase.

## Bug Report

The query is an unimplemented stub and currently returns no results.

## What to Implement

- **`query.sql`**: return `id` and `email` for users with no entries in `purchases`, ordered by `id` ascending.
~~~

**Part 2:**

~~~markdown
# Customer Lifetime Analysis, Part 2: First vs Repeat Revenue

## Background

Part 1 is complete. The query should split all purchases into two types: a user's chronological first purchase (`'first'`) and every subsequent one (`'repeat'`). Return the count and total revenue for each type.

## Bug Report

The query is an unimplemented stub and currently returns no results.

## What to Implement

- **`query.sql`**: return `purchase_type`, `order_count`, and `total_revenue`, ordered by `purchase_type` ascending.

## Notes

- Chronological order (by `created_at`, not `id`) determines which purchase is each user's first.
~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed. Chronological-first rule stated in Notes.


---

## Conversion Funnel Analysis

### Revised scenario

**Part 1:**

~~~markdown
# Conversion Funnel Analysis, Part 1: Unique Users per Funnel Step

## Background

The `events` table has `user_id`, `event_type` (`'page_view'`, `'signup'`, `'purchase'`), and `created_at`. The query should return the number of distinct users who reached each funnel step.

## Bug Report

The query counts total event rows instead of unique users. A user who fired `'page_view'` four times is counted as 4 instead of 1, making the funnel appear wider than it is.

## What to Implement

- **`query.sql`**: fix the aggregate so each user is counted once per event type. Return `event_type` and `user_count`, ordered by `user_count` descending.
~~~

**Part 2:**

~~~markdown
# Conversion Funnel Analysis, Part 2: Signup-to-Purchase Conversion Rate

## Background

Part 1 is complete. The query counts distinct users who signed up and who purchased, then divides to produce a decimal conversion rate.

## Bug Report

`conversion_rate` returns `0` for every dataset, even when purchases clearly exist.

## What to Implement

- **`query.sql`**: fix the division so it returns a decimal result. Return `signup_users`, `purchase_users`, and `conversion_rate`.
~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed.


---

## Game Leaderboard

### Revised scenario

**Part 1:**

~~~markdown
# Game Leaderboard, Part 1: Rank by Score

## Background

The `scores` table has `player_id`, `category`, and `score`. The query should rank each player within their category, with rank 1 going to the highest score. Tied scores receive the same rank, and the rank after a tie skips accordingly (1, 1, 3).

## Bug Report

Rank 1 is assigned to the lowest score in each category. The leaderboard is inverted.

## What to Implement

- **`query.sql`**: fix the query so rank 1 goes to the highest score in each category. Return `player_id`, `category`, `score`, and `rnk`, ordered by `category` then `rnk` ascending.
~~~

**Part 2:**

~~~markdown
# Game Leaderboard, Part 2: Top Scorer Per Category

## Background

Part 1 is complete. The query should return one row per category: the player with the highest score in that category.

## Bug Report

The query returns one row for every player instead of one row per category.

## What to Implement

- **`query.sql`**: fix the query so it returns exactly one row per category: that category's highest-scoring player. Return `category`, `player_id`, and `score`, ordered by `category` ascending.
~~~

### Changes made

- **Flagged before:** Tie-rank semantics were only implied.
- **Changes:** Background now states tie behavior explicitly (1, 1, 3) and What to Implement lists exact output columns and ordering.


---

## User Retention & Cohort Analysis

### Revised scenario

**Part 1:**

~~~markdown
# User Retention & Cohort Analysis, Part 1: Day-30 Retained Users

## Background

The `users` table has `id` and `created_at`. The `sessions` table has `id`, `user_id`, and `created_at`. The query should return January 2024 users who had at least one session 30 or more days after their signup date, along with their earliest qualifying session date.

## Bug Report

The query is an unimplemented stub and currently returns no results.

## What to Implement

- **`query.sql`**: return `user_id`, `signup_date`, and `first_return_date` for qualifying users, ordered by `user_id` ascending.

## Notes

- The Day-30 boundary is inclusive: a session exactly 30 days after signup qualifies.
~~~

**Part 2:**

~~~markdown
# User Retention & Cohort Analysis, Part 2: Monthly Cohort Retention Rate

## Background

Part 1 is complete. For each signup cohort month, the query should count how many users had at least one session in the immediately following calendar month and compute the retention rate.

## Bug Report

The query is an unimplemented stub and currently returns no results.

## What to Implement

- **`query.sql`**: return `cohort_month` (YYYY-MM), `cohort_size`, `returned_next_month`, and `retention_rate` (rounded to 2 decimal places), ordered by `cohort_month` ascending.

## Notes

- Cohorts with zero returners must still appear with `returned_next_month = 0` and `retention_rate = 0.0`.
- `retention_rate` is a decimal; integer division will silently return `0`.
~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed. Inclusive Day-30 boundary and zero-returner cohorts stated.


---

## Monthly Revenue Report

### Revised scenario

**Part 1:**

~~~markdown
# Monthly Revenue Report, Part 1: Monthly Revenue Totals

## Background

The `orders` table has `user_id`, `amount`, `status` (`'completed'`, `'refunded'`, `'pending'`), and `created_at` (ISO date string). Starting from the empty `query.sql`, write a query that reports total completed-order revenue per calendar month.

## Requirements

- Return columns `month` (a `'YYYY-MM'` string) and `total_revenue` (integer sum of `amount`).
- Count completed orders only; refunded and pending orders contribute nothing.
- A month with no completed orders produces no row.
- Order rows by `month` ascending.

## What to Implement

- **`query.sql`**: write the monthly revenue query meeting the requirements above.
~~~

**Part 2:**

~~~markdown
# Monthly Revenue Report, Part 2: Month-over-Month Growth

## Background

Part 1 is complete. Extend the monthly report with a `mom_change` column: each month's `total_revenue` minus the previous month's.

## Requirements

- Return columns `month`, `total_revenue` (both as in Part 1), and `mom_change`.
- `mom_change` is NULL for the earliest month and may be negative.
- Count completed orders only.
- Order rows by `month` ascending.

## What to Implement

- **`query.sql`**: write the month-over-month query meeting the requirements above.
~~~

### Changes made

- **Flagged before:** Build-style parts read like bug reports for an empty file.
- **Changes:** Rewritten as Requirements with exact column names, month format, exclusion rules, and NULL behavior for the earliest month.


---

## Running Totals & Rolling Averages

### Revised scenario

**Part 1:**

~~~markdown
# Running Totals & Rolling Averages, Part 1: Cumulative Signup Count

## Background

The `daily_signups` table has `date` and `signups`. The query should return a running total: for each day, the cumulative sum of signups from the earliest row through that day.

## Bug Report

Every row has the same `running_total`: the grand total across all dates.

## What to Implement

- **`query.sql`**: fix the window function so `running_total` accumulates row by row. Return `date`, `signups`, and `running_total`, ordered by `date` ascending.
~~~

**Part 2:**

~~~markdown
# Running Totals & Rolling Averages, Part 2: 7-Day Rolling Average

## Background

Part 1 is complete. The query should compute a 7-day rolling average: for each day, the average of that day and the 6 preceding days.

## Bug Report

The rolling average includes 8 days of data instead of 7 once enough history exists.

## What to Implement

- **`query.sql`**: fix the window frame so it covers exactly 7 days. Return `date`, `signups`, and `rolling_avg_7d` (rounded to 2 decimal places), ordered by `date` ascending.

## Notes

- `ROWS BETWEEN N PRECEDING AND CURRENT ROW` spans N+1 rows total (N preceding plus the current row).
~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed. Window-frame arithmetic note retained (documented SQL semantics, not the located bug).


---

## Customer Spend Segmentation

### Revised scenario

**Part 1:**

~~~markdown
# Customer Spend Segmentation, Part 1: Spend Quartile Assignment

## Background

The `orders` table has `user_id` and `amount`. Multiple orders per user should be summed. The query assigns each user to one of four spend quartiles, with quartile 1 = highest spenders and quartile 4 = lowest.

## Bug Report

Quartile 1 is assigned to the lowest spenders. The segmentation is completely inverted.

## What to Implement

- **`query.sql`**: fix the window ordering so quartile 1 contains the highest spenders. Return `user_id`, `total_spend`, and `spend_quartile`, ordered by `total_spend` descending.
~~~

**Part 2:**

~~~markdown
# Customer Spend Segmentation, Part 2: Consecutive Spend Ranking

## Background

Part 1 is complete. The query ranks users by total spend (highest = rank 1). Tied users must receive the same rank, and the next distinct rank must be the next consecutive integer with no gaps.

## Bug Report

When two users have identical total spend, the next rank skips a number: `1, 2, 2, 4` instead of `1, 2, 2, 3`.

## What to Implement

- **`query.sql`**: replace the ranking function with one that assigns consecutive ranks after ties. Return `user_id`, `total_spend`, and `spend_rank`, ordered by `spend_rank` then `user_id` ascending.
~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed.


---

## User Spend Report

### Revised scenario

**Part 1:**

~~~markdown
# User Spend Report, Part 1: Per-User Totals

## Background

The `orders` table has columns `user_id`, `amount`, `status` (`'completed'`, `'refunded'`, `'pending'`), and `created_at`. The query should return each user's total completed spend as `user_id` and `total_spend`, ordered by `total_spend` descending.

## Bug Report

The query returns a single row with a grand total instead of one row per user.

## What to Implement

- **`query.sql`**: fix the query so it returns one row per `user_id` with that user's total completed spend as `total_spend`, ordered by `total_spend` descending.
~~~

**Part 2:**

~~~markdown
# User Spend Report, Part 2: High-Value Customer Filter

## Background

Part 1 is complete. The query should return only users whose total completed spend is strictly greater than 100 (a total of exactly 100 is excluded), with columns `user_id` and `total_spend`, ordered by `total_spend` descending.

## Bug Report

Running the query fails with the error `no such column: total_spend`.

## What to Implement

- **`query.sql`**: fix the query so it executes without error and returns only users above the threshold.
~~~

### Changes made

- **Flagged before:** Part 2 threshold boundary (exactly 100) was ambiguous.
- **Changes:** Background now states strictly-greater-than with the boundary case called out; Bug Report quotes the exact SQL error.


---

## Role-Based Access Control

### Revised scenario

~~~markdown
# Role-Based Access Control

## Background

`checkAccess(userId, resource, action, db)` in `gateway.js` enforces role-based access control: users belong to groups, groups map to roles, and roles carry permission strings of the form `resource:action`. It returns `{ granted, reason }`, where `reason` is an empty string when access is granted.

```
gateway.js           ← entry point; orchestrates the full access check
userStore.js         ← looks up a user record from the directory
membershipService.js ← resolves which groups the user belongs to
roleRegistry.js      ← maps group names to role identifiers
permissionService.js ← tests whether any of the user's roles hold the permission
policyStore.js       ← static role → permission mapping
```

**The `db` object passed to `checkAccess`:**
```js
{
  users:       { alice: {}, bob: {}, carol: {}, dave: {} },
  memberships: [
    { userId: 'alice', group: 'editors'    },
    { userId: 'bob',   group: 'viewers'    },
    { userId: 'carol', group: 'moderators' },
    { userId: 'dave',  group: 'admins'     },
  ],
}
```

## Bug Report

Every user is denied every permission, even when their group maps to a role that grants it. Alice is in `editors` but `posts:read` is denied. Bob is in `viewers` and `posts:read` is denied for him too. Unknown users are still rejected with the correct `User '<id>' not found` reason.

## What to Implement

- Locate the defect and fix it so **`checkAccess(userId, resource, action, db)`** grants and denies access according to the membership, role, and policy data. The bug may be in any module; the tests call only `checkAccess`.
~~~

### Changes made

- **Flagged before:** Old format. Contained solution hints: "The policyStore and roleRegistry both look correct" and "find why group resolution is returning the wrong data" pointed directly at the buggy module. Example db showed 3 users but tests use 4.
- **Changes:** Retemplated (Background / Bug Report / What to Implement). Removed both hint sentences; the symptom (every user denied everything, unknown users still handled correctly) carries all legitimate information. Synced the db example to the 4-user shape the tests use. Stated the { granted, reason } return contract.


---

## Event Metrics Aggregator

### Revised scenario

~~~markdown
# Event Metrics Aggregator

## Background

`aggregateMetrics(rawEvents)` in `pipeline.js` aggregates a raw analytics event stream into purchase statistics and returns `{ totalRevenue, uniqueUsers, avgOrderValue }`. The stream may contain nulls and malformed entries. Event types: `purchase` (has an `amount` and `userId`) and engagement events such as `page_view`, `click`, `login` (no `amount`).

```
pipeline.js           ← entry point; coordinates all pipeline stages in sequence
eventParser.js        ← strips null/undefined entries from the raw stream
eventValidator.js     ← filters events missing required fields (type + userId)
eventEnricher.js      ← enriches purchase events with commerce metadata
revenueAccumulator.js ← computes total revenue and average order value
userCounter.js        ← counts unique users who made a purchase
reportAssembler.js    ← assembles the final metrics report
```

## Bug Report

The pipeline returns `{ totalRevenue: 0, uniqueUsers: 0, avgOrderValue: 0 }` regardless of how many valid purchase events are in the batch.

## What to Implement

- Locate the defect and fix it so **`aggregateMetrics(rawEvents)`** returns the correct statistics: `totalRevenue` (sum of purchase amounts, rounded to 2 decimal places), `uniqueUsers` (count of distinct purchasers), and `avgOrderValue` (revenue divided by purchase count, rounded to 2 decimal places, `0` when there are no purchases). The bug may be in any module; the tests call only `aggregateMetrics`.
~~~

### Changes made

- **Flagged before:** Old format. "eventParser and eventValidator appear to work" and "Trace the enriched event stream into the accumulators" eliminated most of the search space.
- **Changes:** Retemplated. Removed both narrowing sentences; the symptom (all-zeros output regardless of input) stands alone. Added the exact output contract including rounding and the zero-purchase case, which hidden tests assert.


---

## Order Processing Pipeline

### Revised scenario

~~~markdown
# Order Processing Pipeline

## Background

`processOrder(order)` in `orderProcessor.js` runs a checkout service that validates, prices, and approves customer orders. `order` has `items` (an array of `{ id, name, price, qty }`), `couponCode` (string or null), and `taxRate` (decimal, e.g. `0.08` for 8%). It returns `{ approved, total, reason }`, where `reason` is an empty string for approved orders.

```
orderProcessor.js   ← entry point; orchestrates the full checkout flow
cartValidator.js    ← validates cart structure and each item's required fields
inventoryService.js ← simulated stock availability check
pricingEngine.js    ← computes the order subtotal from line items
discountService.js  ← resolves and applies coupon codes
taxService.js       ← applies the regional tax rate and rounds to cents
receiptBuilder.js   ← assembles the final receipt object
```

## Bug Report

Multi-quantity orders come back with incorrect totals. A cart with 5 widgets at $20 each should cost $100 but returns $25. Single-quantity orders are only slightly off, so simple smoke tests pass.

## What to Implement

- Locate the defect and fix it so **`processOrder(order)`** returns the correct `{ approved, total, reason }` for every order. The bug may be in any module; the tests call only `processOrder`.
~~~

### Changes made

- **Flagged before:** Old format. "validation and inventory pass cleanly, so focus on where line totals are computed" pointed at the pricing layer.
- **Changes:** Retemplated. Removed the trace hint; kept the concrete symptom (5 x $20 = $25) and the smoke-test observation. Stated the full order input shape and { approved, total, reason } contract.


---

## Transaction Rules Engine

### Revised scenario

**Part 1:**

~~~markdown
# Transaction Rules Engine, Part 1: Basic Rule Matching

## Background

`src/parser.js` and `src/evaluator.js` implement a rule-based transaction evaluation engine. `processTransaction(transaction, rules)` takes a transaction object and an ordered list of rule strings, and returns the action of the first matching rule. If no rule matches, it returns `"ACCEPT"`. Each rule has the format `ACTION if FIELD OPERATOR VALUE`, where ACTION is `ACCEPT` or `BLOCK`, FIELD is `amount`, `merchant`, or `country`, and OPERATOR is one of `==`, `!=`, `<`, `>`, `<=`, `>=`.

## Bug Report

`parseRule`, `matchesRule`, and `processTransaction` are all unimplemented stubs. All calls to `processTransaction` return `undefined`.

## What to Implement

- **`parseRule(ruleStr)`** in `src/parser.js`: parse a rule string into `{ action, field, operator, value }`.
- **`matchesRule(rule, transaction)`** in `src/evaluator.js`: return `true` if the transaction satisfies the rule's condition.
- **`processTransaction(transaction, rules)`** in `solution.js`: evaluate rules in order and return the first matching action, or `"ACCEPT"` if none match.

## Notes

- Numeric values are bare integers or decimals; string values are double-quoted in the rule string.
- String comparisons are case-sensitive.

~~~

**Part 2:**

~~~markdown
# Transaction Rules Engine, Part 2: AND Conditions

## Background

`src/parser.js` and `src/evaluator.js` implement a transaction rules engine. Part 1 is complete. Part 2 extends the rule format to allow multiple conditions joined by `AND`: `ACTION if COND AND COND AND ...`. A rule matches only if all its conditions are satisfied. Single-condition rules from Part 1 remain valid.

## Bug Report

The parser and evaluator only handle single-condition rules. Rules containing `AND` are parsed incorrectly or only the first condition is evaluated, causing multi-condition rules to never match as intended.

## What to Implement

- **`parseRule(ruleStr)`** in `src/parser.js`: split the condition portion on `' AND '` and parse each sub-condition independently, storing them as a list.
- **`matchesRule(rule, transaction)`** in `src/evaluator.js`: return `true` only if all conditions in the rule are satisfied.

## Notes

- `AND` tokens are always surrounded by single spaces.

~~~

**Part 3:**

~~~markdown
# Transaction Rules Engine, Part 3: OR and Precedence

## Background

`src/parser.js` and `src/evaluator.js` implement a transaction rules engine. Parts 1 and 2 are complete. Part 3 adds `OR`: rules now have the form `ACTION if CLAUSE OR CLAUSE OR ...`, where each `CLAUSE` is one or more conditions joined by `AND`. Standard boolean precedence applies: `AND` binds more tightly than `OR`, so `A OR B AND C` is parsed as `A OR (B AND C)`.

## Bug Report

The parser and evaluator do not handle `OR`. Rules containing `OR` either crash, evaluate only the first clause, or return incorrect results when later clauses would have matched.

## What to Implement

- **`parseRule(ruleStr)`** in `src/parser.js`: split the condition portion on `' OR '` to get clauses, then split each clause on `' AND '` to get individual conditions, producing an array of AND-clause arrays.
- **`matchesRule(rule, transaction)`** in `src/evaluator.js`: return `true` if at least one OR-clause is fully satisfied (all its conditions match).

## Notes

- `AND` and `OR` tokens are always surrounded by single spaces. No parentheses appear in rules.

~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed. Grammar, precedence (AND binds tighter than OR), and tokenization guarantees are explicit.


---

## Prefix Tree (Trie)

### Revised scenario

**Part 1:**

~~~markdown
# Trie, Part 1: Exact-Word Search

## Background

`lib/trie.py` implements a prefix tree using plain Python dicts as nodes. The special key `'$'` marks that a complete word ends at that node.

## Bug Report

`search(word)` returns `True` for words that were never inserted. After `insert("apple")`, `search("app")` returns `True` even though `"app"` was never inserted, while `search("banana")` correctly returns `False`.

## What to Implement

- **`search(word)`** in `lib/trie.py`: return `True` only for words that were inserted exactly; return `False` for everything else, including proper prefixes of inserted words.

~~~

**Part 2:**

~~~markdown
# Trie, Part 2: get_words_with_prefix()

## Background

`lib/trie.py` is a prefix tree. The `search()` bug from Part 1 is fixed.

## Bug Report

`get_words_with_prefix(prefix)` should return every inserted word that begins with `prefix`. Instead it returns words whose leading characters are the prefix reversed: `get_words_with_prefix("app")` yields `["ppa", "ppale"]` instead of `["app", "apple"]`.

## What to Implement

- **`get_words_with_prefix(prefix)`** in `lib/trie.py`: collect and return all words in the trie that start with `prefix`.

~~~

**Part 3:**

~~~markdown
# Trie, Part 3: Case-Insensitive Operations

## Background

`lib/trie.py` is a prefix tree. Bugs from Parts 1–2 are fixed. `insert()` already normalises every character to lowercase via `c.lower()` before storing it.

## Bug Report

`search()`, `starts_with()`, and `get_words_with_prefix()` traverse using the original (unnormalised) input characters. Mixed-case lookups silently fail: after `insert("Apple")` (stored as `"apple"`), `search("Apple")` returns `False` because it looks for `'A'`, which does not exist in the trie.

## What to Implement

- **`search(word)`**, **`starts_with(prefix)`**, **`get_words_with_prefix(prefix)`** in `lib/trie.py`: normalise each input character to lowercase when traversing, so lookups match the stored keys regardless of input case.

## Notes

Returned words must be fully lowercase regardless of the casing of the original `insert()` or lookup input.

~~~

### Changes made

- **Flagged before:** Part 3 Notes named the internal _dfs seed string as the place where casing goes wrong: a fix-location hint.
- **Changes:** Replaced with the behavioral requirement only: returned words must be fully lowercase. Part 1-2 revised earlier in this pass to template with concrete symptom examples.


---

## Webhook Event Router

### Revised scenario

**Part 1:**

~~~markdown
# Webhook Event Router, Part 1: Event Classifier

## Background

`classifyEvent(rawType)` in `src/classifier.js` receives a dot-separated Stripe webhook type string (e.g., `"payment.refunded"`), splits on the first dot, and returns a normalized kind string. Valid kinds are `payment_created`, `payment_refunded`, `payment_failed`, `subscription_created`, `subscription_canceled`; anything else returns `"unknown"`.

## Bug Report

`payment.canceled` returns `"subscription_canceled"` instead of `"unknown"`. Subscription events themselves appear to work correctly.

## What to Implement

- **`classifyEvent(rawType)`** in `src/classifier.js`: fix the condition that classifies subscription events so it does not match non-subscription event types.
~~~

**Part 2:**

~~~markdown
# Webhook Event Router, Part 2: Event Normaliser

## Background

Part 1 is complete. `normalizeEvent(event)` in `src/normalizer.js` takes a raw Stripe webhook event object and returns a flattened normalized representation. Refund events include an `originalPaymentId` field on the input referencing the original charge.

## Bug Report

Refund events normalize without error, but the `originalPaymentId` field in the returned object always contains the refund event's own `id` instead of the original charge ID. All other event types normalize correctly.

## What to Implement

- **`normalizeEvent(event)`** in `src/normalizer.js`: fix the refund branch to read `originalPaymentId` from the correct field on the input event. Do not modify `src/classifier.js`.
~~~

**Part 3:**

~~~markdown
# Webhook Event Router, Part 3: Priority Dispatcher

## Background

Parts 1 and 2 are complete. `sortEvents(events)` in `src/router.js` sorts an array of normalized events from highest to lowest urgency using a numeric PRIORITY map (lower number = higher urgency). Events with equal priority must preserve their original relative order.

## Bug Report

Events with distinct priorities sort correctly. Events with equal priority arrive in reverse input order instead of the original order.

## What to Implement

- **`sortEvents(events)`** in `src/router.js`: fix the tiebreaker in the sort comparator so equal-priority events retain their original input order.
~~~

### Changes made

- **Flagged before:** Nothing significant.
- **Changes:** No changes needed.

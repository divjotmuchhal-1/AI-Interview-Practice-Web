// ── Merge Intervals ───────────────────────────────────────────────────────────
// Inspired by: Google / Meta scheduling interviews
// Three parts: merge overlapping → count gaps → schedule tasks (greedy)

// ── Buggy lib files ───────────────────────────────────────────────────────────

// Part 1: merge overlapping intervals. Bug: uses < instead of <= for overlap check
// so adjacent intervals like [1,4] and [4,6] are NOT merged
const P1_LIB = `
def merge_intervals(intervals):
    """
    Merge overlapping intervals. Adjacent intervals that share an endpoint
    are considered overlapping and must be merged.

    intervals: list of [start, end] pairs (integers, start <= end)
    Returns:   sorted, merged list of [start, end] pairs

    Example: [[1,3],[2,6],[8,10],[15,18]] -> [[1,6],[8,10],[15,18]]
    """
    if not intervals:
        return []

    # Sort by start time
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_intervals[0][:]]

    for start, end in sorted_intervals[1:]:
        last = merged[-1]
        if start < last[1]:
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])

    return merged
`.trim();

// Part 2: count gaps between intervals. Bug: wrong gap calculation (start - prev_end vs prev_end - start)
const P2_LIB = `
def merge_intervals(intervals):
    """Merge overlapping intervals."""
    if not intervals:
        return []
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_intervals[0][:]]
    for start, end in sorted_intervals[1:]:
        last = merged[-1]
        if start <= last[1]:
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])
    return merged


def count_gaps(intervals, range_start, range_end):
    """
    Count the total length of uncovered time within [range_start, range_end].

    First merges the intervals, then sums the gaps between consecutive merged
    intervals that fall within the given range.

    intervals:   list of [start, end] pairs
    range_start: inclusive left bound of the range to check
    range_end:   inclusive right bound of the range to check
    Returns:     integer total uncovered length
    """
    if not intervals:
        return range_end - range_start

    merged = merge_intervals(intervals)

    # Clip to [range_start, range_end]
    clipped = []
    for s, e in merged:
        cs = max(s, range_start)
        ce = min(e, range_end)
        if cs < ce:
            clipped.append([cs, ce])

    if not clipped:
        return range_end - range_start

    total_covered = sum(e - s for s, e in clipped)
    return (range_end - range_start + 1) - total_covered
`.trim();

// Part 3: schedule non-overlapping tasks greedily (earliest-end-time-first)
// Bug: sorts by start time instead of end time, giving suboptimal / incorrect schedule
const P3_LIB = `
def merge_intervals(intervals):
    if not intervals:
        return []
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_intervals[0][:]]
    for start, end in sorted_intervals[1:]:
        last = merged[-1]
        if start <= last[1]:
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])
    return merged


def count_gaps(intervals, range_start, range_end):
    if not intervals:
        return range_end - range_start
    merged = merge_intervals(intervals)
    clipped = []
    for s, e in merged:
        cs = max(s, range_start)
        ce = min(e, range_end)
        if cs < ce:
            clipped.append([cs, ce])
    if not clipped:
        return range_end - range_start
    total_covered = sum(e - s for s, e in clipped)
    return (range_end - range_start) - total_covered


def schedule_tasks(tasks):
    """
    Select the maximum number of non-overlapping tasks using a greedy strategy.

    Each task is [start, end]. Two tasks conflict if they overlap (i.e., one
    starts before the other ends).

    The greedy optimal strategy: always pick the task with the earliest end time
    that starts after the last selected task ends.

    tasks:   list of [start, end] pairs
    Returns: list of selected [start, end] pairs in order
    """
    if not tasks:
        return []

    sorted_tasks = sorted(tasks, key=lambda x: x[0])

    selected = [sorted_tasks[0]]
    last_end = sorted_tasks[0][1]

    for start, end in sorted_tasks[1:]:
        if start >= last_end:
            selected.append([start, end])
            last_end = end

    return selected
`.trim();

// ── Solution stubs ────────────────────────────────────────────────────────────

const SOLUTION_P1 = `from lib.intervals import merge_intervals
`;
const SOLUTION_P2 = `from lib.intervals import count_gaps
`;
const SOLUTION_P3 = `from lib.intervals import schedule_tasks
`;

// ── tests.py (one per part, different functions exposed each part) ────────────

const TESTS_PY_P1 = `
from solution import merge_intervals

# Use this file to experiment with merge_intervals.
# merge_intervals(intervals) merges overlapping and adjacent intervals.
# Output appears in the "tests.py output" panel when you click Run Tests.

# Example 1: basic overlap
result = merge_intervals([[1, 3], [2, 6], [8, 10], [15, 18]])
print("Basic overlap:")
print(" ", result)
# -> [[1, 6], [8, 10], [15, 18]]

# Example 2: adjacent intervals share an endpoint
result = merge_intervals([[1, 4], [4, 6]])
print("Adjacent intervals [1,4] and [4,6]:")
print(" ", result)
# -> [[1, 6]]

# Example 3: no overlaps
result = merge_intervals([[1, 2], [3, 4], [5, 6]])
print("No overlaps:")
print(" ", result)
# -> [[1, 2], [3, 4], [5, 6]]

# Try your own:
# print(merge_intervals([[2, 5], [4, 8], [10, 12]]))
`.trim();

const TESTS_PY_P2 = `
from solution import count_gaps

# Use this file to experiment with count_gaps.
# count_gaps(intervals, range_start, range_end) returns total uncovered length.
# Intervals use half-open semantics: [start, end) has length = end - start.
# Output appears in the "tests.py output" panel when you click Run Tests.

# Example 1: two intervals leave gaps at [0,2), [5,8), [10,12)
result = count_gaps([[2, 5], [8, 10]], 0, 12)
print("Gaps in [0,12) with intervals [2,5] and [8,10]:")
print(" ", result)
# -> 7

# Example 2: no intervals → entire range is uncovered
result = count_gaps([], 0, 10)
print("No intervals, range [0,10):")
print(" ", result)
# -> 10

# Example 3: full coverage → no gap
result = count_gaps([[0, 10]], 0, 10)
print("Full coverage [0,10):")
print(" ", result)
# -> 0

# Try your own:
# print(count_gaps([[1, 4], [3, 7]], 0, 10))
`.trim();

const TESTS_PY_P3 = `
from solution import schedule_tasks

# Use this file to experiment with schedule_tasks.
# schedule_tasks(tasks) returns the maximum non-overlapping subset of tasks.
# Two tasks conflict if one starts strictly before the other ends.
# Output appears in the "tests.py output" panel when you click Run Tests.

# Example 1: classic example: sort by end to find 3 tasks
result = schedule_tasks([[0, 6], [1, 2], [3, 5], [5, 7]])
print("Classic [[0,6],[1,2],[3,5],[5,7]]:")
print(" ", result)
# -> [[1, 2], [3, 5], [5, 7]]

# Example 2: all overlapping, only one can be selected
result = schedule_tasks([[0, 5], [1, 6], [2, 7]])
print("All overlapping, pick earliest end:")
print(" ", result)
# -> [[0, 5]]

# Example 3: no conflicts, all selected
result = schedule_tasks([[1, 2], [3, 4], [5, 6]])
print("No conflicts:")
print(" ", result)
# -> [[1, 2], [3, 4], [5, 6]]

# Try your own:
# print(schedule_tasks([[0, 10], [1, 2], [3, 4], [5, 6]]))
`.trim();

// ── READMEs ───────────────────────────────────────────────────────────────────

const README_P1 = `# Merge Intervals, Part 1: Merge Overlapping Intervals

## Background

\`lib/intervals.py\` implements interval utilities. \`merge_intervals(intervals)\` takes an unsorted list of \`[start, end]\` integer pairs and returns a sorted list with all overlapping and adjacent intervals combined. Two intervals are overlapping if one starts at or before the other ends; \`[1,4]\` and \`[4,6]\` share endpoint 4 and must merge to \`[1,6]\`.

## Bug Report

Adjacent intervals that share exactly one endpoint are not merged. \`merge_intervals([[1,4],[4,6]])\` returns \`[[1,4],[4,6]]\` instead of \`[[1,6]]\`.

## What to Implement

- **\`merge_intervals(intervals)\`** in \`lib/intervals.py\`: merge intervals that overlap or share an endpoint, returning a sorted list of non-overlapping intervals.

## Notes

Single-point intervals (e.g., \`[5,5]\`) are valid. Empty input returns \`[]\`.
`;

const README_P2 = `# Merge Intervals, Part 2: Count Gaps

## Background

\`lib/intervals.py\` implements interval utilities. Bugs from Part 1 are fixed. \`count_gaps(intervals, range_start, range_end)\` returns the total integer length within the query range not covered by any interval. The range uses half-open semantics: \`[range_start, range_end)\` has length \`range_end - range_start\`. \`merge_intervals\` is available and correct.

## Bug Report

\`count_gaps\` returns a value one greater than the correct answer. For a range \`[0, 12)\` with intervals \`[[2,5],[8,10]]\`, it returns 8 instead of 7.

## What to Implement

- **\`count_gaps(intervals, range_start, range_end)\`** in \`lib/intervals.py\`: return the total uncovered length within \`[range_start, range_end)\`.

## Notes

The range is half-open: \`range_end\` is not included in the range length. Intervals outside the range are clipped. If no interval intersects the range, return \`range_end - range_start\`.
`;

const README_P3 = `# Merge Intervals, Part 3: Task Scheduler

## Background

\`lib/intervals.py\` implements interval utilities. Bugs from Parts 1 and 2 are fixed. \`schedule_tasks(tasks)\` takes a list of \`[start, end]\` task intervals and returns the largest possible subset of non-overlapping tasks in chronological order. Two tasks conflict if one starts strictly before the other ends.

## Bug Report

The scheduler returns a valid non-overlapping set of tasks but consistently selects fewer tasks than the maximum possible. Given inputs where a different selection would allow more tasks to fit, the function misses them.

## What to Implement

- **\`schedule_tasks(tasks)\`** in \`lib/intervals.py\`: select and return the maximum number of non-overlapping tasks as \`[start, end]\` pairs in order.

## Notes

Return the selected tasks themselves, not just the count. Empty input returns \`[]\`.
`;

// ── Tests ─────────────────────────────────────────────────────────────────────

const VIS_P1 = [
  { id: 'v1', description: 'basic overlap: [[1,3],[2,6],[8,10],[15,18]] → [[1,6],[8,10],[15,18]]',
    input: { intervals: [[1,3],[2,6],[8,10],[15,18]] }, expectedOutput: [[1,6],[8,10],[15,18]] },
  { id: 'v2', description: 'adjacent intervals must merge: [[1,4],[4,6]] → [[1,6]]',
    input: { intervals: [[1,4],[4,6]] }, expectedOutput: [[1,6]] },
  { id: 'v3', description: 'no overlaps: [[1,2],[3,4],[5,6]] → unchanged',
    input: { intervals: [[1,2],[3,4],[5,6]] }, expectedOutput: [[1,2],[3,4],[5,6]] },
  { id: 'v4', description: 'fully contained interval: [[1,10],[2,5]] → [[1,10]]',
    input: { intervals: [[1,10],[2,5]] }, expectedOutput: [[1,10]] },
  { id: 'v5', description: 'single interval returns itself',
    input: { intervals: [[3,7]] }, expectedOutput: [[3,7]] },
];

const HID_P1 = [
  { id: 'h1', description: 'empty list → []',
    input: { intervals: [] }, expectedOutput: [] },
  { id: 'h2', description: 'three-way chain of adjacent intervals: [[1,2],[2,3],[3,4]] → [[1,4]]',
    input: { intervals: [[1,2],[2,3],[3,4]] }, expectedOutput: [[1,4]] },
  { id: 'h3', description: 'unsorted input gets sorted first: [[5,6],[1,3],[2,4]] → [[1,4],[5,6]]',
    input: { intervals: [[5,6],[1,3],[2,4]] }, expectedOutput: [[1,4],[5,6]] },
  { id: 'h4', description: 'all intervals merge into one: [[1,5],[2,6],[3,7]] → [[1,7]]',
    input: { intervals: [[1,5],[2,6],[3,7]] }, expectedOutput: [[1,7]] },
  { id: 'h5', description: 'single-point interval [3,3] does not merge with [4,6]',
    input: { intervals: [[3,3],[4,6]] }, expectedOutput: [[3,3],[4,6]] },
  { id: 'h6', description: 'single-point interval [4,4] merges with [4,6] (adjacent)',
    input: { intervals: [[4,4],[4,6]] }, expectedOutput: [[4,6]] },
  { id: 'h7', description: 'three intervals each separated by a gap of 1: must not over-merge (catches start <= last_end+1 wrong fix)',
    input: { intervals: [[1,4],[5,8],[9,12]] }, expectedOutput: [[1,4],[5,8],[9,12]] },
];

const VIS_P2 = [
  { id: 'v1', description: 'two intervals with gaps: range [0,12), gaps at [0,2) and [5,8) and [10,12) → 7',
    input: { intervals: [[2,5],[8,10]], range_start: 0, range_end: 12 }, expectedOutput: 7 },
  { id: 'v2', description: 'no intervals → entire range is gap',
    input: { intervals: [], range_start: 0, range_end: 10 }, expectedOutput: 10 },
  { id: 'v3', description: 'full coverage → gap is 0',
    input: { intervals: [[0,10]], range_start: 0, range_end: 10 }, expectedOutput: 0 },
  { id: 'v4', description: 'interval completely outside range → full gap',
    input: { intervals: [[20,30]], range_start: 0, range_end: 10 }, expectedOutput: 10 },
];

const HID_P2 = [
  { id: 'h1', description: 'overlapping intervals first get merged: [[1,4],[3,7]] in [0,10) → 3',
    input: { intervals: [[1,4],[3,7]], range_start: 0, range_end: 10 }, expectedOutput: 4 },
  { id: 'h2', description: 'interval partially overlaps range left: [[−2,5]] in [0,10) → 5',
    input: { intervals: [[-2,5]], range_start: 0, range_end: 10 }, expectedOutput: 5 },
  { id: 'h3', description: 'single unit gap: [[0,5],[6,10]] in [0,10) → 1',
    input: { intervals: [[0,5],[6,10]], range_start: 0, range_end: 10 }, expectedOutput: 1 },
  { id: 'h4', description: 'range of length 1 fully covered → 0',
    input: { intervals: [[3,5]], range_start: 3, range_end: 4 }, expectedOutput: 0 },
  { id: 'h5', description: 'range of length 1 not covered → 1',
    input: { intervals: [[5,10]], range_start: 3, range_end: 4 }, expectedOutput: 1 },
];

const VIS_P3 = [
  { id: 'v1', description: 'classic example: [[0,6],[1,2],[3,5],[5,7]] → [[1,2],[3,5],[5,7]] (3 tasks)',
    input: { tasks: [[0,6],[1,2],[3,5],[5,7]] }, expectedOutput: [[1,2],[3,5],[5,7]] },
  { id: 'v2', description: 'no conflicts → all selected',
    input: { tasks: [[1,2],[3,4],[5,6]] }, expectedOutput: [[1,2],[3,4],[5,6]] },
  { id: 'v3', description: 'all overlap → only one selected (earliest end)',
    input: { tasks: [[0,5],[1,6],[2,7]] }, expectedOutput: [[0,5]] },
  { id: 'v4', description: 'empty list → []',
    input: { tasks: [] }, expectedOutput: [] },
  { id: 'v5', description: 'single task → returned as-is',
    input: { tasks: [[2,4]] }, expectedOutput: [[2,4]] },
];

const HID_P3 = [
  { id: 'h1', description: 'sorting by end reveals 3 tasks; sorting by start gives only 1',
    input: { tasks: [[0,8],[1,3],[2,5],[4,7]] }, expectedOutput: [[1,3],[4,7]] },
  { id: 'h2', description: 'tie on end time: [[1,4],[2,4],[5,8]] → [[1,4],[5,8]] or [[2,4],[5,8]]',
    input: { tasks: [[1,4],[2,4],[5,8]] }, expectedOutput: [[1,4],[5,8]] },
  { id: 'h3', description: 'adjacent tasks (end==start) are compatible: [[1,3],[3,5]] → both selected',
    input: { tasks: [[1,3],[3,5]] }, expectedOutput: [[1,3],[3,5]] },
  { id: 'h4', description: 'longer first task blocks more: [[0,10],[1,2],[3,4],[5,6],[7,8]] → 4 tasks with end-sort',
    input: { tasks: [[0,10],[1,2],[3,4],[5,6],[7,8]] }, expectedOutput: [[1,2],[3,4],[5,6],[7,8]] },
  { id: 'h5', description: 'unsorted input handled correctly',
    input: { tasks: [[5,8],[1,3],[2,6],[0,2]] }, expectedOutput: [[0,2],[2,6]] },
  { id: 'h6', description: 'one long blocker vs four short tasks: end-sort selects 4, start-sort picks only 1; verifies count of selected tasks',
    input: { tasks: [[0,5],[1,2],[2,3],[3,4],[4,6]] }, expectedOutput: [[1,2],[2,3],[3,4],[4,6]] },
];

// ── Exported scenario ─────────────────────────────────────────────────────────

export const mergeIntervals = {
  id: 'merge-intervals',
  title: 'Merge Intervals',
  difficulty: 'Medium',
  durationMinutes: 30,
  tags: ['intervals', 'greedy', 'sorting'],
  description:
    'Classic interval problems from a calendar/scheduling context. Three parts: merge overlapping intervals → count uncovered gaps → schedule the maximum number of non-overlapping tasks using a greedy strategy.',
  parts: [
    {
      id: 'part-1', number: 1, title: 'Merge Overlapping Intervals',
      readme: README_P1,
      starterFiles: {
        'lib/intervals.py': P1_LIB,
        'solution.py': SOLUTION_P1,
        'tests.py': TESTS_PY_P1,
      },
      visibleTests: VIS_P1,
      hiddenTests: HID_P1,
      trap: 'Adjacent intervals (where one ends exactly where the other starts, e.g. [1,4] and [4,6]) must be merged. The bug uses strict < instead of <=, so endpoints that touch are not merged. This passes many overlap tests but fails any test with touching endpoints.',
      edgeCases: ['Adjacent intervals [a,b] and [b,c] must merge to [a,c]', 'Fully contained intervals: [1,10] absorbs [2,5]', 'Single-point interval [x,x]: only merges with [x,y] (shares point)', 'Empty input → empty output', 'Already sorted input'],
      answer: {
        fixedCode: `def merge_intervals(intervals):
    if not intervals:
        return []
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_intervals[0][:]]
    for start, end in sorted_intervals[1:]:
        last = merged[-1]
        if start <= last[1]:  # Fix: <= so adjacent endpoints are merged
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])
    return merged`,
        explanation: 'Changed the overlap check from "start < last[1]" to "start <= last[1]". The strict less-than skips the case where the next interval begins exactly at the current end (e.g. [1,4] and [4,6] share the point 4 and must merge to [1,6]). Using <= correctly treats touching endpoints as overlapping.',
      },
    },
    {
      id: 'part-2', number: 2, title: 'Count Gaps',
      readme: README_P2,
      starterFiles: {
        'lib/intervals.py': P2_LIB,
        'solution.py': SOLUTION_P2,
        'tests.py': TESTS_PY_P2,
      },
      visibleTests: VIS_P2,
      hiddenTests: HID_P2,
      testRunner: { functionName: 'count_gaps', inputKeys: ['intervals', 'range_start', 'range_end'] },
      trap: 'Intervals use half-open semantics [start, end) so the length is end-start, not end-start+1. The bug computes (range_end - range_start + 1) - covered, which is off by one. Many candidates forget whether the interval convention is open or closed and add +1 "to be safe."',
      edgeCases: ['Half-open intervals: length = end - start', 'Intervals partially outside the query range are clipped', 'No intervals → entire range is a gap', 'Full coverage → gap is 0', 'Overlapping intervals must be merged before counting'],
      answer: {
        fixedCode: `def merge_intervals(intervals):
    if not intervals:
        return []
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_intervals[0][:]]
    for start, end in sorted_intervals[1:]:
        last = merged[-1]
        if start <= last[1]:
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])
    return merged


def count_gaps(intervals, range_start, range_end):
    if not intervals:
        return range_end - range_start
    merged = merge_intervals(intervals)
    clipped = []
    for s, e in merged:
        cs = max(s, range_start)
        ce = min(e, range_end)
        if cs < ce:
            clipped.append([cs, ce])
    if not clipped:
        return range_end - range_start
    total_covered = sum(e - s for s, e in clipped)
    return (range_end - range_start) - total_covered  # Fix: remove the +1`,
        explanation: 'Removed the erroneous +1 from the final subtraction. Intervals use half-open semantics where length = end - start, so the total range length is range_end - range_start (not +1). The +1 caused the reported gap to always be one unit larger than the actual uncovered length.',
      },
    },
    {
      id: 'part-3', number: 3, title: 'Task Scheduler',
      readme: README_P3,
      starterFiles: {
        'lib/intervals.py': P3_LIB,
        'solution.py': SOLUTION_P3,
        'tests.py': TESTS_PY_P3,
      },
      visibleTests: VIS_P3,
      hiddenTests: HID_P3,
      testRunner: { functionName: 'schedule_tasks', inputKeys: ['tasks'] },
      trap: 'The greedy algorithm must sort by END time, not start time. Sorting by start time looks intuitive but is provably suboptimal: selecting a long task early blocks many short later tasks. This is one of the most common interval scheduling mistakes in interviews.',
      edgeCases: ['Adjacent tasks (start==prev_end) are compatible (>=, not >)', 'All tasks overlapping → only one selected (earliest end)', 'Tie on end time: pick the one with earlier start (or either, both valid)', 'Empty input → []', 'Single task → returned as-is'],
      answer: {
        fixedCode: `def merge_intervals(intervals):
    if not intervals:
        return []
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_intervals[0][:]]
    for start, end in sorted_intervals[1:]:
        last = merged[-1]
        if start <= last[1]:
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])
    return merged


def count_gaps(intervals, range_start, range_end):
    if not intervals:
        return range_end - range_start
    merged = merge_intervals(intervals)
    clipped = []
    for s, e in merged:
        cs = max(s, range_start)
        ce = min(e, range_end)
        if cs < ce:
            clipped.append([cs, ce])
    if not clipped:
        return range_end - range_start
    total_covered = sum(e - s for s, e in clipped)
    return (range_end - range_start) - total_covered


def schedule_tasks(tasks):
    if not tasks:
        return []
    sorted_tasks = sorted(tasks, key=lambda x: x[1])  # Fix: sort by end time
    selected = [sorted_tasks[0]]
    last_end = sorted_tasks[0][1]
    for start, end in sorted_tasks[1:]:
        if start >= last_end:
            selected.append([start, end])
            last_end = end
    return selected`,
        explanation: 'Changed the sort key from x[0] (start time) to x[1] (end time). The earliest-deadline-first greedy strategy maximises the number of non-overlapping tasks by always choosing the task that finishes soonest, leaving the most remaining time for future tasks. Sorting by start time is not optimal and can select a long early task that blocks many shorter later ones.',
      },
    },
  ],
  testRunner: {
    language: 'python',
    entryFile: 'solution.py',
    functionName: 'merge_intervals',
    inputKeys: ['intervals'],
  },
};

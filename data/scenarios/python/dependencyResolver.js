// ── Dependency Resolver ───────────────────────────────────────────────────────
// Inspired by: npm / pip package installation interviews
// Three parts: topological sort (Kahn's) → cycle detection → implicit deps

// ── Buggy lib files ───────────────────────────────────────────────────────────

// Part 1: Kahn's topological sort. Bug: increments in_degree for the dep
//         instead of the package that depends on it, inverting the order
const P1_LIB = `
from collections import deque


def resolve_order(packages):
    """
    Return installation order for packages (dependencies before dependents).

    packages: dict mapping package name -> list of its direct dependencies
              e.g. {'A': ['B', 'C'], 'B': ['C'], 'C': []}
              means A depends on B and C, B depends on C.
              Install order must have C before B, B before A.

    Returns list of package names in valid installation order.
    Ties are broken alphabetically.
    """
    # Build reverse graph and in-degree table.
    # in_degree[pkg] = number of packages pkg depends on (= how many must install first).
    # reverse[dep]   = packages that depend on dep (install after dep).
    all_pkgs = set(packages.keys())
    for deps in packages.values():
        all_pkgs.update(deps)

    in_degree = {pkg: 0 for pkg in all_pkgs}
    reverse   = {pkg: [] for pkg in all_pkgs}

    for pkg, deps in packages.items():
        for dep in deps:
            in_degree[dep] += 1
            reverse[dep].append(pkg)

    # Kahn's: start with nodes that have no unresolved dependencies
    queue = deque(sorted(p for p in all_pkgs if in_degree[p] == 0))
    result = []
    while queue:
        node = queue.popleft()
        result.append(node)
        for dependent in sorted(reverse[node]):
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)
    return result
`.trim();

// Part 2: DFS cycle detection. Bug: missing path.discard(node) on backtrack,
//         causing false cycles when two nodes share a common transitive dep
const P2_LIB = `
from collections import deque


def _has_cycle(graph, node, visited, path):
    path.add(node)
    for neighbor in graph.get(node, []):
        if neighbor in path:
            return True   # back-edge found: real cycle
        if neighbor not in visited:
            if _has_cycle(graph, neighbor, visited, path):
                return True
    visited.add(node)
    return False


def resolve_order(packages):
    """
    Return ['CYCLE'] if a circular dependency exists.
    Otherwise return valid installation order (deps before dependents).
    Ties broken alphabetically.
    """
    visited = set()
    path    = set()
    for pkg in sorted(packages.keys()):
        if pkg not in visited:
            if _has_cycle(packages, pkg, visited, path):
                return ['CYCLE']

    in_degree = {pkg: 0 for pkg in packages}
    reverse   = {pkg: [] for pkg in packages}
    for pkg, deps in packages.items():
        for dep in deps:
            in_degree[pkg] += 1
            reverse[dep].append(pkg)

    queue  = deque(sorted(p for p in packages if in_degree[p] == 0))
    result = []
    while queue:
        node = queue.popleft()
        result.append(node)
        for dependent in sorted(reverse[node]):
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)
    return result
`.trim();

// Part 3: Kahn's fails when a dep is not listed as a top-level key in packages
//         (implicit leaf dep): KeyError on reverse[dep]
const P3_LIB = `
from collections import deque


def _has_cycle(graph, node, visited, path):
    path.add(node)
    for neighbor in graph.get(node, []):
        if neighbor in path:
            return True
        if neighbor not in visited:
            if _has_cycle(graph, neighbor, visited, path):
                return True
    visited.add(node)
    path.discard(node)
    return False


def resolve_order(packages):
    """
    Return ['CYCLE'] if circular dependency exists.
    Otherwise return installation order, including implicit deps
    (packages that appear as dependencies but have no entry in packages dict).
    """
    in_degree = {pkg: 0 for pkg in packages}
    reverse   = {pkg: [] for pkg in packages}

    visited = set()
    path    = set()
    for pkg in sorted(packages.keys()):
        if pkg not in visited:
            if _has_cycle(packages, pkg, visited, path):
                return ['CYCLE']

    for pkg, deps in packages.items():
        for dep in deps:
            in_degree[pkg] += 1
            reverse[dep].append(pkg)

    queue  = deque(sorted(p for p in in_degree if in_degree[p] == 0))
    result = []
    while queue:
        node = queue.popleft()
        result.append(node)
        for dependent in sorted(reverse.get(node, [])):
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)
    return result
`.trim();

// ── Solution stubs ────────────────────────────────────────────────────────────

const SOLUTION_P1 = `from lib.resolver import resolve_order`;
const SOLUTION_P2 = `from lib.resolver import resolve_order`;
const SOLUTION_P3 = `from lib.resolver import resolve_order`;

// ── tests.py (shared: resolve_order is the entry point across all parts) ─────

const TESTS_PY = `
from solution import resolve_order

# Use this file to experiment with resolve_order.
# resolve_order(packages) returns installation order (deps before dependents).
# Part 2+: returns ['CYCLE'] when a circular dependency is detected.
# Part 3+: handles packages listed as deps but absent as top-level keys.
# Output appears in the "tests.py output" panel when you click Run Tests.

# Example 1: linear chain A → B → C
result = resolve_order({'A': ['B'], 'B': ['C'], 'C': []})
print("Linear chain A→B→C:")
print(" ", result)
# -> ['C', 'B', 'A']

# Example 2: diamond: both B and C depend on A
result = resolve_order({'D': ['B', 'C'], 'B': ['A'], 'C': ['A'], 'A': []})
print("Diamond D→B→A, D→C→A:")
print(" ", result)
# -> ['A', 'B', 'C', 'D']

# Example 3: cycle (Part 2+)
result = resolve_order({'A': ['B'], 'B': ['A']})
print("Cycle A↔B:")
print(" ", result)
# -> ['CYCLE']

# Example 4: implicit dep not listed as a key (Part 3+)
result = resolve_order({'my_app': ['numpy', 'requests']})
print("Implicit deps numpy and requests:")
print(" ", result)
# -> ['numpy', 'requests', 'my_app']

# Try your own:
# print(resolve_order({'pkg': ['dep1', 'dep2'], 'dep1': [], 'dep2': []}))
`.trim();

// ── READMEs ───────────────────────────────────────────────────────────────────

const README_P1 = `# Dependency Resolver, Part 1: Topological Sort

## Background

\`lib/resolver.py\` implements a package dependency resolver. \`resolve_order(packages)\` takes a dict mapping package names to their list of direct dependencies and returns a valid installation order where every dependency appears before the package that requires it. All dependencies are guaranteed to be keys in the dict. When multiple packages are ready to install simultaneously, they are processed alphabetically.

## Bug Report

The resolver returns packages in reverse dependency order: packages with the most dependencies are installed first and leaves last. \`resolve_order({'A': ['B','C'], 'B': ['C'], 'C': []})\` returns \`['A', 'B', 'C']\` instead of \`['C', 'B', 'A']\`.

## What to Implement

- **\`resolve_order(packages)\`** in \`lib/resolver.py\`: return package names in a valid installation order where each package appears only after all its dependencies.
`;

const README_P2 = `# Dependency Resolver, Part 2: Cycle Detection

## Background

\`lib/resolver.py\` implements a package dependency resolver. Bugs from Part 1 are fixed. \`resolve_order(packages)\` now also detects circular dependencies and returns \`['CYCLE']\` if one exists. A self-loop (a package that depends on itself) counts as a cycle.

## Bug Report

The cycle detector produces false positives. A graph where two packages share a common dependency but have no actual cycle is incorrectly reported as a cycle. \`resolve_order({'A': ['C'], 'B': ['C'], 'C': []})\` returns \`['CYCLE']\` instead of a valid install order.

## What to Implement

- **\`resolve_order(packages)\`** in \`lib/resolver.py\`: return \`['CYCLE']\` if any circular dependency exists, otherwise return the valid installation order.

## Notes

All nodes must be checked, not just those reachable from the first package processed.
`;

const README_P3 = `# Dependency Resolver, Part 3: Implicit Dependencies

## Background

\`lib/resolver.py\` implements a package dependency resolver. Bugs from Parts 1 and 2 are fixed. Not all packages in dependency lists are guaranteed to be top-level keys in the dict. A package referenced as a dependency but absent from the dict is an implicit dependency: treat it as a leaf with no further dependencies.

## Bug Report

When a dependency is not a key in \`packages\`, the resolver produces incorrect output or crashes. \`resolve_order({'my_app': ['numpy']})\` fails even though \`numpy\` should be treated as a leaf and appear before \`my_app\` in the result.

## What to Implement

- **\`resolve_order(packages)\`** in \`lib/resolver.py\`: handle implicit dependencies by treating any package referenced in a dep list but absent from the dict as a leaf with no further dependencies.

## Notes

Cycle detection and alphabetical tie-breaking apply to implicit packages the same as explicit ones.`;


// ── Tests ─────────────────────────────────────────────────────────────────────

const VIS_P1 = [
  { id: 'v1', description: 'linear chain A→B→C: install C,B,A',
    input: { packages: { A: ['B'], B: ['C'], C: [] } }, expectedOutput: ['C','B','A'] },
  { id: 'v2', description: 'A depends on B and C (both leaves): install B,C,A',
    input: { packages: { A: ['B','C'], B: [], C: [] } }, expectedOutput: ['B','C','A'] },
  { id: 'v3', description: 'single package with no deps',
    input: { packages: { X: [] } }, expectedOutput: ['X'] },
  { id: 'v4', description: 'diamond: D depends on B and C, both depend on A',
    input: { packages: { D: ['B','C'], B: ['A'], C: ['A'], A: [] } }, expectedOutput: ['A','B','C','D'] },
  { id: 'v5', description: 'two independent packages then one depending on both',
    input: { packages: { A: [], B: [], C: ['A','B'] } }, expectedOutput: ['A','B','C'] },
];

const HID_P1 = [
  { id: 'h1', description: 'fully independent packages: alphabetical output',
    input: { packages: { C: [], A: [], B: [] } }, expectedOutput: ['A','B','C'] },
  { id: 'h2', description: 'long chain A→B→C→D→E',
    input: { packages: { A: ['B'], B: ['C'], C: ['D'], D: ['E'], E: [] } }, expectedOutput: ['E','D','C','B','A'] },
  { id: 'h3', description: 'wide fan-in: E depends on A,B,C,D',
    input: { packages: { E: ['A','B','C','D'], A: [], B: [], C: [], D: [] } }, expectedOutput: ['A','B','C','D','E'] },
  { id: 'h4', description: 'two parallel chains then a joiner',
    input: { packages: { A: [], B: ['A'], C: [], D: ['C'], E: ['B','D'] } }, expectedOutput: ['A','C','B','D','E'] },
  { id: 'h5', description: 'two independent chains: alphabetical tie-breaking at every level; reversing the result gives the wrong order',
    input: { packages: { C: ['A'], D: ['B'], A: [], B: [] } }, expectedOutput: ['A','B','C','D'] },
];

const VIS_P2 = [
  { id: 'v1', description: 'two-node cycle A↔B → CYCLE',
    input: { packages: { A: ['B'], B: ['A'] } }, expectedOutput: ['CYCLE'] },
  { id: 'v2', description: 'three-node cycle A→B→C→A → CYCLE',
    input: { packages: { A: ['B'], B: ['C'], C: ['A'] } }, expectedOutput: ['CYCLE'] },
  { id: 'v3', description: 'self-loop → CYCLE',
    input: { packages: { A: ['A'] } }, expectedOutput: ['CYCLE'] },
  { id: 'v4', description: 'no cycle: A→B, C→B (shared dep, no cycle)',
    input: { packages: { A: ['B'], C: ['B'], B: [] } }, expectedOutput: ['B','A','C'] },
  { id: 'v5', description: 'linear chain: no cycle',
    input: { packages: { X: ['Y'], Y: ['Z'], Z: [] } }, expectedOutput: ['Z','Y','X'] },
];

const HID_P2 = [
  { id: 'h1', description: 'diamond with shared dep: no cycle (the classic false-positive trap)',
    input: { packages: { D: ['B','C'], B: ['A'], C: ['A'], A: [] } }, expectedOutput: ['A','B','C','D'] },
  { id: 'h2', description: 'cycle in one component, clean in another',
    input: { packages: { A: [], B: ['C'], C: ['B'] } }, expectedOutput: ['CYCLE'] },
  { id: 'h3', description: 'four-node cycle',
    input: { packages: { A: ['B'], B: ['C'], C: ['D'], D: ['A'] } }, expectedOutput: ['CYCLE'] },
  { id: 'h4', description: 'two fully independent packages (no edges)',
    input: { packages: { P: [], Q: [] } }, expectedOutput: ['P','Q'] },
];

const VIS_P3 = [
  { id: 'v1', description: 'dep not in packages dict (implicit leaf): {B: [A]} → [A,B]',
    input: { packages: { B: ['A'] } }, expectedOutput: ['A','B'] },
  { id: 'v2', description: 'two implicit deps: {C: [A,B]} → [A,B,C]',
    input: { packages: { C: ['A','B'] } }, expectedOutput: ['A','B','C'] },
  { id: 'v3', description: 'mix of explicit and implicit: {A:[], C:[A,B]} → B or A first then C',
    input: { packages: { A: [], C: ['A','B'] } }, expectedOutput: ['A','B','C'] },
  { id: 'v4', description: 'chain where first link is implicit: {C:[B], B:[A]} → [A,B,C]',
    input: { packages: { C: ['B'], B: ['A'] } }, expectedOutput: ['A','B','C'] },
];

const HID_P3 = [
  { id: 'h1', description: 'all packages are implicit deps of one entry',
    input: { packages: { app: ['a','b','c'] } }, expectedOutput: ['a','b','c','app'] },
  { id: 'h2', description: 'implicit dep shared by two explicit packages',
    input: { packages: { B: ['A'], C: ['A'] } }, expectedOutput: ['A','B','C'] },
  { id: 'h3', description: 'long chain with implicit root',
    input: { packages: { D: ['C'], C: ['B'], B: ['A'] } }, expectedOutput: ['A','B','C','D'] },
  { id: 'h4', description: 'no cycle even with implicit dep',
    input: { packages: { B: ['A'], C: ['B'] } }, expectedOutput: ['A','B','C'] },
  { id: 'h5', description: 'two implicit deps must both appear in result before the package that needs them',
    input: { packages: { my_app: ['numpy', 'requests'] } }, expectedOutput: ['numpy','requests','my_app'] },
];

// ── Exported scenario ─────────────────────────────────────────────────────────

export const dependencyResolver = {
  id: 'dependency-resolver',
  title: 'Dependency Resolver',
  difficulty: 'Hard',
  durationMinutes: 35,
  tags: ['graph', 'topological sort', 'algorithms'],
  description:
    'Build a package dependency resolver like npm or pip. Given a dependency graph, output a valid installation order. Three parts: Kahn\'s topological sort → DFS cycle detection → handling implicit (undeclared) leaf dependencies.',
  parts: [
    {
      id: 'part-1', number: 1, title: 'Topological Sort',
      readme: README_P1,
      starterFiles: {
        'lib/resolver.py': P1_LIB,
        'solution.py': SOLUTION_P1,
        'tests.py': TESTS_PY,
      },
      visibleTests: VIS_P1,
      hiddenTests: HID_P1,
      trap: 'In Kahn\'s algorithm, when A depends on B, in_degree[A] should increase (A has a new pre-requisite). The bug increments in_degree[B] instead, inverting which nodes start with in_degree=0. Dependents get enqueued first, producing a backwards install order.',
      edgeCases: ['Diamond deps (A→C, B→C): C installs once', 'Alphabetical tie-breaking determines output among packages of equal readiness', 'Packages with no deps must all appear before their dependents', 'Wide fan-in (E depends on A,B,C,D)'],
      answer: {
        fixedCode: `from collections import deque


def resolve_order(packages):
    all_pkgs = set(packages.keys())
    for deps in packages.values():
        all_pkgs.update(deps)

    in_degree = {pkg: 0 for pkg in all_pkgs}
    reverse   = {pkg: [] for pkg in all_pkgs}

    for pkg, deps in packages.items():
        for dep in deps:
            in_degree[pkg] += 1  # Fix: increment the dependent, not the dep
            reverse[dep].append(pkg)

    queue = deque(sorted(p for p in all_pkgs if in_degree[p] == 0))
    result = []
    while queue:
        node = queue.popleft()
        result.append(node)
        for dependent in sorted(reverse[node]):
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)
    return result`,
        explanation: 'Changed "in_degree[dep] += 1" to "in_degree[pkg] += 1". In Kahn\'s algorithm, in_degree tracks how many unresolved prerequisites each package has. When pkg depends on dep, it is pkg that gains a prerequisite, so in_degree[pkg] must increase. The original code incremented the dependency instead, making dependencies appear to have prerequisites they don\'t have and causing them to be installed last rather than first.',
      },
    },
    {
      id: 'part-2', number: 2, title: 'Cycle Detection',
      readme: README_P2,
      starterFiles: {
        'lib/resolver.py': P2_LIB,
        'solution.py': SOLUTION_P2,
      },
      visibleTests: VIS_P2,
      hiddenTests: HID_P2,
      trap: 'DFS cycle detection requires removing a node from the "in-path" set when backtracking. The bug omits path.discard(node), so nodes from fully explored branches remain in path. The diamond pattern (D→B→A, D→C→A) triggers a false cycle: after exploring D→B→A, node A stays in path; when exploring D→C→A, A appears to be a back-edge.',
      edgeCases: ['Diamond (shared dep with no cycle) must not be reported as CYCLE', 'Self-loop A→A is a cycle', 'Cycle in one disconnected component affects the whole result', 'Three-node cycles'],
      answer: {
        fixedCode: `from collections import deque


def _has_cycle(graph, node, visited, path):
    path.add(node)
    for neighbor in graph.get(node, []):
        if neighbor in path:
            return True
        if neighbor not in visited:
            if _has_cycle(graph, neighbor, visited, path):
                return True
    visited.add(node)
    path.discard(node)  # Fix: remove on backtrack
    return False


def resolve_order(packages):
    visited = set()
    path    = set()
    for pkg in sorted(packages.keys()):
        if pkg not in visited:
            if _has_cycle(packages, pkg, visited, path):
                return ['CYCLE']

    in_degree = {pkg: 0 for pkg in packages}
    reverse   = {pkg: [] for pkg in packages}
    for pkg, deps in packages.items():
        for dep in deps:
            in_degree[pkg] += 1
            reverse[dep].append(pkg)

    queue  = deque(sorted(p for p in packages if in_degree[p] == 0))
    result = []
    while queue:
        node = queue.popleft()
        result.append(node)
        for dependent in sorted(reverse[node]):
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)
    return result`,
        explanation: 'Added "path.discard(node)" before "return False" at the end of _has_cycle(). The path set tracks nodes on the current DFS call stack to detect back-edges (true cycles). Without removing the node on backtrack, it remains in path when other branches are explored, causing a diamond dependency (A←B←D and A←C←D with no cycle) to look like a back-edge and report a false cycle.',
      },
    },
    {
      id: 'part-3', number: 3, title: 'Implicit Dependencies',
      readme: README_P3,
      starterFiles: {
        'lib/resolver.py': P3_LIB,
        'solution.py': SOLUTION_P3,
      },
      visibleTests: VIS_P3,
      hiddenTests: HID_P3,
      trap: 'The bug initialises in_degree and reverse only for explicit top-level keys. When processing deps that are not top-level keys, reverse[dep] raises KeyError. The fix: collect all packages (explicit + all referenced deps) into a set first, then build the tables from that complete set.',
      edgeCases: ['Implicit dep with no further deps (leaf)', 'Multiple packages depending on the same implicit dep', 'Chain where the implicit dep is the root', 'Cycle detection still works with implicit deps present'],
      answer: {
        fixedCode: `from collections import deque


def _has_cycle(graph, node, visited, path):
    path.add(node)
    for neighbor in graph.get(node, []):
        if neighbor in path:
            return True
        if neighbor not in visited:
            if _has_cycle(graph, neighbor, visited, path):
                return True
    visited.add(node)
    path.discard(node)
    return False


def resolve_order(packages):
    # Fix: collect ALL packages including implicit deps before building tables
    all_pkgs = set(packages.keys())
    for deps in packages.values():
        all_pkgs.update(deps)

    visited = set()
    path    = set()
    for pkg in sorted(packages.keys()):
        if pkg not in visited:
            if _has_cycle(packages, pkg, visited, path):
                return ['CYCLE']

    in_degree = {pkg: 0 for pkg in all_pkgs}  # Fix: use all_pkgs
    reverse   = {pkg: [] for pkg in all_pkgs}  # Fix: use all_pkgs

    for pkg, deps in packages.items():
        for dep in deps:
            in_degree[pkg] += 1
            reverse[dep].append(pkg)

    queue  = deque(sorted(p for p in in_degree if in_degree[p] == 0))
    result = []
    while queue:
        node = queue.popleft()
        result.append(node)
        for dependent in sorted(reverse.get(node, [])):
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)
    return result`,
        explanation: 'Built the all_pkgs set by unioning the explicit keys with all values referenced as dependencies, then initialised both in_degree and reverse from that complete set. The original code only initialised the tables for top-level keys, so when a dep was not itself a top-level package, "reverse[dep].append(pkg)" raised a KeyError. With all_pkgs covering every package mentioned anywhere in the graph, implicit leaf dependencies are handled without errors.',
      },
    },
  ],
  testRunner: {
    language: 'python',
    entryFile: 'solution.py',
    functionName: 'resolve_order',
    inputKeys: ['packages'],
  },
};

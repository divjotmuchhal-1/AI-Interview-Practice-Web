/**
 * In-browser test runner supporting JavaScript (CommonJS shim) and Python (Pyodide).
 */

// ── JavaScript: module resolution ─────────────────────────────────────────────

function resolvePath(fromFile, importPath) {
  const dir = fromFile.includes('/')
    ? fromFile.substring(0, fromFile.lastIndexOf('/'))
    : '';
  let rel = importPath.replace(/^\.\//, '');
  if (rel.startsWith('../')) {
    const parentDir = dir.includes('/')
      ? dir.substring(0, dir.lastIndexOf('/'))
      : '';
    rel = rel.replace(/^\.\.\//, '');
    return addExt(parentDir ? `${parentDir}/${rel}` : rel);
  }
  return addExt(dir ? `${dir}/${rel}` : rel);
}

function addExt(path) {
  return path.endsWith('.js') ? path : `${path}.js`;
}

function buildModuleSystem(files) {
  const registry = {};
  function executeModule(filename) {
    if (filename in registry) return;
    const code = files[filename];
    if (code === undefined) {
      throw new Error(
        `Cannot find module '${filename}'.\nAvailable files: ${Object.keys(files).join(', ')}`
      );
    }
    const mod = { exports: {} };
    registry[filename] = mod;
    const require = (importPath) => {
      const resolved = resolvePath(filename, importPath);
      executeModule(resolved);
      return registry[resolved].exports;
    };
    // eslint-disable-next-line no-new-func
    const fn = new Function('require', 'module', 'exports', code);
    fn(require, mod, mod.exports);
  }
  return { executeModule, registry };
}

// ── Deep equality ─────────────────────────────────────────────────────────────

function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (typeof a === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (!deepEqual(ka, kb)) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

// ── Single JS test execution ──────────────────────────────────────────────────

function runOne(targetFn, test, inputKeys) {
  if (test.expectedOutput === '__DETERMINISTIC__') {
    try {
      const args = inputKeys.map((k) => test.input[k]);
      const r1 = targetFn(...args);
      const r2 = targetFn(...args);
      const passed = r1 !== undefined && r1 === r2;
      return { ...test, actual: r1, passed, error: null, isDeterminism: true };
    } catch (e) {
      return { ...test, actual: null, passed: false, error: e.message, isDeterminism: true };
    }
  }
  try {
    const args = inputKeys.map((k) => test.input[k]);
    const actual = targetFn(...args);
    const passed = deepEqual(actual, test.expectedOutput);
    return { ...test, actual, passed, error: null };
  } catch (e) {
    return { ...test, actual: null, passed: false, error: e.message };
  }
}

// ── JavaScript runner ─────────────────────────────────────────────────────────

function runTestsJS(files, scenario, partIndex) {
  const part = scenario.parts[partIndex];
  const { entryFile, functionName, inputKeys } = { ...scenario.testRunner, ...(part.testRunner ?? {}) };

  let targetFn;
  try {
    const { executeModule, registry } = buildModuleSystem(files);
    executeModule(entryFile);
    const exported = registry[entryFile]?.exports ?? {};
    targetFn = exported[functionName];
    if (typeof targetFn !== 'function') {
      return {
        moduleError:
          `'${functionName}' is not a function in ${entryFile}.\n` +
          `Make sure you have: module.exports = { ${functionName} }`,
        visible: [],
        hidden: [],
      };
    }
  } catch (err) {
    return { moduleError: err.message || String(err), visible: [], hidden: [] };
  }

  return {
    moduleError: null,
    visible: part.visibleTests.map((t) => runOne(targetFn, t, inputKeys)),
    hidden:  part.hiddenTests.map((t)  => runOne(targetFn, t, inputKeys)),
  };
}

// ── Python runner (Pyodide) ───────────────────────────────────────────────────

let _pyodidePromise = null;

async function getPyodide() {
  if (!_pyodidePromise) {
    _pyodidePromise = (async () => {
      if (!window.loadPyodide) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js';
          s.onload = resolve;
          s.onerror = () => reject(new Error('Failed to load Pyodide script'));
          document.head.appendChild(s);
        });
      }
      return window.loadPyodide();
    })();
  }
  return _pyodidePromise;
}

async function runTestsPython(files, scenario, partIndex) {
  const part = scenario.parts[partIndex];
  const { functionName, inputKeys } = { ...scenario.testRunner, ...(part.testRunner ?? {}) };

  let pyodide;
  try {
    pyodide = await getPyodide();
  } catch (err) {
    return {
      moduleError: `Failed to load Python runtime: ${err.message}`,
      visible: [],
      hidden: [],
    };
  }

  // Write all files to Pyodide's virtual FS
  try {
    const dirs = new Set();
    for (const filename of Object.keys(files)) {
      const segs = filename.split('/');
      if (segs.length > 1) dirs.add(segs.slice(0, -1).join('/'));
    }
    for (const dir of dirs) {
      try { pyodide.FS.mkdir('/home/pyodide/' + dir); } catch (_) {}
      try { pyodide.FS.writeFile('/home/pyodide/' + dir + '/__init__.py', ''); } catch (_) {}
    }
    for (const [filename, content] of Object.entries(files)) {
      pyodide.FS.writeFile('/home/pyodide/' + filename, content);
    }
  } catch (err) {
    return { moduleError: `Failed to write files: ${err.message}`, visible: [], hidden: [] };
  }

  // Import solution module and resolve the target function once
  try {
    pyodide.globals.set('_fn_name', functionName);
    pyodide.runPython(`
import sys, json, importlib

_clear = [k for k in list(sys.modules) if k in ('solution', 'lib') or k.startswith('lib.')]
for k in _clear:
    del sys.modules[k]

if '/home/pyodide' not in sys.path:
    sys.path.insert(0, '/home/pyodide')

_solution = importlib.import_module('solution')
_fn = getattr(_solution, _fn_name)
if not callable(_fn):
    raise TypeError(f"'{_fn_name}' is not callable in solution.py")
`);
  } catch (err) {
    return { moduleError: err.message || String(err), visible: [], hidden: [] };
  }

  function runOnePython(test) {
    const args = inputKeys.map((k) => test.input[k]);
    try {
      pyodide.globals.set('_args_json', JSON.stringify(args));
      const resultStr = pyodide.runPython('json.dumps(_fn(*json.loads(_args_json)))');
      const actual = JSON.parse(resultStr);
      const passed = deepEqual(actual, test.expectedOutput);
      return { ...test, actual, passed, error: null };
    } catch (err) {
      return { ...test, actual: null, passed: false, error: err.message };
    }
  }

  // Run tests.py and capture its stdout so users can see print() output
  let consoleOutput = null;
  if (files['tests.py']) {
    try {
      pyodide.runPython(`
import sys
from io import StringIO as _StringIO

_clear2 = [k for k in list(sys.modules) if k in ('solution', 'lib') or k.startswith('lib.')]
for k in _clear2:
    del sys.modules[k]

_buf = _StringIO()
_prev_stdout = sys.stdout
_prev_stderr = sys.stderr
sys.stdout = _buf
sys.stderr = _buf
try:
    import runpy as _runpy
    _runpy.run_path('/home/pyodide/tests.py', run_name='__main__')
except SystemExit:
    pass
except Exception as _e:
    print(f"\\nError in tests.py: {_e}")
finally:
    sys.stdout = _prev_stdout
    sys.stderr = _prev_stderr
_tests_output = _buf.getvalue()
`);
      consoleOutput = pyodide.globals.get('_tests_output') ?? '';
    } catch (err) {
      consoleOutput = `Error running tests.py: ${err.message}`;
    }
  }

  return {
    moduleError: null,
    visible: part.visibleTests.map(runOnePython),
    hidden:  part.hiddenTests.map(runOnePython),
    consoleOutput,
  };
}

// ── SQL runner (sql.js / SQLite WASM) ────────────────────────────────────────

let _sqlPromise = null;

async function getSQL() {
  if (!_sqlPromise) {
    _sqlPromise = (async () => {
      if (!window.initSqlJs) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js';
          s.onload = resolve;
          s.onerror = () => reject(new Error('Failed to load sql.js'));
          document.head.appendChild(s);
        });
      }
      return window.initSqlJs({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`,
      });
    })();
  }
  return _sqlPromise;
}

async function runTestsSQL(files, scenario, partIndex) {
  const part   = scenario.parts[partIndex];
  const schema = scenario.testRunner.schema ?? '';
  const userQuery = (files['query.sql'] ?? '').trim();

  const hasSQL = userQuery.split('\n').some(line => line.trim() && !line.trim().startsWith('--'));
  if (!hasSQL) {
    return { moduleError: 'Write your SQL query in query.sql to run tests.', visible: [], hidden: [] };
  }

  let SQL;
  try {
    SQL = await getSQL();
  } catch (err) {
    return { moduleError: `Failed to load SQL runtime: ${err.message}`, visible: [], hidden: [] };
  }

  function runOneSQL(test) {
    let db;
    try {
      db = new SQL.Database();
      if (schema) db.run(schema);
      if (test.seedSQL) db.run(test.seedSQL);
      const results = db.exec(userQuery);
      const actual =
        results.length === 0
          ? []
          : results[0].values.map((row) =>
              Object.fromEntries(results[0].columns.map((col, i) => [col, row[i]]))
            );
      const passed = deepEqual(actual, test.expectedOutput);
      return { ...test, actual, passed, error: null };
    } catch (e) {
      return { ...test, actual: null, passed: false, error: e.message };
    } finally {
      try { db?.close(); } catch (_) {}
    }
  }

  return {
    moduleError: null,
    visible: part.visibleTests.map(runOneSQL),
    hidden:  part.hiddenTests.map(runOneSQL),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {Record<string, string>} files
 * @param {object} scenario
 * @param {number} partIndex
 * @returns {Promise<{ moduleError: string|null, visible: TestResult[], hidden: TestResult[] }>}
 */
export async function runTests(files, scenario, partIndex) {
  const lang = scenario.testRunner.language ?? 'javascript';
  if (lang === 'python') return runTestsPython(files, scenario, partIndex);
  if (lang === 'sql')    return runTestsSQL(files, scenario, partIndex);
  return runTestsJS(files, scenario, partIndex);
}

// Pre-warm the runtime in the background so the first "Run Tests" click is instant.
export function warmupRunner(scenario) {
  const lang = scenario.testRunner.language ?? 'javascript';
  if (lang === 'python') getPyodide().catch(() => {});
  if (lang === 'sql')    getSQL().catch(() => {});
}

// ── Display helpers (used by TestPanel) ───────────────────────────────────────

export function formatCall(functionName, inputKeys, input) {
  try {
    const argStrs = inputKeys.map((k) => {
      const s = JSON.stringify(input[k]);
      return s.length > 60 ? s.slice(0, 57) + '…' : s;
    });
    const call = `${functionName}(${argStrs.join(', ')})`;
    return call.length > 140 ? call.slice(0, 137) + '…' : call;
  } catch {
    return `${functionName}(…)`;
  }
}

export function formatValue(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  try {
    const s = JSON.stringify(val, null, 0);
    return s.length > 120 ? s.slice(0, 117) + '…' : s;
  } catch {
    return String(val);
  }
}

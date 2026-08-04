# Scenario Definitions

One file per scenario, organized by track:

| Folder        | Track                        | Runner                          |
|---------------|------------------------------|---------------------------------|
| `python/`     | Python · Debug & Fix         | Pyodide (in-browser Python)     |
| `javascript/` | JavaScript · Build           | In-browser CommonJS shim        |
| `typescript/` | TypeScript · Debug & Fix     | In-browser CommonJS shim        |
| `sql/`        | SQL · Debug & Write          | sql.js (in-browser SQLite)      |
| `react/`      | React · Debug                | In-browser CommonJS shim        |
| `code-review/`| Code Review · Bar Raiser     | No tests; AI grades findings    |
| `systems/`    | Systems · Multi-File Debug   | In-browser CommonJS shim        |

Every scenario is registered in `data/scenarios.js`, which defines track membership
and ordering. Adding a scenario = create the file here + import it there.

## Scenario schema

```js
export const myScenario = {
  id:              'unique-kebab-id',
  title:           'Display Title',
  difficulty:      'Easy' | 'Medium' | 'Hard',
  durationMinutes: 30,             // timer length for timed sessions
  tags:            ['react', ...], // shown on the scenario card
  company:         'META',         // optional; shown as a badge
  description:     'One sentence for the scenario card. No spoilers.',
  type:            'code-review' | 'systems-debug', // optional; default = test-runner scenario

  testRunner: {
    language:     'javascript' | 'python' | 'sql',  // default 'javascript'
    entryFile:    'solution.js',   // file whose exports the runner calls
    functionName: 'myFunction',    // export under test
    inputKeys:    ['arg1', 'arg2'],// maps test.input fields to positional args
    schema:       'CREATE TABLE…', // SQL only: schema applied before each test
  },

  parts: [
    {
      id: 'part-1', number: 1, title: 'Short Part Title',
      readme:       README_P1,     // markdown shown in the sidebar (template below)
      starterFiles: { 'solution.js': '…' },  // what the user edits
      visibleTests: [ { description, input, expectedOutput } ],
      hiddenTests:  [ … ],         // same shape; description shown, details hidden
      answer:       ANSWER_P1,     // markdown answer key (copyable code block first)
      answerFiles:  { …files },    // multi-file scenarios: complete corrected codebase
      testRunner:   { … },         // optional per-part overrides
    },
  ],
};
```

Notes on specific fields:

- **`starterFiles`** — `solution.py` / `solution.js` are hidden from the editor when
  other files exist (see `HIDDEN_FILES` in `screens/Workspace.jsx`); if it is the only
  file it is shown. `// BUG:` / `# Bug:` comments are stripped before display by
  `utils/stripBugComments.js`, so author-facing bug notes never reach users. Do not
  put spoilers in comments the stripper does not match.
- **`answer`** — the first fenced code block is what the "Copy code" button copies.
  For single-file scenarios it should contain the complete corrected file.
- **`answerFiles`** — spread the starter and override only the fixed file(s):
  `{ ...STARTER, 'buggy.js': FIXED }`. The UI marks changed files automatically by
  diffing against `starterFiles`.
- **`expectedOutput: '__DETERMINISTIC__'`** — asserts the function returns the same
  defined value on repeated calls instead of comparing to a fixed value.
- **Test data** — if a string value appears in both `input` and `expectedOutput`,
  the two must stay byte-identical or the test can never pass.

## README template (user-facing scenario text)

Structure, in order, with no extra headers and no intro sentence:

```markdown
# Scenario Name, Part N: Subtitle

## Background
2-4 sentences. What the code does, the exact function signature(s), and the
input/state shapes the user works with.

## Bug Report            (build-style parts use "## Requirements" instead)
One short paragraph: exact observable symptoms. Never the cause.

## What to Implement
- **`functionName(args)`** in `file.js`: one line of required behavior.

## Notes                 (only if a non-obvious hard constraint exists)
```

Hard rules:

1. Never hint at the cause, the fix, or (in multi-file scenarios) which file holds
   the bug. The symptom carries the information; tracing is the challenge.
2. No em-dashes anywhere in the platform. Use colons, commas, or periods.
3. State every contract the tests assert: field names, ordering, rounding, edge
   cases. If a hidden test requires behavior a reasonable reader could not infer,
   the README must state that behavior (the behavior, not the bug).
4. No motivational framing ("common in interviews"), no restating visible code.
5. Titles use `, Part N:` (comma before Part, colon after the number).

## Verifying changes

After editing scenario files, from the repo root:

```bash
# All scenario modules parse and import
node --input-type=module -e "
import { readdirSync } from 'fs';
for (const dir of readdirSync('./data/scenarios', { withFileTypes: true }))
  if (dir.isDirectory())
    for (const f of readdirSync('./data/scenarios/' + dir.name))
      await import('./data/scenarios/' + dir.name + '/' + f);
console.log('ok');
"

npx next build
```

For JS-runner scenarios, also verify the answer key actually passes the tests: run
the answer's code block (or `answerFiles`) against `visibleTests + hiddenTests`
with the same module system as `utils/testRunner.js`.

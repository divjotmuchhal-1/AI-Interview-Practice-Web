/**
 * Strips spoiler comments from scenario lib-file code before displaying to users.
 *
 * Removes, in both `#` (Python) and `//` (JavaScript) styles:
 *  - Trailing comments like  `# Bug: ...`, `// BUG: ...`, `# should be: ...`, `# missing: ...`, `# Trap: ...`
 *  - Standalone full-line comments like  `# Bug 1: ...`, `// BUG: ...`, `# Trap: ...`, `# Without ...`
 */
export function stripBugComments(code) {
  return code
    .split('\n')
    .map((line) =>
      // Strip trailing spoiler hints from code lines
      line
        .replace(/\s+#\s*Bug[^:]*:.*$/i, '')
        .replace(/\s+#\s*Trap:.*$/i, '')
        .replace(/\s+#\s*should be:.*$/i, '')
        .replace(/\s+#\s*missing:.*$/i, '')
        .replace(/\s+\/\/\s*Bug[^:]*:.*$/i, '')
        .replace(/\s+\/\/\s*Trap:.*$/i, '')
        .replace(/\s+\/\/\s*should be:.*$/i, '')
        .replace(/\s+\/\/\s*missing:.*$/i, '')
        .trimEnd()
    )
    .filter((line) => {
      // Remove standalone spoiler comment lines entirely
      const t = line.trim();
      return !t.match(/^(#|\/\/)\s*(Bug|Buggy:|Trap:|Without\b)/i);
    })
    .join('\n');
}

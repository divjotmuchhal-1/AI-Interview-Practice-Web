'use client';

import { useEffect, useState } from 'react';

const LANG_MAP = { js: 'javascript', jsx: 'javascript', ts: 'typescript', py: 'python', sql: 'sql' };

/**
 * Syntax-highlighted code block that reuses the workspace Monaco instance
 * (window.__monaco, set by EditorPane on mount) so colors always match the
 * editor theme. Renders plain monospace text until Monaco is available.
 */
export default function HighlightedCode({ code, lang }) {
  const [html, setHtml] = useState(null);
  const language = LANG_MAP[lang] ?? lang ?? 'javascript';

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const tryColorize = () => {
      const monaco = window.__monaco;
      if (!monaco) return false;
      monaco.editor
        .colorize(code, language, { tabSize: 2 })
        .then((h) => { if (!cancelled) setHtml(h); })
        .catch(() => {});
      return true;
    };

    if (!tryColorize()) {
      // Monaco loads async from CDN; poll briefly, then give up (plain text fallback).
      const id = setInterval(() => {
        attempts += 1;
        if (tryColorize() || attempts > 20) clearInterval(id);
      }, 400);
      return () => { cancelled = true; clearInterval(id); };
    }
    return () => { cancelled = true; };
  }, [code, language]);

  if (html) {
    // `monaco-editor` class is required: Monaco scopes its .mtk* token colors
    // under it. Layout side effects are neutralized in .hl-code CSS.
    return <pre className="hl-code monaco-editor" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <pre className="hl-code"><code>{code}</code></pre>;
}

// react-markdown `components` override: highlights fenced blocks that carry a
// language (```js, ```sql, …); inline code and untagged blocks render as before.
export const markdownCodeComponents = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? '');
    if (match) {
      return <HighlightedCode code={String(children).replace(/\n$/, '')} lang={match[1]} />;
    }
    return <code className={className} {...props}>{children}</code>;
  },
  pre({ children }) {
    // Unwrap: HighlightedCode renders its own <pre>; plain blocks keep one.
    const child = Array.isArray(children) ? children[0] : children;
    if (child?.props?.className?.includes('language-')) return <>{children}</>;
    return <pre>{children}</pre>;
  },
};

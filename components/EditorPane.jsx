'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { loader } from '@monaco-editor/react';

// Load Monaco from self-hosted static assets instead of the webpack bundle.
// The webpack-bundled Monaco chunk fails to load in Next.js dev + prod due to
// a globalObject mismatch (webpack defaults to `this`, Monaco workers need `self`).
// Self-hosting (public/monaco/vs, synced from node_modules by the postinstall
// script) avoids both webpack and CDN flakiness: a failed CDN script load
// rejects an uncatchable promise inside @monaco-editor/loader with the raw
// error Event, surfacing as an "[object Event]" unhandled rejection.
loader.config({
  paths: { vs: '/monaco/vs' },
});

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// Warm dark theme matching the app palette (espresso surfaces, terracotta accent).
const WARM_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'e2d8cc', background: '100f0d' },
    { token: 'comment', foreground: '756a5c', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'e8774a' },
    { token: 'operator.sql', foreground: 'e8774a' },
    { token: 'predefined', foreground: 'ef8d64' },
    { token: 'string', foreground: 'a9b665' },
    { token: 'string.sql', foreground: 'a9b665' },
    { token: 'number', foreground: 'd8a657' },
    { token: 'type', foreground: 'd8a657' },
    { token: 'type.identifier', foreground: 'd8a657' },
    { token: 'identifier', foreground: 'e2d8cc' },
    { token: 'delimiter', foreground: '9c9083' },
    { token: 'operator', foreground: 'c9a555' },
  ],
  colors: {
    'editor.background': '#100f0d',
    'editor.foreground': '#e2d8cc',
    'editor.lineHighlightBackground': '#ffffff05',
    'editorLineNumber.foreground': '#5a5248',
    'editorLineNumber.activeForeground': '#8a7f72',
    'editor.selectionBackground': '#e8774a33',
    'editor.inactiveSelectionBackground': '#e8774a1a',
    'editorCursor.foreground': '#e8774a',
    'editorWidget.background': '#211f1b',
    'editorWidget.border': '#3a352d',
    'editorSuggestWidget.background': '#211f1b',
    'editorSuggestWidget.selectedBackground': '#2a2620',
    'editorHoverWidget.background': '#211f1b',
    'editor.findMatchBackground': '#d8a65744',
    'editor.findMatchHighlightBackground': '#d8a65722',
    'editorBracketMatch.border': '#e8774a66',
    'editorIndentGuide.background': '#ffffff08',
    'editorIndentGuide.activeBackground': '#ffffff14',
    'scrollbarSlider.background': '#ffffff12',
    'scrollbarSlider.hoverBackground': '#ffffff1f',
    'scrollbarSlider.activeBackground': '#ffffff2a',
    'editorGutter.background': '#100f0d',
  },
};

function editorLanguage(filename) {
  if (filename.endsWith('.py'))   return 'python';
  if (filename.endsWith('.js'))   return 'javascript';
  if (filename.endsWith('.sql'))  return 'sql';
  if (filename.endsWith('.json')) return 'json';
  return 'plaintext';
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="8.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.25" fill="var(--bg-elevated)" />
      <rect x="1.5" y="1.5" width="8.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.25" fill="var(--bg-elevated)" />
    </svg>
  );
}

export default function EditorPane({ fileContents, activeFile, onFileSelect, onFileChange, editorKey }) {
  const filenames   = Object.keys(fileContents);
  const currentFile = fileContents[activeFile] !== undefined ? activeFile : filenames[0];
  const [copied, setCopied] = useState(false);

  // Open-tabs model: only the entry file starts open; other files open as tabs
  // when selected in the explorer. Keeps multi-file scenarios from flooding the
  // tab bar with every file at once.
  const [openTabs, setOpenTabs] = useState([currentFile]);

  useEffect(() => {
    setOpenTabs([currentFile]);
  }, [editorKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOpenTabs((prev) => (prev.includes(currentFile) ? prev : [...prev, currentFile]));
  }, [currentFile]);

  const closeTab = (name, e) => {
    e.stopPropagation();
    if (openTabs.length === 1) return;
    const idx  = openTabs.indexOf(name);
    const next = openTabs.filter((t) => t !== name);
    setOpenTabs(next);
    if (name === currentFile) onFileSelect(next[Math.max(0, idx - 1)]);
  };

  const visibleTabs = openTabs.filter((t) => fileContents[t] !== undefined);

  const handleCopy = () => {
    const text = fileContents[currentFile] ?? '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <div className="editor-pane">
      <div className="pane-header editor-pane-header">
        <div className="editor-tabs">
          {visibleTabs.map((name) => (
            <button
              key={name}
              className={`editor-tab ${currentFile === name ? 'editor-tab--active' : ''}`}
              onClick={() => onFileSelect(name)}
              title={name}
            >
              <span className="editor-tab-name">{name}</span>
              {visibleTabs.length > 1 && (
                <span
                  className="editor-tab-close"
                  role="button"
                  aria-label={`Close ${name}`}
                  onClick={(e) => closeTab(name, e)}
                >
                  ×
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          className={`editor-copy-btn ${copied ? 'editor-copy-btn--copied' : ''}`}
          onClick={handleCopy}
          title="Copy file contents"
        >
          {copied ? (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <polyline points="2,7 5,10 11,3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <CopyIcon />
          )}
        </button>
      </div>

      <div className="editor-area">
        <MonacoEditor
          key={editorKey}
          path={`${editorKey}/${currentFile}`}
          height="100%"
          language={editorLanguage(currentFile)}
          theme="ai-warm-dark"
          beforeMount={(monaco) => { monaco.editor.defineTheme('ai-warm-dark', WARM_THEME); }}
          defaultValue={fileContents[currentFile]}
          onChange={(value) => onFileChange(currentFile, value ?? '')}
          onMount={(_editor, monaco) => { window.__monaco = monaco; }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Menlo', 'Consolas', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            tabSize: 2,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}

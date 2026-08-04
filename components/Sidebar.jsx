'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import HighlightedCode, { markdownCodeComponents } from '@/components/HighlightedCode';

function buildTree(filePaths) {
  const dirs = {};
  const rootFiles = [];
  for (const path of filePaths) {
    const slash = path.indexOf('/');
    if (slash === -1) { rootFiles.push(path); }
    else {
      const dir  = path.slice(0, slash);
      const name = path.slice(slash + 1);
      if (!dirs[dir]) dirs[dir] = [];
      dirs[dir].push({ name, path });
    }
  }
  return { dirs, rootFiles };
}

function FileItem({ path, name, active, indent = 0, onClick }) {
  return (
    <div
      className={`sidebar-file ${active ? 'sidebar-file--active' : ''}`}
      style={{ paddingLeft: `${10 + indent * 14}px` }}
      onClick={onClick}
      title={path}
    >
      <span className="sidebar-file-dot" />
      <span className="sidebar-file-name">{name}</span>
    </div>
  );
}

// ── View Answer panel ─────────────────────────────────────────────────────────

// Pull the copyable code out of an answer: the first fenced code block of a
// markdown answer, or fixedCode for Python-style { fixedCode, explanation } answers.
function extractAnswerCode(answer) {
  if (typeof answer !== 'string') return answer?.fixedCode ?? '';
  const m = answer.match(/```[^\n]*\n([\s\S]*?)```/);
  return m ? m[1] : answer;
}

// Tabbed viewer for a fully corrected multi-file codebase. Files that differ
// from the starter get a dot marker; each file is copyable.
function AnswerFiles({ answerFiles, starterFiles }) {
  const names   = Object.keys(answerFiles);
  const changed = names.filter((n) => (starterFiles?.[n] ?? '') !== answerFiles[n]);
  const [active, setActive] = useState(changed[0] ?? names[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(answerFiles[active]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  };

  return (
    <div className="answer-files">
      <div className="answer-files-tabs">
        {names.map((n) => (
          <button
            key={n}
            className={`answer-file-tab${n === active ? ' answer-file-tab--active' : ''}`}
            onClick={() => setActive(n)}
            title={changed.includes(n) ? `${n} (modified)` : n}
          >
            {changed.includes(n) && <span className="answer-file-dot" aria-label="modified" />}
            {n}
          </button>
        ))}
      </div>
      <div className="answer-files-toolbar">
        <span className="answer-files-name">{active}</span>
        <button className={`answer-copy-btn${copied ? ' answer-copy-btn--copied' : ''}`} onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy file'}
        </button>
      </div>
      <HighlightedCode code={answerFiles[active]} lang={active.split('.').pop()} />
    </div>
  );
}

function ViewAnswer({ answer, answerFiles, starterFiles, onViewAnswer }) {
  const [phase, setPhase] = useState('idle'); // idle | confirm | done
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(extractAnswerCode(answer));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  };

  if (phase === 'idle') {
    return (
      <div className="answer-trigger">
        <button className="answer-trigger-btn" onClick={() => setPhase('confirm')}>
          View answer
        </button>
      </div>
    );
  }

  if (phase === 'confirm') {
    return (
      <div className="answer-confirm">
        <p className="answer-confirm-msg">
          Viewing the answer will lower your independence and diagnosis scores.
        </p>
        <div className="answer-confirm-actions">
          <button
            className="answer-confirm-yes"
            onClick={() => { onViewAnswer?.(); setPhase('done'); }}
          >
            Show answer
          </button>
          <button className="answer-confirm-cancel" onClick={() => setPhase('idle')}>Cancel</button>
        </div>
      </div>
    );
  }

  // done: answer is either a markdown string (JS/SQL/TS/React scenarios)
  // or an object { fixedCode, explanation } (Python scenarios)
  const isMarkdown = typeof answer === 'string';
  return (
    <div className="answer-panel">
      <div className="answer-panel-header">
        <span className="answer-section-label">{isMarkdown ? 'Answer' : 'Fixed code'}</span>
        <div className="answer-panel-actions">
          {!answerFiles && (
            <button className={`answer-copy-btn${copied ? ' answer-copy-btn--copied' : ''}`} onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          )}
          <button className="answer-hide-btn" onClick={() => setPhase('idle')}>
            Hide
          </button>
        </div>
      </div>
      {isMarkdown ? (
        <div className="answer-markdown">
          <ReactMarkdown components={markdownCodeComponents}>{answer}</ReactMarkdown>
        </div>
      ) : (
        <>
          <pre className="answer-code"><code>{answer.fixedCode}</code></pre>
          <div className="answer-section-label">Why this works</div>
          <p className="answer-explanation">{answer.explanation}</p>
        </>
      )}
      {answerFiles && (
        <>
          <div className="answer-section-label">Corrected files</div>
          <AnswerFiles answerFiles={answerFiles} starterFiles={starterFiles} />
        </>
      )}
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export default function Sidebar({ files, activeFile, onFileSelect, readme, answer, answerFiles = null, starterFiles = null, partTitle, answerKeyAllowed = true, onViewAnswer }) {
  const filePaths = Object.keys(files);
  const { dirs, rootFiles } = buildTree(filePaths);
  const [collapsed, setCollapsed] = useState(new Set());

  const toggleDir = (dir) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(dir) ? next.delete(dir) : next.add(dir);
      return next;
    });

  return (
    <div className="sidebar">
      <div className="sidebar-section-header">EXPLORER</div>
      <div className="sidebar-tree">
        {Object.entries(dirs).map(([dir, children]) => {
          const open = !collapsed.has(dir);
          return (
            <div key={dir}>
              <div className="sidebar-dir" onClick={() => toggleDir(dir)}>
                <span className="sidebar-dir-arrow">{open ? '▾' : '▸'}</span>
                <span className="sidebar-dir-name">{dir}</span>
              </div>
              {open && children.map(({ name, path }) => (
                <FileItem key={path} path={path} name={name} active={activeFile === path} indent={1} onClick={() => onFileSelect(path)} />
              ))}
            </div>
          );
        })}
        {rootFiles.map((path) => (
          <FileItem key={path} path={path} name={path} active={activeFile === path} onClick={() => onFileSelect(path)} />
        ))}
      </div>
      <div className="sidebar-readme-header">README</div>
      <div className="sidebar-readme">
        <div className="readme-body">
          <ReactMarkdown components={markdownCodeComponents}>{readme}</ReactMarkdown>
        </div>
        {answer && answerKeyAllowed && (
          <ViewAnswer
            key={partTitle}
            answer={answer}
            answerFiles={answerFiles}
            starterFiles={starterFiles}
            onViewAnswer={onViewAnswer}
          />
        )}
        {answer && !answerKeyAllowed && (
          <div className="answer-locked">
            <span className="answer-locked-icon">🔒</span>
            <span className="answer-locked-text">Answer key hidden for this session</span>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

export default function DiffViewer({ diff }) {
  if (!diff) return <div className="diff-empty">No diff provided.</div>;

  const lines = diff.split('\n');

  return (
    <div className="diff-viewer">
      <div className="diff-viewer-inner">
        {lines.map((line, i) => {
          let cls = 'diff-line';
          if (line.startsWith('diff ') || line.startsWith('index ')) {
            cls += ' diff-line--meta';
          } else if (line.startsWith('--- ') || line.startsWith('+++ ')) {
            cls += ' diff-line--file';
          } else if (line.startsWith('@@')) {
            cls += ' diff-line--hunk';
          } else if (line.startsWith('+')) {
            cls += ' diff-line--add';
          } else if (line.startsWith('-')) {
            cls += ' diff-line--del';
          }

          return (
            <div key={i} className={cls}>
              <span className="diff-ln">{i + 1}</span>
              <span className="diff-text">{line || ' '}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

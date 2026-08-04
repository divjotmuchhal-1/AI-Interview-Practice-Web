'use client';

import ReactMarkdown from 'react-markdown';

export default function ReadmePane({ readme }) {
  return (
    <div className="pane">
      <div className="pane-header">
        <span className="pane-label">README</span>
      </div>
      <div className="pane-body readme-body">
        <ReactMarkdown>{readme}</ReactMarkdown>
      </div>
    </div>
  );
}

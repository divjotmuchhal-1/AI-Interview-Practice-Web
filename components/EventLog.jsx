'use client';

import { useState } from 'react';

function fmtTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
  return `${s}.${tenths}s`;
}

function summarize(ev) {
  const d = ev.data;
  switch (ev.type) {
    case 'prompt_sent':   return d.text.length > 70 ? d.text.slice(0, 67) + '…' : d.text;
    case 'ai_response':   return `${d.chars} chars`;
    case 'code_applied':  return d.filename;
    case 'code_edited':   return `${d.filename}  (${d.snapshot.length} chars)`;
    case 'tests_run':     return d.moduleError ? `error: ${d.moduleError.slice(0, 50)}` : `${d.passing}/${d.total} passing`;
    case 'part_advanced': return `Part ${d.from + 1} → Part ${d.to + 1}`;
    default:              return JSON.stringify(d).slice(0, 60);
  }
}

const TYPE_LABELS = {
  prompt_sent: 'prompt', ai_response: 'ai', code_applied: 'applied',
  code_edited: 'edited', tests_run: 'tests', part_advanced: 'part →',
};

function EventRow({ event, index }) {
  const [open, setOpen] = useState(false);
  const label = TYPE_LABELS[event.type] ?? event.type;
  const dataPreview = event.type === 'code_edited'
    ? { ...event.data, snapshot: `<${event.data.snapshot.length} chars>` }
    : event.data;

  return (
    <div className={`evlog-row evlog-row--${event.type}`} onClick={() => setOpen((o) => !o)}>
      <div className="evlog-row-meta">
        <span className="evlog-row-idx">#{index + 1}</span>
        <span className="evlog-row-time">{fmtTime(event.t)}</span>
        <span className="evlog-row-badge">{label}</span>
        <span className="evlog-row-summary">{summarize(event)}</span>
        <span className="evlog-row-chevron">{open ? '▾' : '▸'}</span>
      </div>
      {open && <pre className="evlog-row-data">{JSON.stringify(dataPreview, null, 2)}</pre>}
    </div>
  );
}

export default function EventLog({ events, onClose }) {
  return (
    <div className="evlog-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="evlog-panel">
        <div className="evlog-header">
          <span className="evlog-title">Session Events</span>
          <span className="evlog-count">{events.length} events</span>
          <button className="evlog-close" onClick={onClose}>✕</button>
        </div>
        <div className="evlog-body">
          {events.length === 0
            ? <div className="evlog-empty">No events yet. Send a message, run tests, or edit code.</div>
            : events.map((ev, i) => <EventRow key={i} event={ev} index={i} />)}
        </div>
        <div className="evlog-footer">
          <button className="evlog-copy-btn" onClick={() => navigator.clipboard.writeText(JSON.stringify(events, null, 2))}>
            Copy JSON
          </button>
        </div>
      </div>
    </div>
  );
}

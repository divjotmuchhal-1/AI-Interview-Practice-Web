'use client';

import { useState } from 'react';

const REPORT_EMAIL = 'divjotmuchhal@gmail.com';

function mailtoFallbackHref(scenario, part, partIndex, description) {
  const subject = `Issue report: ${scenario.title} (Part ${partIndex + 1})`;
  const body = [
    `Scenario: ${scenario.title} (${scenario.id})`,
    `Part: ${partIndex + 1} - ${part.title}`,
    '',
    description || 'What went wrong:',
  ].join('\n');
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function ReportIssueModal({ scenario, part, partIndex, files, onClose }) {
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  const handleSubmit = async () => {
    if (!description.trim() || status === 'submitting') return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId:    scenario.id,
          scenarioTitle: scenario.title,
          partIndex,
          partTitle:     part.title,
          description:   description.trim(),
          files,
        }),
      });
      if (!res.ok) throw new Error('insert failed');
      setStatus('success');
      setTimeout(onClose, 1600);
    } catch (_) {
      setStatus('error');
    }
  };

  return (
    <div className="rim-overlay" onClick={onClose}>
      <div className="rim-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rim-header">
          <h3 className="rim-title">Report an issue</h3>
          <span className="rim-context">{scenario.title} · Part {partIndex + 1}: {part.title}</span>
        </div>

        {status === 'success' ? (
          <div className="rim-success">✓ Report sent. Thank you!</div>
        ) : (
          <>
            <textarea
              className="rim-textarea"
              placeholder="What went wrong? What did you expect to happen?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={5000}
              autoFocus
            />
            <p className="rim-hint">Your current code is attached automatically so we can reproduce the problem.</p>

            {status === 'error' && (
              <div className="rim-error">
                Sending failed. You can{' '}
                <a href={mailtoFallbackHref(scenario, part, partIndex, description.trim())}>
                  email the report instead
                </a>{' '}
                or try again.
              </div>
            )}

            <div className="rim-actions">
              <button className="rim-cancel" onClick={onClose}>Cancel</button>
              <button
                className="rim-submit"
                onClick={handleSubmit}
                disabled={!description.trim() || status === 'submitting'}
              >
                {status === 'submitting' ? 'Sending…' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

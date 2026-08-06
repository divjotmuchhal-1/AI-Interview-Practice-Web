'use client';

import { useState, useEffect } from 'react';

const DISMISS_KEY = 'aip_mobile_notice_dismissed';

/**
 * Greets phone visitors once per browser session with an explanation that
 * sessions need a desktop.
 *
 * Visibility is driven by CSS (see the mobile breakpoint in overrides.css)
 * rather than a width check in JS, so rotating a tablet or resizing a window
 * behaves correctly without any listener.
 */
export default function MobileNotice() {
  const [dismissed, setDismissed] = useState(true); // assume dismissed until storage is read, to avoid a flash

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false); // storage blocked: still show the notice
    }
  }, []);

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="mn-overlay" role="dialog" aria-modal="true" aria-labelledby="mn-title">
      <div className="mn-modal">
        <span className="mn-icon" aria-hidden="true">💻</span>
        <h2 className="mn-title" id="mn-title">Best on desktop</h2>
        <p className="mn-text">
          Practice sessions use a full code editor, a test runner, and an AI coach side by side,
          which needs a larger screen than a phone.
        </p>
        <p className="mn-text mn-text--muted">
          You can browse tracks and scenarios here. When you are ready to practice, open
          aicodingprep.com on a computer.
        </p>
        <button className="mn-btn" onClick={dismiss}>Got it</button>
      </div>
    </div>
  );
}

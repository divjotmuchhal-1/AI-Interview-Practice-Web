'use client';

function WarnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M8.574 2.77a1.667 1.667 0 0 1 2.852 0l6.666 11.11A1.667 1.667 0 0 1 16.666 16.5H3.334a1.667 1.667 0 0 1-1.426-2.62L8.574 2.77Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path d="M10 7.5v3.333" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="10" cy="13.5" r="0.917" fill="currentColor" />
    </svg>
  );
}

export default function PartWarningModal({ partIndex, onConfirm, onCancel }) {
  const partNum  = partIndex + 1;
  const nextNum  = partIndex + 2;

  return (
    <div className="pwm-overlay" onClick={onCancel}>
      <div className="pwm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pwm-icon-wrap">
          <WarnIcon />
        </div>

        <div className="pwm-body">
          <p className="pwm-eyebrow">Heads up</p>
          <h2 className="pwm-title">Next part reveals the answer</h2>
          <p className="pwm-desc">
            Part {nextNum}'s starter code is the corrected version of Part {partNum}.
            Moving forward now will show you the solution before you've solved it.
          </p>
        </div>

        <div className="pwm-footer">
          <button className="pwm-cancel" onClick={onCancel}>
            Stay here
          </button>
          <button className="pwm-confirm" onClick={onConfirm}>
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}

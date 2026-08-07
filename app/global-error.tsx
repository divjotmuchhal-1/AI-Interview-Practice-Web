'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Last-resort boundary: catches errors thrown by the root layout itself, which
// app/error.tsx sits below and therefore cannot catch. Next.js swaps out the
// entire document here, so this file must render its own <html> and <body>.
//
// That also means app/globals.css is NOT loaded: the design tokens do not
// exist on this screen. Every colour below is written out literally on purpose.
// Using var(--bg-base) here would silently render as transparent.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '22px',
            padding: '32px',
            background: '#100f0d',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
            <rect width="34" height="34" rx="9" fill="#d9534f" fillOpacity="0.1" />
            <rect width="34" height="34" rx="9" stroke="#d9534f" strokeOpacity="0.3" strokeWidth="1" />
            <path d="M14 9.5L9 17L14 24.5" stroke="#d9534f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 9.5L25 17L20 24.5" stroke="#d9534f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#8a7f72',
              margin: 0,
            }}>Something went wrong</p>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#f5ede3',
              margin: 0,
            }}>The page could not load</h1>
            <p style={{
              fontSize: '14px',
              color: '#8a7f72',
              margin: 0,
              maxWidth: '340px',
              lineHeight: 1.5,
            }}>
              This one is on us, and it has been reported automatically. Reloading usually fixes it.
            </p>
            {error.digest && (
              <p style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '10px',
                color: '#8a7f72',
                opacity: 0.5,
                margin: '4px 0 0',
              }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* A full reload, not reset(): if the root layout is what threw,
                re-rendering it in place would just throw again. */}
            <button
              onClick={() => window.location.reload()}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                background: '#e8774a',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
            <a href="/practice" style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '13px',
              fontWeight: 600,
              color: '#8a7f72',
              textDecoration: 'none',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '9px 18px',
            }}>
              Back to Practice
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

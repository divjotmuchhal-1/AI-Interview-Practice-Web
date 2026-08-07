'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Route-level boundary: catches render errors anywhere below the root layout.
// Errors thrown by the root layout itself escape this and are caught by
// app/global-error.tsx instead.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Without this the boundary swallows the error: the user sees the fallback
    // and Sentry never hears about it, which is exactly the crash we most need
    // to know about.
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
      padding: '32px',
      background: 'var(--bg-base)',
      textAlign: 'center',
    }}>
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
        <rect width="34" height="34" rx="9" fill="var(--red)" fillOpacity="0.1"/>
        <rect width="34" height="34" rx="9" stroke="var(--red)" strokeOpacity="0.3" strokeWidth="1"/>
        <path d="M14 9.5L9 17L14 24.5" stroke="var(--red)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 9.5L25 17L20 24.5" stroke="var(--red)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          margin: 0,
        }}>Something went wrong</p>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--text-heading)',
          margin: 0,
        }}>Unexpected error</h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-muted)',
          margin: 0,
          maxWidth: '340px',
        }}>
          An error occurred while loading this page. Try again, or go back to your practice session.
        </p>
        {error.digest && (
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            opacity: 0.5,
            margin: '4px 0 0',
          }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--accent-text)',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--radius)',
            padding: '8px 18px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <a href="/practice" style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textDecoration: 'none',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '8px 18px',
        }}>
          Back to Practice
        </a>
      </div>
    </div>
  );
}

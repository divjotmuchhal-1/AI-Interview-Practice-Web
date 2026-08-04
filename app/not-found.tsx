import Link from 'next/link';

export default function NotFound() {
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
        <rect width="34" height="34" rx="9" fill="var(--orange)" fillOpacity="0.1"/>
        <rect width="34" height="34" rx="9" stroke="var(--orange)" strokeOpacity="0.3" strokeWidth="1"/>
        <path d="M14 9.5L9 17L14 24.5" stroke="var(--orange)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 9.5L25 17L20 24.5" stroke="var(--orange)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
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
        }}>404</p>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--text-heading)',
          margin: 0,
        }}>Page not found</h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-muted)',
          margin: 0,
          maxWidth: '320px',
        }}>
          This page doesn't exist or was moved. Head back to your practice session.
        </p>
      </div>

      <Link href="/practice" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--accent)',
        textDecoration: 'none',
        border: '1px solid rgba(232,119,74,0.3)',
        borderRadius: 'var(--radius)',
        padding: '8px 18px',
        transition: 'border-color 0.15s, background 0.15s',
      }}>
        Back to Practice
      </Link>
    </div>
  );
}

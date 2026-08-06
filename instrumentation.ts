import * as Sentry from '@sentry/nextjs';

// Next.js loads this once per runtime. Each config is inert unless a DSN is set.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captures errors thrown in React Server Components.
export const onRequestError = Sentry.captureRequestError;

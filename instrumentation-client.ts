// Browser-side instrumentation entry point (Next.js loads this automatically).
//
// This content used to live in sentry.client.config.ts. That filename is
// deprecated and stops working under Turbopack, so the init lives here now.
import * as Sentry from '@sentry/nextjs';

// Error monitoring is opt-in: with no DSN set, init() is a no-op and nothing is
// sent anywhere. Add NEXT_PUBLIC_SENTRY_DSN in Vercel to switch it on.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Sample a slice of traffic for performance data; errors are always captured.
  tracesSampleRate: 0.1,

  // Never record session replays: users type their own code and chat messages
  // into this app, and that content should not leave their browser.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Do not attach request bodies or cookies to events.
  sendDefaultPii: false,

  ignoreErrors: [
    // Next.js speculatively prefetches every <Link> that enters the viewport,
    // then aborts those requests when the router cancels them or the user
    // navigates away. The abort rejects and escapes to
    // window.onunhandledrejection, so Sentry records it as an unhandled error
    // even though nothing failed: a cancelled prefetch has no user impact.
    // The landing page alone has eight links to /login, so unfiltered this
    // would be constant noise against a 5k events/month quota.
    //
    // Safe to filter wholesale because the app never calls AbortController or
    // .abort() itself. If that ever changes, narrow this.
    'signal is aborted without reason',
  ],
});

// Lets Sentry tie a slow or failed navigation to the route the user was moving
// to. Without it, App Router client navigations are invisible in tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

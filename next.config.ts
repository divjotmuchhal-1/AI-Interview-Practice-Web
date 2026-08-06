import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, path: false };
    // Monaco Editor web workers need `self` as the global object.
    // Only set this on the browser bundle: `self` is undefined on the server.
    if (!isServer) {
      config.output.globalObject = 'self';
    }
    return config;
  },

  async headers() {
    return [
      {
        // Monaco assets are versioned by the pinned monaco-editor dependency and
        // regenerated on install, so they can be cached indefinitely. Without
        // this every visit re-downloads several MB of editor.
        source: '/monaco/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          // No page in this app should ever be framed (clickjacking defense).
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          // Browsers must not MIME-sniff responses into executable types.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Do not leak full URLs (which can carry auth callback params) cross-origin.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // This app never needs these browser capabilities.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
    ];
  },
};

// Sentry's build plugin injects the browser SDK and, when SENTRY_AUTH_TOKEN is
// set, uploads source maps so production stack traces show real file and line
// numbers instead of minified names. Without this wrapper the client SDK is
// never bundled, so browser errors go unreported even with a valid DSN.
export default withSentryConfig(nextConfig, {
  org: 'ai-coding-prep',
  project: 'javascript-nextjs',
  // Build logs stay quiet locally; CI still surfaces upload problems.
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Strips Sentry's own console logging from the production bundle.
  disableLogger: true,
  // Source map upload is skipped automatically when no auth token is present,
  // so builds succeed without one.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});

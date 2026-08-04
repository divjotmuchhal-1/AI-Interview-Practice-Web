import type { NextConfig } from 'next';

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

export default nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, path: false };
    // Monaco Editor web workers need `self` as the global object.
    // Only set this on the browser bundle — `self` is undefined on the server.
    if (!isServer) {
      config.output.globalObject = 'self';
    }
    return config;
  },
};

export default nextConfig;

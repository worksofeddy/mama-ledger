import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Suppress punycode deprecation warning
    config.ignoreWarnings = [
      { module: /node_modules\/punycode/ },
      /the `punycode` module is deprecated/,
    ];
    
    return config;
  },
  // Suppress console warnings in production
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;

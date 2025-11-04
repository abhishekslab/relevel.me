module.exports = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker deployment
  webpack: (config, { isServer }) => {
    // Stub @amplitude/analytics-browser to avoid installing telemetry package
    // Visage uses it for optional telemetry, but it's not critical for functionality
    // Apply to both client and server builds to ensure Docker builds work
    config.resolve.alias = {
      ...config.resolve.alias,
      '@amplitude/analytics-browser': false,
    };
    return config;
  },
};

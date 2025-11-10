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

    // Externalize embedding provider packages for server-side only
    // These packages have native bindings and can't be bundled by webpack
    if (isServer) {
      config.externals = config.externals || [];

      // Add embedding provider dependencies as external modules
      // This prevents webpack from trying to bundle native Node.js bindings
      config.externals.push(
        '@xenova/transformers',
        'onnxruntime-node',
        '@huggingface/inference',
        'openai',
        'sharp' // Also used by transformers, has native bindings
      );
    }

    return config;
  },
};

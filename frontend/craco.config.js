module.exports = {
  devServer: (devServerConfig) => {
    // Accept any host so the app works with any DOMAIN (e.g. localhost, tm.local) behind the reverse proxy.
    devServerConfig.allowedHosts = 'all';
    return devServerConfig;
  },
  webpack: {
    configure: (webpackConfig) => {
      // Ignore source map warnings from node_modules
      // This is the cleanest way to suppress these warnings in webpack 5
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        {
          module: /node_modules/,
          message: /Failed to parse source map/,
        },
        // Also ignore any source map related warnings
        (warning) => {
          const message = warning.message || warning.toString();
          return (
            message.includes('Failed to parse source map') &&
            message.includes('node_modules')
          );
        },
      ];

      return webpackConfig;
    },
  },
};


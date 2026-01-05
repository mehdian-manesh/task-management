module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Ignore source map warnings from node_modules
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        {
          module: /node_modules/,
          message: /Failed to parse source map/,
        },
        (warning) => {
          const message = warning.message || warning.toString();
          return (
            message.includes('Failed to parse source map') &&
            message.includes('node_modules')
          );
        },
      ];

      // Optimize bundle splitting
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        splitChunks: {
          ...webpackConfig.optimization.splitChunks,
          chunks: 'all',
          cacheGroups: {
            ...(webpackConfig.optimization.splitChunks?.cacheGroups || {}),
            // Separate Material-UI into its own chunk
            mui: {
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
              name: 'mui',
              chunks: 'all',
              priority: 10,
            },
            // Separate date libraries
            dateLibs: {
              test: /[\\/]node_modules[\\/](date-fns|moment|dayjs)[\\/]/,
              name: 'date-libs',
              chunks: 'all',
              priority: 5,
            },
            // Separate other large libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
              priority: 1,
            },
          },
        },
        // Enable tree shaking
        usedExports: true,
        // Minimize bundle size
        minimize: true,
      };

      // Add compression plugin for production (only if available)
      if (process.env.NODE_ENV === 'production') {
        try {
          const CompressionPlugin = require('compression-webpack-plugin');
          webpackConfig.plugins.push(
            new CompressionPlugin({
              algorithm: 'gzip',
              test: /\.(js|css|html|svg)$/,
              threshold: 10240,
              minRatio: 0.8,
            })
          );
        } catch (error) {
          console.warn('compression-webpack-plugin not available, skipping compression');
        }
      }

      return webpackConfig;
    },
  },
};


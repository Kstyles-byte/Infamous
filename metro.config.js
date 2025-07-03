const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for the <anonymous> file error in web builds
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    sourceMap: false,
  },
  sourceMap: false,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Configure resolver for better web compatibility
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'mjs'],
  platforms: ['ios', 'android', 'native', 'web'],
};

// Configure web-specific settings
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    return (req, res, next) => {
      // Disable source map requests for web
      if (req.url && req.url.includes('sourcemap')) {
        res.statusCode = 404;
        res.end();
        return;
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config; 
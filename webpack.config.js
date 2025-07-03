const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Disable source maps for web builds
  config.devtool = false;
  
  // Configure optimization
  config.optimization = {
    ...config.optimization,
    minimize: true,
  };
  
  // Disable source map generation
  if (config.module && config.module.rules) {
    config.module.rules.push({
      test: /\.js$/,
      enforce: 'pre',
      use: ['source-map-loader'],
      exclude: /node_modules/,
    });
  }
  
  return config;
}; 
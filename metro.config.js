const { getDefaultConfig } = require('@expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  return {
    ...config,
    resolver: {
      ...config.resolver,
      assetExts: config.resolver.assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...config.resolver.sourceExts, 'tsx', 'ts', 'svg'],
      extraNodeModules: {
        'lodash/uniqueId': require.resolve('lodash/uniqueId'),
        'lodash/toNumber': require.resolve('lodash/toNumber'),
        '@babel/runtime/helpers/asyncToGenerator': require.resolve('@babel/runtime/helpers/asyncToGenerator'),
        './fork/NavigationContainer': require.resolve('expo-router/build/fork/NavigationContainer.js'),
      },
    },
    transformer: {
      ...config.transformer,
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
  };
})();
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration — SecurBookingApp
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Support des alias de chemin (miroir de babel.config.js)
    extraNodeModules: {
      '@api':        path.resolve(__dirname, 'src/api'),
      '@constants':  path.resolve(__dirname, 'src/constants'),
      '@models':     path.resolve(__dirname, 'src/models'),
      '@services':   path.resolve(__dirname, 'src/services'),
      '@store':      path.resolve(__dirname, 'src/store'),
      '@screens':    path.resolve(__dirname, 'src/screens'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks':      path.resolve(__dirname, 'src/hooks'),
      '@utils':      path.resolve(__dirname, 'src/utils'),
      '@theme':      path.resolve(__dirname, 'src/theme'),
      '@navigation': path.resolve(__dirname, 'src/navigation'),
      '@assets':     path.resolve(__dirname, 'src/assets'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@api':        './src/api',
          '@constants':  './src/constants',
          '@models':     './src/models',
          '@services':   './src/services',
          '@store':      './src/store',
          '@screens':    './src/screens',
          '@components': './src/components',
          '@hooks':      './src/hooks',
          '@utils':      './src/utils',
          '@theme':      './src/theme',
          '@navigation': './src/navigation',
          '@assets':     './src/assets',
          '@i18n':       './src/i18n',
        },
      },
    ],
  ],
};

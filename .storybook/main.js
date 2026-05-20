// .storybook/main.js — Storybook for React Native
// Compatible with @storybook/react-native 8.x

/** @type { import('@storybook/react-native').StorybookConfig } */
const config = {
  stories: [
    '../src/**/*.stories.?(ts|tsx)',
    '../src/**/*.stories.?(js|jsx)',
  ],
  addons: [
    '@storybook/addon-ondevice-controls',
    '@storybook/addon-ondevice-actions',
    '@storybook/addon-ondevice-backgrounds',
    '@storybook/addon-ondevice-notes',
  ],
  framework: {
    name: '@storybook/react-native',
    options: {},
  },
};

module.exports = config;

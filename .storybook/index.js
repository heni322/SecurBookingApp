// .storybook/index.js — Storybook entry point for React Native
import { getStorybookUI } from '@storybook/react-native';
import './storybook.requires';

const StorybookUIRoot = getStorybookUI({
  initialSelection: { kind: 'UI/Button', name: 'All Variants' },
});

export default StorybookUIRoot;

// .storybook/preview.js — global decorators & parameters

import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme/colors';

/** @type { import('@storybook/react-native').Preview } */
const preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark',     value: colors.background },
        { name: 'surface',  value: '#0f172a' },
        { name: 'light',    value: '#ffffff' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date:  /date$/i,
      },
    },
  },

  decorators: [
    (Story) => (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
          <Story />
        </View>
      </SafeAreaProvider>
    ),
  ],
};

export default preview;

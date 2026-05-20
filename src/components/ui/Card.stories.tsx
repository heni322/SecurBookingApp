import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { Card } from './Card';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

const meta: Meta<typeof Card> = {
  title:     'UI/Card',
  component: Card,
  argTypes: {
    elevated: { control: 'boolean' },
    padded:   { control: 'boolean' },
    glow:     { control: 'boolean' },
    danger:   { control: 'boolean' },
    success:  { control: 'boolean' },
  },
  args: {
    elevated: false,
    padded:   true,
    glow:     false,
    danger:   false,
    success:  false,
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

const Placeholder = ({ label }: { label: string }) => (
  <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted }}>
    {label}
  </Text>
);

export const Default: Story = {
  render: (args: React.ComponentProps<typeof Card>) => (
    <Card {...args}>
      <Placeholder label="Default card content" />
    </Card>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: spacing[4] }}>
      <Card>
        <Placeholder label="Default surface card" />
      </Card>
      <Card elevated>
        <Placeholder label="Elevated card (modal-like)" />
      </Card>
      <Card glow>
        <Placeholder label="Glow card (featured / active)" />
      </Card>
      <Card danger>
        <Placeholder label="Danger card (error / warning)" />
      </Card>
      <Card success>
        <Placeholder label="Success card (completed)" />
      </Card>
    </View>
  ),
};

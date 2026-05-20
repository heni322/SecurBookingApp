import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { View } from 'react-native';
import { Badge } from './Badge';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';

const meta: Meta<typeof Badge> = {
  title:     'UI/Badge',
  component: Badge,
  argTypes: {
    label: { control: 'text' },
    dot:   { control: 'boolean' },
    size:  { control: 'select', options: ['sm', 'md'] },
  },
  args: {
    label: 'Active',
    dot:   true,
    size:  'sm',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {};

export const AllStatuses: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
      <Badge label="Active"    color={colors.success}  bg={colors.successSurface} />
      <Badge label="Pending"   color={colors.warning}  bg={colors.warningSurface} />
      <Badge label="Cancelled" color={colors.danger}   bg={colors.dangerSurface}  />
      <Badge label="Info"      color={colors.info}     bg={colors.infoSurface}    />
      <Badge label="Primary"   color={colors.primary}  bg={colors.primarySurface} />
      <Badge label="NoDot"     dot={false} />
    </View>
  ),
};

export const SizeComparison: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'center' }}>
      <Badge label="Small"  size="sm" color={colors.success} bg={colors.successSurface} />
      <Badge label="Medium" size="md" color={colors.success} bg={colors.successSurface} />
    </View>
  ),
};

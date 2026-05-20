import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { View } from 'react-native';
import { Avatar } from './Avatar';
import { spacing } from '@theme/spacing';

const meta: Meta<typeof Avatar> = {
  title:     'UI/Avatar',
  component: Avatar,
  argTypes: {
    size:      { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    online:    { control: 'boolean' },
    name:      { control: 'text' },
    avatarUrl: { control: 'text' },
  },
  args: {
    name:   'Jean Dupont',
    size:   'md',
    online: false,
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {};

export const WithImage: Story = {
  args: {
    avatarUrl: 'https://i.pravatar.cc/150?img=3',
    name:      'Jean Dupont',
    online:    true,
  },
};

export const InitialsFallback: Story = {
  args: { name: 'Marie Curie', avatarUrl: undefined, online: false },
};

export const OnlineIndicator: Story = {
  args: { name: 'Jean Dupont', online: true },
};

export const AllSizes: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing[4] }}>
      <Avatar name="JD" size="xs" />
      <Avatar name="JD" size="sm" />
      <Avatar name="JD" size="md" />
      <Avatar name="JD" size="lg" />
      <Avatar name="JD" size="xl" online />
    </View>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { View } from 'react-native';
import { Shield, Plus, Trash2 } from 'lucide-react-native';
import { Button } from './Button';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';

const meta: Meta<typeof Button> = {
  title:     'UI/Button',
  component: Button,
  argTypes: {
    variant:  { control: 'select', options: ['filled', 'outline', 'ghost', 'danger'] },
    size:     { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    loading:  { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth:{ control: 'boolean' },
    label:    { control: 'text' },
  },
  args: {
    label:    'Continue',
    variant:  'filled',
    size:     'md',
    loading:  false,
    disabled: false,
    fullWidth: false,
    onPress:  () => {},
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: spacing[3] }}>
      <Button label="Filled"   variant="filled"  onPress={() => {}} />
      <Button label="Outline"  variant="outline" onPress={() => {}} />
      <Button label="Ghost"    variant="ghost"   onPress={() => {}} />
      <Button label="Danger"   variant="danger"  onPress={() => {}} />
      <Button label="Disabled" variant="filled"  disabled onPress={() => {}} />
      <Button label="Loading"  variant="filled"  loading  onPress={() => {}} />
    </View>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <View style={{ gap: spacing[3] }}>
      <Button label="Small"     size="sm" onPress={() => {}} />
      <Button label="Medium"    size="md" onPress={() => {}} />
      <Button label="Large"     size="lg" onPress={() => {}} />
      <Button label="X-Large"   size="xl" onPress={() => {}} />
    </View>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <View style={{ gap: spacing[3] }}>
      <Button
        label="New Mission"
        leftIcon={<Plus size={16} color={colors.textInverse} />}
        onPress={() => {}}
      />
      <Button
        label="Security"
        leftIcon={<Shield size={16} color={colors.textInverse} />}
        onPress={() => {}}
      />
      <Button
        label="Delete"
        variant="danger"
        leftIcon={<Trash2 size={16} color={colors.danger} />}
        onPress={() => {}}
      />
    </View>
  ),
};

export const FullWidth: Story = {
  args: { fullWidth: true, label: 'Confirm & Continue' },
};

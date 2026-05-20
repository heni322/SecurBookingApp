import type { Meta, StoryObj } from '@storybook/react-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Mail, Lock, Phone } from 'lucide-react-native';
import { Input } from './Input';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';

const meta: Meta<typeof Input> = {
  title:     'UI/Input',
  component: Input,
  argTypes: {
    type:     { control: 'select', options: ['text', 'email', 'password', 'phone', 'numeric', 'multiline'] },
    label:    { control: 'text' },
    error:    { control: 'text' },
    hint:     { control: 'text' },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
  args: {
    label:       'Label',
    placeholder: 'Placeholder…',
    type:        'text',
    disabled:    false,
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    label: 'Email address',
    type:  'email',
    error: 'This email is already in use.',
    value: 'bad@',
  },
};

export const WithHint: Story = {
  args: {
    label: 'Password',
    type:  'password',
    hint:  'At least 8 characters, one uppercase letter.',
  },
};

// Extracted into a real component so React Hooks (useState) run in a valid
// component context — calling hooks directly inside `render` violates the
// rules of hooks.
function AllTypesDemo() {
  const [vals, setVals] = useState({
    text: '', email: '', password: '', phone: '', multiline: '',
  });
  const bind = (key: keyof typeof vals) => ({
    value:         vals[key],
    onChangeText:  (v: string) => setVals(p => ({ ...p, [key]: v })),
  });
  return (
    <View style={{ gap: spacing[1] }}>
      <Input label="Text"      type="text"      placeholder="Free text"     {...bind('text')} />
      <Input label="Email"     type="email"     placeholder="you@email.com" {...bind('email')}
        leftIcon={<Mail size={16} color={colors.textMuted} />} />
      <Input label="Password"  type="password"  placeholder="••••••••"      {...bind('password')}
        leftIcon={<Lock size={16} color={colors.textMuted} />} />
      <Input label="Phone"     type="phone"     placeholder="+33 6 12 34 56 78" {...bind('phone')}
        leftIcon={<Phone size={16} color={colors.textMuted} />} />
      <Input label="Multiline" type="multiline" placeholder="Write something…"  {...bind('multiline')} />
    </View>
  );
}

export const AllTypes: Story = {
  render: () => <AllTypesDemo />,
};

export const Disabled: Story = {
  args: { label: 'Disabled field', disabled: true, value: 'Cannot edit this' },
};

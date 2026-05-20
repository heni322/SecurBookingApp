/**
 * AlertModal stories — requires ConfirmDialog component.
 * Demonstrates the imperative API via useConfirmDialog().
 */
import type { Meta, StoryObj, Decorator } from '@storybook/react-native';
import React from 'react';
import { View } from 'react-native';
import { ConfirmDialogHost } from './ConfirmDialog';
import { Button } from './Button';
import { useConfirmDialog } from '@hooks/useConfirmDialog';
import { spacing } from '@theme/spacing';

// ── Story component that drives the dialog ─────────────────────────────────

function AlertDemo() {
  const confirm = useConfirmDialog();

  const handleDestructive = async () => {
    const ok = await confirm({
      title:        'Delete mission?',
      message:      'This action cannot be undone. The mission and all its data will be permanently removed.',
      confirmLabel: 'Yes, delete',
      cancelLabel:  'Cancel',
      confirmStyle: 'destructive',
    });
    if (ok) console.log('[Storybook] User confirmed delete');
    else    console.log('[Storybook] User cancelled');
  };

  const handleInfo = async () => {
    await confirm({
      title:        'Session expired',
      message:      'Your session has expired. Please log in again to continue.',
      confirmLabel: 'OK',
    });
  };

  return (
    <View style={{ gap: spacing[3] }}>
      <Button label="Open Danger Dialog" variant="danger"  onPress={handleDestructive} />
      <Button label="Open Info Dialog"   variant="outline" onPress={handleInfo} />
    </View>
  );
}

const meta: Meta = {
  title:     'UI/AlertModal',
  component: AlertDemo,
  decorators: [
    ((Story: React.ComponentType) => (
      <>
        <Story />
        {/* ConfirmDialogHost must be mounted for the hook to work */}
        <ConfirmDialogHost />
      </>
    )) as Decorator,
  ],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

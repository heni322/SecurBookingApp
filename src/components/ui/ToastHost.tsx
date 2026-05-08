/**
 * ToastHost — renders the active toast stack at the top of the screen.
 *
 * Mount once at the app root, *inside* SafeAreaProvider so it can read the
 * top inset, and *after* RootNavigator so it overlays every screen.
 *
 * Stacking order: newest at the top. Each toast handles its own enter/exit
 * animation and timer, so the host stays a thin presentation layer.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@store/toastStore';
import { spacing }       from '@theme/spacing';
import { Toast }         from './Toast';

/** Z-index above OfflineBanner (9999) but below modal dialogs (>=10000). */
const TOAST_Z_INDEX = 10001;

export const ToastHost: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        { paddingTop: insets.top + spacing[2] },
      ]}
    >
      {/* Newest toast on top — reverse so it appears at index 0 visually. */}
      {[...toasts].reverse().map((item) => (
        <View key={item.id} pointerEvents="box-none" style={styles.slot}>
          <Toast item={item} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position:          'absolute',
    top:               0,
    left:              0,
    right:             0,
    zIndex:            TOAST_Z_INDEX,
    paddingHorizontal: spacing[4],
    gap:               spacing[2],
  },
  slot: {
    // Each toast renders inside its own slot so the gap between toasts
    // is consistent regardless of toast height.
    width: '100%',
  },
});

/**
 * ConfirmDialog — modal confirmation dialog (replaces native multi-button Alert.alert).
 *
 * Why custom (not Alert.alert):
 *  ● Native Alert is OS-themed (looks alien on top of our dark navy/gold UI).
 *  ● iOS and Android render Alert differently — inconsistent UX.
 *  ● No way to style the destructive button beyond a single `style: 'destructive'`
 *    flag that only iOS honors.
 *
 * Behaviour:
 *  ● Single dialog at a time (store enforces this — see confirmDialogStore).
 *  ● Tap scrim → cancel.
 *  ● Hardware back (Android) → cancel.
 *  ● Animated entry: fade + scale from 0.92 → 1.
 *  ● A11y: accessibilityViewIsModal + accessibilityRole="alert".
 *  ● Pure RN Animated — no extra dependencies (same approach as Toast/OfflineBanner).
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from './Button';
import { colors }                  from '@theme/colors';
import { spacing, radius }         from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { useConfirmDialogStore }   from '@store/confirmDialogStore';

// ── Single dialog item (rendered inside the host's <Modal>) ──────────────────

interface DialogItemProps {
  title:         string;
  message:       string;
  confirmLabel:  string;
  cancelLabel:   string;
  destructive:   boolean;
  onConfirm:     () => void;
  onCancel:      () => void;
}

const DialogItem: React.FC<DialogItemProps> = ({
  title, message, confirmLabel, cancelLabel, destructive, onConfirm, onCancel,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue:         1,
        duration:        180,
        easing:          Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue:         1,
        useNativeDriver: true,
        tension:         140,
        friction:        12,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View
      accessibilityViewIsModal
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${message}`}
      style={[styles.card, { opacity, transform: [{ scale }] }]}
      // Stop scrim taps from passing through the card content.
      onStartShouldSetResponder={() => true}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      <View style={styles.actions}>
        <Button
          label={cancelLabel}
          onPress={onCancel}
          variant="ghost"
          size="md"
          style={styles.btn}
        />
        <Button
          label={confirmLabel}
          onPress={onConfirm}
          variant={destructive ? 'danger' : 'filled'}
          size="md"
          style={styles.btn}
        />
      </View>
    </Animated.View>
  );
};

// ── Host (mount once at app root) ────────────────────────────────────────────

export const ConfirmDialogHost: React.FC = () => {
  const current = useConfirmDialogStore((s) => s.current);
  const resolve = useConfirmDialogStore((s) => s.resolve);

  // Hardware back on Android → cancel.
  useEffect(() => {
    if (!current) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      resolve(false);
      return true; // we handled it
    });
    return () => sub.remove();
  }, [current, resolve]);

  return (
    <Modal
      visible={!!current}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => resolve(false)}
    >
      <Pressable style={styles.scrim} onPress={() => resolve(false)} accessibilityLabel="Annuler">
        {current ? (
          <DialogItem
            key={current.id}
            title={current.title}
            message={current.message}
            confirmLabel={current.confirmLabel ?? 'Confirmer'}
            cancelLabel={current.cancelLabel ?? 'Annuler'}
            destructive={current.confirmStyle === 'destructive'}
            onConfirm={() => resolve(true)}
            onCancel={()  => resolve(false)}
          />
        ) : null}
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex:           1,
    backgroundColor: colors.scrim, // dark translucent overlay
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  card: {
    width:           '100%',
    maxWidth:        420,
    backgroundColor: colors.backgroundElevated,
    borderRadius:    radius['2xl'],
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing[6],
    gap:             spacing[3],
    // Elevation/shadow — same scale as Toast for visual consistency.
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 12 },
    shadowOpacity:   0.45,
    shadowRadius:    24,
    elevation:       16,
  },
  title: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.lg,
    color:         colors.textPrimary,
    letterSpacing: -0.4,
  },
  message: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  actions: {
    flexDirection: 'row',
    gap:           spacing[3],
    marginTop:     spacing[3],
  },
  btn: {
    flex: 1,
  },
});

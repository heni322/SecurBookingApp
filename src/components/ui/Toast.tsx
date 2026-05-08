/**
 * Toast — single notification card with slide-in animation, auto-dismiss
 * timer with progress bar, swipe-up-to-dismiss gesture, and full a11y.
 *
 * Visual design follows the existing status-token philosophy in colors.ts:
 *   variant → tinted surface bg + matching border + matching foreground.
 *
 * No external dependencies — uses RN's built-in Animated + PanResponder
 * (same approach as OfflineBanner, no Reanimated/Gesture-Handler needed).
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react-native';
import { colors }                  from '@theme/colors';
import { spacing, radius }         from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { useToastStore, type ToastItem, type ToastVariant } from '@store/toastStore';

interface VariantStyle {
  bg:     string;
  border: string;
  fg:     string;
  Icon:   typeof CheckCircle2;
}

const VARIANT_MAP: Record<ToastVariant, VariantStyle> = {
  success: { bg: colors.successSurface, border: colors.successBorder, fg: colors.success, Icon: CheckCircle2  },
  error:   { bg: colors.dangerSurface,  border: colors.dangerBorder,  fg: colors.danger,  Icon: AlertCircle   },
  warning: { bg: colors.warningSurface, border: colors.warningBorder, fg: colors.warning, Icon: AlertTriangle },
  info:    { bg: colors.infoSurface,    border: colors.infoBorder,    fg: colors.info,    Icon: Info          },
};

/** Distance (px) the user must drag upward before the toast dismisses. */
const SWIPE_DISMISS_THRESHOLD = 40;

interface Props {
  item: ToastItem;
}

export const Toast: React.FC<Props> = ({ item }) => {
  const dismiss = useToastStore((s) => s.dismiss);

  // ── Animations ────────────────────────────────────────────────────────────
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const dragY      = useRef(new Animated.Value(0)).current;
  const progress   = useRef(new Animated.Value(0)).current;

  // Track whether we've already fired the exit animation, to avoid double-dismiss
  // (timer + tap + swipe could otherwise race).
  const exitingRef = useRef(false);

  const { bg, border, fg, Icon } = VARIANT_MAP[item.variant];

  // ── Lifecycle: enter, progress, auto-dismiss ──────────────────────────────
  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue:         0,
        useNativeDriver: true,
        tension:         110,
        friction:        14,
      }),
      Animated.timing(opacity, {
        toValue:         1,
        duration:        220,
        easing:          Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar (drives auto-dismiss visually)
    if (item.duration > 0) {
      Animated.timing(progress, {
        toValue:         1,
        duration:        item.duration,
        easing:          Easing.linear,
        useNativeDriver: false, // width interpolation requires JS driver
      }).start(({ finished }) => {
        if (finished) handleDismiss();
      });
    }

    return () => {
      progress.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Dismiss (animated exit, then remove from store) ───────────────────────
  const handleDismiss = (): void => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue:         -120,
        duration:        180,
        easing:          Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue:         0,
        duration:        180,
        easing:          Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => dismiss(item.id));
  };

  // ── Swipe-up-to-dismiss gesture ───────────────────────────────────────────
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy < -4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          // Only allow upward drag; clamp downward at 0.
          dragY.setValue(Math.min(0, g.dy));
        },
        onPanResponderRelease: (_, g) => {
          if (-g.dy >= SWIPE_DISMISS_THRESHOLD) {
            handleDismiss();
          } else {
            // Snap back
            Animated.spring(dragY, {
              toValue:         0,
              useNativeDriver: true,
              tension:         140,
              friction:        12,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue:         0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const progressWidth = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: ['100%', '0%'],
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${item.title ? item.title + ': ' : ''}${item.message}`}
      style={[
        styles.toast,
        {
          backgroundColor: bg,
          borderColor:     border,
          opacity,
          transform:       [{ translateY: Animated.add(translateY, dragY) }],
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: border }]}>
          <Icon size={18} color={fg} strokeWidth={2.2} />
        </View>

        <View style={styles.body}>
          {item.title ? (
            <Text style={[styles.title, { color: fg }]} numberOfLines={1}>
              {item.title}
            </Text>
          ) : null}
          <Text style={styles.message} numberOfLines={3}>
            {item.message}
          </Text>
        </View>

        {item.action ? (
          <Pressable
            onPress={() => {
              item.action?.onPress();
              handleDismiss();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={item.action.label}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.actionLabel, { color: fg }]}>{item.action.label}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleDismiss}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          >
            <X size={16} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>

      {item.duration > 0 ? (
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { backgroundColor: fg, width: progressWidth }]}
          />
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    borderRadius:    radius.xl,
    borderWidth:     1,
    overflow:        'hidden',
    // Subtle elevation + shadow — works on both iOS and Android.
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.28,
    shadowRadius:    16,
    elevation:       8,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[3],
    padding:       spacing[3] + 2,
  },
  iconWrap: {
    width:          34,
    height:         34,
    borderRadius:   radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap:  2,
  },
  title: {
    fontFamily:    fontFamily.bodySemiBold,
    fontSize:      fontSize.sm,
    letterSpacing: -0.1,
  },
  message: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },
  actionBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[1] + 2,
    borderRadius:      radius.md,
  },
  actionLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.sm,
  },
  closeBtn: {
    width:          28,
    height:         28,
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   radius.md,
  },
  progressTrack: {
    height:          2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  progressFill: {
    height: 2,
  },
});

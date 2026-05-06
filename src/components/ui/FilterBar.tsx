/**
 * FilterBar — horizontal scrollable filter chip bar.
 *
 * Generic over key type T so it works with any string-keyed filter set.
 * Each chip supports a variant ('meta' | 'status'), a count badge,
 * and an optional colored dot indicator.
 *
 * Enhancement over the previous inline implementation:
 *  - Fully extracted with its own StyleSheet — zero style leakage into screen
 *  - Generic <T extends string> — reusable across the app
 *  - Animated chip press: scale spring on selection change
 *  - Pulse ring on the live dot (ACTIVE chip)
 *  - Mutually exclusive style ternary — no cascading override bugs
 *  - Full a11y: tablist / tab roles, selected state, count-aware labels
 */
import React, { useCallback, useEffect, useRef } from 'react';
import {
  ScrollView, TouchableOpacity, View, Text,
  StyleSheet, Animated,
} from 'react-native';
import { colors }              from '@theme/colors';
import { radius, spacing, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterChipDef<T extends string = string> {
  /** Unique filter key — passed back in onChange */
  key:      T;
  /** Display label */
  label:    string;
  /** Count shown in badge (hidden when 0 or undefined) */
  count?:   number;
  /** Colored dot shown before label (e.g. green for ACTIVE) */
  dotColor?: string;
  /**
   * 'meta'   — heavier pill (bold font, stronger border). Use for synthetic
   *            filters like ALL / ACTIVE that span multiple statuses.
   * 'status' — standard pill. Use for concrete status values.
   */
  variant?: 'meta' | 'status';
  /** Custom accessibility label — falls back to label (+ count if > 0) */
  a11yLabel?: string;
}

interface Props<T extends string = string> {
  filters:            FilterChipDef<T>[];
  activeKey:          T;
  onChange:           (key: T) => void;
  accessibilityLabel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterBar
// ─────────────────────────────────────────────────────────────────────────────

export function FilterBar<T extends string>({
  filters,
  activeKey,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {filters.map((chip) => (
        <FilterChip
          key={chip.key}
          chip={chip}
          active={chip.key === activeKey}
          onPress={onChange}
        />
      ))}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterChip — individual animated chip
// ─────────────────────────────────────────────────────────────────────────────

interface ChipProps<T extends string> {
  chip:    FilterChipDef<T>;
  active:  boolean;
  onPress: (key: T) => void;
}

function FilterChip<T extends string>({ chip, active, onPress }: ChipProps<T>) {
  const isMeta   = chip.variant === 'meta';
  const count    = chip.count ?? 0;

  // ── Scale spring on activation ──────────────────────────────────────────
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.93, duration: 80,  useNativeDriver: true }),
        Animated.spring(scaleAnim,  { toValue: 1,    friction: 5,   useNativeDriver: true }),
      ]).start();
    }
  }, [active]);

  // ── Dot pulse (only for dotColor chips when active) ─────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (chip.dotColor && active) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => pulseLoop.current?.stop();
  }, [active, chip.dotColor]);

  const handlePress = useCallback(() => onPress(chip.key), [chip.key, onPress]);

  const defaultA11y = count > 0 ? `${chip.label}, ${count}` : chip.label;
  const a11yLabel   = chip.a11yLabel ?? defaultA11y;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.72}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={a11yLabel}
        style={[
          styles.chip,
          isMeta
            ? (active ? styles.chipMetaActive : styles.chipMeta)
            : (active ? styles.chipActive     : null),
        ]}
      >
        {/* Dot indicator */}
        {chip.dotColor && (
          <View style={styles.dotWrap} accessibilityElementsHidden importantForAccessibility="no">
            {/* Pulse ring — only visible when active */}
            {active && (
              <Animated.View
                style={[
                  styles.dotRing,
                  { backgroundColor: chip.dotColor, transform: [{ scale: pulseAnim }] },
                ]}
              />
            )}
            <View style={[styles.dot, { backgroundColor: chip.dotColor }]} />
          </View>
        )}

        {/* Label */}
        <Text
          style={[
            styles.chipText,
            isMeta
              ? (active ? styles.chipTextMetaActive : styles.chipTextMeta)
              : (active ? styles.chipTextActive     : null),
          ]}
          numberOfLines={1}
        >
          {chip.label}
        </Text>

        {/* Count badge */}
        {count > 0 && (
          <View
            style={[styles.badge, active && styles.badgeActive]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Bar ────────────────────────────────────────────────────────────────────
  bar: {
    flexGrow:          0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[3],
    gap:               spacing[2],
    alignItems:        'center',
  },

  // ── Chip base ──────────────────────────────────────────────────────────────
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1] + 2,
    paddingHorizontal: spacing[4],
    paddingVertical:   spacing[2],
    borderRadius:      radius.full,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
  },

  // status chip — active
  chipActive: {
    backgroundColor: colors.primarySurface,
    borderColor:     colors.primary,
  },

  // meta chip (ALL / ACTIVE) — resting: stronger border + elevated surface
  chipMeta: {
    borderColor:     colors.borderStrong,
    backgroundColor: colors.surfaceHigh,
  },

  // meta chip — active
  chipMetaActive: {
    borderColor:     colors.primary,
    backgroundColor: colors.primarySurface,
  },

  // ── Dot + pulse ring ───────────────────────────────────────────────────────
  dotWrap: {
    width:          10,
    height:         10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  dotRing: {
    position:     'absolute',
    width:        10,
    height:       10,
    borderRadius: 5,
    opacity:      0.35,
  },
  dot: {
    width:        7,
    height:       7,
    borderRadius: 3.5,
  },

  // ── Label ─────────────────────────────────────────────────────────────────
  chipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    color:      colors.textPrimary,
  },
  chipTextActive: {
    color: colors.primary,
  },
  chipTextMeta: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.sm,
    color:      colors.textPrimary,
  },
  chipTextMetaActive: {
    color: colors.primary,
  },

  // ── Count badge ────────────────────────────────────────────────────────────
  badge: {
    minWidth:         18,
    height:           18,
    borderRadius:     9,
    backgroundColor:  colors.borderStrong,
    alignItems:       'center',
    justifyContent:   'center',
    paddingHorizontal: 4,
  },
  badgeActive: {
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   10,
    color:      colors.textMuted,
    lineHeight: 13,
  },
  badgeTextActive: {
    color: colors.textInverse,
  },
});

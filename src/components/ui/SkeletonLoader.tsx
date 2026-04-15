/**
 * SkeletonLoader — animated bone loading placeholder.
 * Replaces spinner in lists, cards, and screens while data loads.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, palette } from '@theme/colors';
import { radius } from '@theme/spacing';

interface SkeletonBoxProps {
  width?:  number | `${number}%`;
  height:  number;
  style?:  ViewStyle;
  round?:  boolean;
}

const SkeletonBox: React.FC<SkeletonBoxProps> = ({ width = '100%', height, style, round }) => {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7,  duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: round ? height / 2 : radius.lg,
          backgroundColor: palette.navy50,
          opacity,
        },
        style,
      ]}
    />
  );
};

// ── Pre-built skeletons ───────────────────────────────────────────────────────

export const MissionCardSkeleton: React.FC = () => (
  <View style={sk.missionCard}>
    <View style={sk.missionRow}>
      <SkeletonBox width={40} height={40} round style={sk.iconBox} />
      <View style={sk.missionBody}>
        <SkeletonBox width="65%" height={14} />
        <SkeletonBox width="45%" height={11} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBox width={60} height={22} round />
    </View>
    <View style={sk.missionFooter}>
      <SkeletonBox width="35%" height={10} />
      <SkeletonBox width="25%" height={10} />
    </View>
  </View>
);

export const PaymentRowSkeleton: React.FC = () => (
  <View style={sk.paymentRow}>
    <SkeletonBox width={38} height={38} round />
    <View style={sk.paymentBody}>
      <SkeletonBox width="55%" height={13} />
      <SkeletonBox width="40%" height={10} style={{ marginTop: 5 }} />
    </View>
    <SkeletonBox width={70} height={18} round />
  </View>
);

export const StatCardSkeleton: React.FC = () => (
  <View style={sk.statCard}>
    <SkeletonBox width={36} height={36} round />
    <SkeletonBox width={40} height={20} style={{ marginTop: 8 }} />
    <SkeletonBox width={55} height={10} style={{ marginTop: 4 }} />
  </View>
);

export const ProfileSkeleton: React.FC = () => (
  <View style={sk.profileWrap}>
    <View style={sk.profileHero}>
      <SkeletonBox width={72} height={72} round />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="60%" height={16} />
        <SkeletonBox width="80%" height={11} />
        <SkeletonBox width="45%" height={11} />
      </View>
    </View>
    {[0, 1, 2, 3].map(i => (
      <View key={i} style={sk.profileRow}>
        <SkeletonBox width={36} height={36} round />
        <SkeletonBox width="70%" height={13} />
      </View>
    ))}
  </View>
);

// ── List skeleton helper ──────────────────────────────────────────────────────
export const MissionListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <MissionCardSkeleton key={i} />
    ))}
  </>
);

export const PaymentListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <PaymentRowSkeleton key={i} />
    ))}
  </>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const sk = StyleSheet.create({
  missionCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         14,
    marginBottom:    10,
    gap:             12,
  },
  missionRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  iconBox: { flexShrink: 0 },
  missionBody: { flex: 1, gap: 6 },
  missionFooter: {
    flexDirection:  'row',
    justifyContent: 'space-between',
  },

  paymentRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentBody: { flex: 1, gap: 6 },

  statCard: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    gap:             4,
  },

  profileWrap: { gap: 4 },
  profileHero: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             16,
    padding:         16,
    backgroundColor: colors.backgroundElevated,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    marginBottom:    16,
  },
  profileRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});

export { SkeletonBox };

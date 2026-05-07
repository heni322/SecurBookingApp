/**
 * Avatar — user image or initials fallback.
 * Senior UI: accepts numeric size for flexibility, gold initials ring,
 * online presence dot, supports string size presets.
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '@theme/colors';
import { radius } from '@theme/spacing';
import { fontFamily, fontSize } from '@theme/typography';
import { getInitials } from '@utils/formatters';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<AvatarSize, number> = {
  xs:  28,
  sm:  36,
  md:  48,
  lg:  64,
  xl:  80,
};

const FONT_MAP: Record<AvatarSize, number> = {
  xs:  fontSize.xs,
  sm:  fontSize.sm,
  md:  fontSize.base,
  lg:  fontSize.lg,
  xl:  fontSize.xl,
};

interface Props {
  /** Display name — used for initials fallback */
  name?:      string | null;
  /** Legacy prop alias */
  fullName?:  string | null;
  avatarUrl?: string;
  /** Named size or explicit pixel size */
  size?:      AvatarSize | number;
  online?:    boolean;
}

export const Avatar: React.FC<Props> = ({
  name, fullName,
  avatarUrl,
  size    = 'md',
  online  = false,
}) => {
  const displayName   = name ?? fullName ?? null;
  const safeAvatarUrl = avatarUrl?.trim() || null;

  // Resolve numeric size
  const dim      = typeof size === 'number' ? size : SIZE_MAP[size];
  const fontSz   = typeof size === 'number'
    ? Math.max(10, dim * 0.32)
    : FONT_MAP[size];
  const initials = getInitials(displayName);

  return (
    <View style={{ width: dim, height: dim }}>
      {safeAvatarUrl ? (
        <Image
          source={{ uri: safeAvatarUrl }}
          style={[
            styles.image,
            { width: dim, height: dim, borderRadius: dim / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: dim, height: dim, borderRadius: dim / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize: fontSz }]}>
            {initials}
          </Text>
        </View>
      )}

      {online && (
        <View
          style={[
            styles.onlineDot,
            {
              width:        Math.max(10, dim * 0.26),
              height:       Math.max(10, dim * 0.26),
              borderRadius: Math.max(5,  dim * 0.13),
              bottom:       0,
              right:        0,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    borderWidth: 1.5,
    borderColor: colors.borderPrimary,
  },
  placeholder: {
    backgroundColor: colors.primarySurface,
    borderWidth:     1.5,
    borderColor:     colors.borderPrimary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  initials: {
    color:      colors.primary,
    fontFamily: fontFamily.displayMedium,
  },
  onlineDot: {
    position:        'absolute',
    backgroundColor: colors.successDot,
    borderWidth:     2.5,
    borderColor:     colors.background,
    shadowColor:     colors.successDot,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.6,
    shadowRadius:    4,
    elevation:       2,
  },
});


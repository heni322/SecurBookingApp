/**
 * Avatar — affiche l'image ou les initiales de l'utilisateur.
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '@theme/colors';
import { radius } from '@theme/spacing';
import { fontFamily, fontSize } from '@theme/typography';
import { getInitials } from '@utils/formatters';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 60,
  xl: 80,
};

const FONT_MAP: Record<AvatarSize, number> = {
  xs: fontSize.xs,
  sm: fontSize.sm,
  md: fontSize.base,
  lg: fontSize.lg,
  xl: fontSize.xl,
};

interface AvatarProps {
  fullName:   string;
  avatarUrl?: string;
  size?:      AvatarSize;
  online?:    boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  fullName,
  avatarUrl,
  size    = 'md',
  online  = false,
}) => {
  const dim = SIZE_MAP[size];

  return (
    <View style={{ width: dim, height: dim }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: dim, height: dim, borderRadius: dim / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize: FONT_MAP[size] }]}>
            {getInitials(fullName)}
          </Text>
        </View>
      )}
      {online && (
        <View
          style={[
            styles.onlineDot,
            {
              width:        dim * 0.28,
              height:       dim * 0.28,
              borderRadius: (dim * 0.28) / 2,
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
    borderColor: colors.border,
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
    position:   'absolute',
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
});

/**
 * ScreenHeader — en-tête de screen avec titre, sous-titre et actions.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, type ViewStyle,
} from 'react-native';
import { colors } from '@theme/colors';
import { spacing, layout } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface Props {
  title:       string;
  subtitle?:   string;
  onBack?:     () => void;
  rightAction?: React.ReactNode;
  style?:      ViewStyle;
}

export const ScreenHeader: React.FC<Props> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  style,
}) => (
  <View style={[styles.container, style]}>
    <View style={styles.left}>
      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      )}
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>
    </View>
    {rightAction && <View style={styles.right}>{rightAction}</View>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    height:          layout.headerHeight,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor:  colors.background,
  },
  left: {
    flex:         1,
    flexDirection: 'row',
    alignItems:   'center',
    gap:          spacing[3],
  },
  backBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  backIcon: {
    fontSize: 18,
    color:    colors.textPrimary,
    lineHeight: 22,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize:   fontSize.md,
    color:      colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textSecondary,
    marginTop:  2,
  },
  right: {
    marginLeft: spacing[3],
  },
});

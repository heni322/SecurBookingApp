/**
 * ScreenHeader — refined nav header used on every screen.
 * Senior UI: taller touch target, polished back button, status-aware subtitle.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, type ViewStyle,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface Props {
  title:         string;
  subtitle?:     string;
  onBack?:       () => void;
  showBack?:     boolean;
  /** Slot on the right side of the header */
  rightAction?:  React.ReactNode;
  /** Alias for rightAction — use either */
  rightElement?: React.ReactNode;
  style?:        ViewStyle;
  /** Show a thin gold accent line under the header */
  accent?:       boolean;
}

export const ScreenHeader: React.FC<Props> = ({
  title, subtitle,
  onBack, showBack,
  rightAction,
  rightElement,
  style,
  accent = false,
}) => {
  const renderBack  = showBack !== false && !!onBack;
  const rightSlot   = rightAction ?? rightElement;

  return (
    <View style={[styles.container, accent && styles.containerAccent, style]}>
      <View style={styles.left}>
        {renderBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color={colors.textPrimary} strokeWidth={2.4} />
          </TouchableOpacity>
        )}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>
      </View>
      {rightSlot && <View style={styles.right}>{rightSlot}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height:            layout.headerHeight + 4,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor:   colors.background,
  },
  containerAccent: {
    borderBottomColor: colors.borderPrimary,
    borderBottomWidth: 1.5,
  },

  left:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  right: { marginLeft: spacing[3] },

  backBtn: {
    width:           36,
    height:          36,
    borderRadius:    radius.lg,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },

  titleWrap: { flex: 1 },
  title: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.md,
    color:         colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textSecondary,
    marginTop:  2,
  },
});

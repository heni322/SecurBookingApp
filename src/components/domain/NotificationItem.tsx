/**
 * NotificationItem — ligne de notification avec statut lu/non-lu.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors }  from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { formatDate } from '@utils/formatters';
import type { AppNotification } from '@models/index';

const TYPE_ICON: Record<string, string> = {
  MISSION_PUBLISHED:   '📢',
  BOOKING_ASSIGNED:    '✅',
  BOOKING_CHECKIN:     '📍',
  BOOKING_CHECKOUT:    '🏁',
  PAYMENT_CONFIRMED:   '💳',
  INCIDENT_REPORTED:   '⚠️',
  RATING_RECEIVED:     '⭐',
  DOCUMENT_APPROVED:   '📄',
  DOCUMENT_REJECTED:   '❌',
};

interface Props {
  notification: AppNotification;
  onPress:      () => void;
}

export const NotificationItem: React.FC<Props> = ({ notification, onPress }) => {
  const icon = TYPE_ICON[notification.type] ?? '🔔';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, !notification.isRead && styles.unread]}
    >
      <View style={[styles.iconBubble, !notification.isRead && styles.iconBubbleActive]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.title, !notification.isRead && styles.titleBold]} numberOfLines={1}>
            {notification.title}
          </Text>
          {!notification.isRead && <View style={styles.dot} />}
        </View>
        <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
        <Text style={styles.date}>{formatDate(notification.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    paddingHorizontal: spacing[5],
    paddingVertical:   spacing[4],
    gap:             spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  unread: {
    backgroundColor: colors.primarySurface,
  },
  iconBubble: {
    width:           42,
    height:          42,
    borderRadius:    radius.lg,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  iconBubbleActive: {
    borderColor:     colors.borderPrimary,
    backgroundColor: colors.primarySurface,
  },
  iconText:  { fontSize: 20 },
  content:   { flex: 1, gap: spacing[1] },
  topRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.base,
    color:      colors.textSecondary,
    flex:       1,
  },
  titleBold: {
    color:      colors.textPrimary,
    fontFamily: fontFamily.bodySemiBold,
  },
  dot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: colors.primary,
    marginLeft:      spacing[2],
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
    lineHeight: fontSize.sm * 1.55,
  },
  date: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
});

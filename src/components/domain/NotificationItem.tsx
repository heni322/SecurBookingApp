/**
 * NotificationItem — ligne de notification avec statut lu/non-lu.
 * Icônes : lucide-react-native (fallback emoji pour les types non couverts)
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Megaphone, CheckCircle2, MapPin, LogOut,
  CreditCard, AlertTriangle, Star, FileCheck,
  XCircle, Bell,
} from 'lucide-react-native';
import { colors }  from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { formatDate } from '@utils/formatters';
import type { AppNotification } from '@models/index';

type LucideIconComp = React.FC<{ size: number; color: string; strokeWidth: number }>;

interface NotifMeta {
  Icon:    LucideIconComp;
  color:   string;
  bgColor: string;
}

const TYPE_META: Record<string, NotifMeta> = {
  MISSION_PUBLISHED: { Icon: Megaphone,    color: colors.primary,  bgColor: colors.primarySurface },
  BOOKING_ASSIGNED:  { Icon: CheckCircle2, color: colors.success,  bgColor: colors.successSurface },
  BOOKING_CHECKIN:   { Icon: MapPin,       color: colors.info,     bgColor: colors.infoSurface    },
  BOOKING_CHECKOUT:  { Icon: LogOut,       color: colors.primary,  bgColor: colors.primarySurface },
  PAYMENT_CONFIRMED: { Icon: CreditCard,   color: colors.success,  bgColor: colors.successSurface },
  INCIDENT_REPORTED: { Icon: AlertTriangle,color: colors.warning,  bgColor: colors.warningSurface },
  RATING_RECEIVED:   { Icon: Star,         color: '#EAB308',       bgColor: '#713F1215'            },
  DOCUMENT_APPROVED: { Icon: FileCheck,    color: colors.success,  bgColor: colors.successSurface },
  DOCUMENT_REJECTED: { Icon: XCircle,      color: colors.danger,   bgColor: colors.dangerSurface  },
};

const DEFAULT_META: NotifMeta = {
  Icon:    Bell,
  color:   colors.primary,
  bgColor: colors.primarySurface,
};

interface Props {
  notification: AppNotification;
  onPress:      () => void;
}

export const NotificationItem: React.FC<Props> = ({ notification, onPress }) => {
  const meta = TYPE_META[notification.type] ?? DEFAULT_META;
  const { Icon, color, bgColor } = meta;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, !notification.isRead && styles.unread]}
    >
      <View style={[styles.iconBubble, { backgroundColor: bgColor, borderColor: color + '44' }]}>
        <Icon size={20} color={color} strokeWidth={1.8} />
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
    flexDirection:     'row',
    alignItems:        'flex-start',
    paddingHorizontal: spacing[5],
    paddingVertical:   spacing[4],
    gap:               spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor:   colors.background,
  },
  unread:    { backgroundColor: colors.primarySurface },
  iconBubble: {
    width:          42,
    height:         42,
    borderRadius:   radius.lg,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  content:   { flex: 1, gap: spacing[1] },
  topRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.base,
    color:      colors.textSecondary,
    flex:       1,
  },
  titleBold: { color: colors.textPrimary, fontFamily: fontFamily.bodySemiBold },
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

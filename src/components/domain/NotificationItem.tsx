/**
 * NotificationItem — notification row with read/unread state.
 * Icons cover all backend notification types.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Megaphone, CheckCircle2, MapPin, LogOut, LogIn,
  CreditCard, AlertTriangle, Star, FileCheck,
  XCircle, Bell, FileText, ShieldCheck, ShieldOff,
  Flag, Clock, UserCheck,
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
  // Mission lifecycle
  MISSION_PUBLISHED:        { Icon: Megaphone,    color: colors.primary,  bgColor: colors.primarySurface  },
  MISSION_AVAILABLE:        { Icon: Megaphone,    color: colors.primary,  bgColor: colors.primarySurface  },
  MISSION_CANCELLED:        { Icon: XCircle,      color: colors.danger,   bgColor: colors.dangerSurface   },
  MISSION_REPORT_READY:     { Icon: FileText,     color: colors.info,     bgColor: colors.infoSurface     },

  // Booking lifecycle
  BOOKING_ASSIGNED:         { Icon: CheckCircle2, color: colors.success,  bgColor: colors.successSurface  },
  BOOKING_CANCELLED:        { Icon: XCircle,      color: colors.danger,   bgColor: colors.dangerSurface   },
  BOOKING_FORCE_CHECKOUT:   { Icon: LogOut,       color: colors.warning,  bgColor: colors.warningSurface  },

  // Agent presence
  AGENT_CHECKED_IN:         { Icon: LogIn,        color: colors.success,  bgColor: colors.successSurface  },
  AGENT_CHECKED_OUT:        { Icon: LogOut,       color: colors.primary,  bgColor: colors.primarySurface  },
  AGENT_LOCATION_UPDATE:    { Icon: MapPin,       color: colors.info,     bgColor: colors.infoSurface     },

  // Legacy check-in/out names
  BOOKING_CHECKIN:          { Icon: LogIn,        color: colors.success,  bgColor: colors.successSurface  },
  BOOKING_CHECKOUT:         { Icon: LogOut,       color: colors.primary,  bgColor: colors.primarySurface  },

  // Payment
  PAYMENT_CONFIRMED:        { Icon: CreditCard,   color: colors.success,  bgColor: colors.successSurface  },
  PAYMENT_FAILED:           { Icon: CreditCard,   color: colors.danger,   bgColor: colors.dangerSurface   },
  PAYMENT_PENDING:          { Icon: Clock,        color: colors.warning,  bgColor: colors.warningSurface  },
  PAYMENT_PROCESSING:       { Icon: Clock,        color: colors.info,     bgColor: colors.infoSurface     },

  // Incidents & disputes
  INCIDENT_REPORTED:        { Icon: AlertTriangle,color: colors.warning,  bgColor: colors.warningSurface  },

  // Ratings
  RATING_RECEIVED:          { Icon: Star,         color: colors.primary,  bgColor: colors.primarySurface  },
  RATING_REQUESTED:         { Icon: Star,         color: colors.primary,  bgColor: colors.primarySurface  },

  // Documents
  DOCUMENT_APPROVED:        { Icon: FileCheck,    color: colors.success,  bgColor: colors.successSurface  },
  DOCUMENT_REJECTED:        { Icon: XCircle,      color: colors.danger,   bgColor: colors.dangerSurface   },
  DOCUMENT_SUBMITTED:       { Icon: FileText,     color: colors.info,     bgColor: colors.infoSurface     },
  DOCUMENT_EXPIRING:        { Icon: Clock,        color: colors.warning,  bgColor: colors.warningSurface  },
  DOCUMENT_EXPIRING_URGENT: { Icon: Clock,        color: colors.danger,   bgColor: colors.dangerSurface   },
  DOCUMENT_EXPIRED:         { Icon: XCircle,      color: colors.danger,   bgColor: colors.dangerSurface   },

  // Account
  ACCOUNT_SUSPENDED:        { Icon: ShieldOff,    color: colors.danger,   bgColor: colors.dangerSurface   },
  ACCOUNT_ACTIVATED:        { Icon: ShieldCheck,  color: colors.success,  bgColor: colors.successSurface  },
  PROFILE_ACTIVATED:        { Icon: UserCheck,    color: colors.success,  bgColor: colors.successSurface  },

  // SOS
  SOS_ALERT:                { Icon: Flag,         color: colors.danger,   bgColor: colors.dangerSurface   },
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

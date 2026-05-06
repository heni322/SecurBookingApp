/**
 * DisputeScreen — client dispute opening after a mission.
 * 6 predefined reasons · Free-form description · 48h admin review
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView,
  TextInput, TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AlertTriangle, CheckCircle2,
  UserX, Clock, ThumbsDown, ReceiptEuro, Ban, ClipboardList,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScreenHeader }   from '@components/ui/ScreenHeader';
import { Button }         from '@components/ui/Button';
import { Card }           from '@components/ui/Card';
import { colors }         from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import apiClient from '@api/client';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'Dispute'>;
type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;
type ReasonId = 'agent_absent' | 'agent_late' | 'quality' | 'billing' | 'behavior' | 'other';

const REASON_ICONS: Record<ReasonId, { Icon: LucideIcon; color: string }> = {
  agent_absent: { Icon: UserX,         color: colors.danger   },
  agent_late:   { Icon: Clock,         color: colors.warning  },
  quality:      { Icon: ThumbsDown,    color: colors.warning  },
  billing:      { Icon: ReceiptEuro,   color: colors.info     },
  behavior:     { Icon: Ban,           color: colors.danger   },
  other:        { Icon: ClipboardList, color: colors.textMuted },
};

const REASON_IDS: ReasonId[] = ['agent_absent', 'agent_late', 'quality', 'billing', 'behavior', 'other'];

export default function DisputeScreen({ navigation, route }: Props) {
  const { missionId, bookingId, missionTitle } = route.params;
  const { t } = useTranslation('dispute');
  const { t: tc } = useTranslation('common');

  const [reason, setReason] = useState<ReasonId | ''>('');
  const [desc,   setDesc]   = useState('');
  const [busy,   setBusy]   = useState(false);
  const [done,   setDone]   = useState(false);

  const canSubmit = reason !== '' && desc.trim().length >= 20;

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert(t('errors.reason_required_title'), t('errors.reason_required_body'));
      return;
    }
    if (desc.trim().length < 20) {
      Alert.alert(t('errors.desc_too_short_title'), t('errors.desc_too_short_body'));
      return;
    }
    setBusy(true);
    try {
      await apiClient.post('/disputes', {
        missionId,
        ...(bookingId ? { bookingId } : {}),
        reason,
        description: desc.trim(),
      });
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('errors.generic');
      Alert.alert(tc('error'), msg);
    } finally {
      setBusy(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('done_title')} />
        <View style={styles.center}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={52} color={colors.success} strokeWidth={1.5} />
          </View>
          <Text style={styles.doneTitle}>{t('done_title')}</Text>
          <Text style={styles.doneSub}>
            {t('done_subtitle')}
          </Text>
          <Button
            label={t('back_btn')}
            onPress={() => navigation.popToTop()}
            fullWidth
            size="lg"
            style={styles.doneBtn}
          />
        </View>
      </View>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('screen_title')}
        subtitle={missionTitle}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <AlertTriangle size={16} color={colors.info} strokeWidth={2} />
          <Text style={styles.infoText}>
            {t('info_banner')}
          </Text>
        </View>

        {/* Reason picker */}
        <Text style={styles.sectionLabel}>{t('reason_label')}</Text>
        {REASON_IDS.map((id) => {
          const { Icon, color } = REASON_ICONS[id];
          const active = reason === id;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.reasonCard, active && styles.reasonCardOn]}
              onPress={() => setReason(id)}
              activeOpacity={0.75}
            >
              <View style={[styles.reasonIconWrap, { backgroundColor: active ? colors.primarySurface : colors.surface }]}>
                <Icon size={18} color={active ? colors.primary : color} strokeWidth={1.8} />
              </View>
              <View style={styles.reasonText}>
                <Text style={[styles.reasonLabel, active && styles.reasonLabelOn]}>
                  {t(`reasons.${id}.label` as any)}
                </Text>
                <Text style={styles.reasonDesc}>
                  {t(`reasons.${id}.desc` as any)}
                </Text>
              </View>
              {active && <View style={styles.reasonCheck} />}
            </TouchableOpacity>
          );
        })}

        {/* Description */}
        <Text style={styles.sectionLabel}>{t('description_label')}</Text>
        <Card style={styles.textareaCard}>
          <TextInput
            style={styles.textarea}
            placeholder={t('form.description_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={desc}
            onChangeText={setDesc}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={600}
          />
          <View style={styles.textareaFooter}>
            <Text style={styles.charCount}>{desc.length} / 600</Text>
            {desc.trim().length > 0 && desc.trim().length < 20 && (
              <Text style={styles.charWarning}>{t('errors.desc_too_short_body')}</Text>
            )}
          </View>
        </Card>

        {/* Actions */}
        <Button
          label={busy ? t('submitting') : t('submit')}
          onPress={handleSubmit}
          loading={busy}
          disabled={!canSubmit}
          fullWidth
          size="lg"
          style={styles.submitBtn}
        />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelTxt}>{tc('cancel')}</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], gap: spacing[4] },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingH, gap: spacing[4],
  },
  successIcon: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: colors.successSurface,
    borderWidth: 2, borderColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing[2],
  },
  doneTitle: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4, textAlign: 'center' },
  doneSub:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: fontSize.sm * 1.6 },
  doneBtn:   { marginTop: spacing[2] },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3],
    backgroundColor: colors.infoSurface,
    borderRadius: radius.lg, padding: spacing[4],
    borderWidth: 1, borderColor: colors.info,
  },
  infoText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.info, lineHeight: fontSize.sm * 1.6 },

  sectionLabel: {
    fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm,
    color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
  },

  reasonCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing[4], borderWidth: 1.5, borderColor: colors.border,
  },
  reasonCardOn:   { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  reasonIconWrap: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, flexShrink: 0,
  },
  reasonText:    { flex: 1 },
  reasonLabel:   { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textSecondary },
  reasonLabelOn: { color: colors.primary },
  reasonDesc:    { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  reasonCheck:   { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, flexShrink: 0 },

  textareaCard: { padding: 0, overflow: 'hidden', backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  textarea: {
    fontFamily: fontFamily.body, fontSize: fontSize.base,
    color: colors.textPrimary, minHeight: 140,
    padding: spacing[4], lineHeight: fontSize.base * 1.6,
  },
  textareaFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingBottom: spacing[3],
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing[2],
  },
  charCount:   { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textMuted },
  charWarning: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.warning },

  submitBtn: {},
  cancelBtn: { alignItems: 'center', padding: spacing[3] },
  cancelTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },
});

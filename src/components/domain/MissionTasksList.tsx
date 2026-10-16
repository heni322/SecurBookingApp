/**
 * MissionTasksList — tâches commandées (snapshot), regroupées par service.
 * C'est le contenu contractuel de la mission ; les observations ne le sont pas.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '@i18n';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import type { MissionServiceTask } from '@models/index';

interface Props {
  tasks?: MissionServiceTask[];
  /** Nom des services, par id (issu des bookings de la mission). */
  serviceNames: Record<string, string>;
  /** Limite l'affichage à un service (vue agent : son poste). */
  serviceTypeId?: string;
}

export function MissionTasksList({ tasks, serviceNames, serviceTypeId }: Props) {
  const { t, i18n } = useTranslation('mission_tasks');
  const en = i18n.language?.startsWith('en');
  const list = (tasks ?? []).filter(task => !serviceTypeId || task.serviceTypeId === serviceTypeId);
  if (list.length === 0) return <Text style={styles.muted}>{t('detail_empty')}</Text>;

  const services = [...new Set(list.map(task => task.serviceTypeId))];
  return (
    <View style={styles.wrap}>
      {services.map(sid => (
        <View key={sid} style={styles.group}>
          {!serviceTypeId && services.length > 1 ? (
            <Text style={styles.service}>{serviceNames[sid] ?? ''}</Text>
          ) : null}
          {list.filter(task => task.serviceTypeId === sid).map(task => {
            const pending = task.adminValidation === 'PENDING' || task.prefectoralValidation === 'PENDING';
            const rejected = task.adminValidation === 'REJECTED' || task.prefectoralValidation === 'REJECTED';
            return (
              <Text key={task.code} style={styles.task}>
                ✓ {en ? task.labelEn : task.labelFr}
                {pending ? <Text style={styles.warn}>{`  · ${t('status_pending')}`}</Text> : null}
                {rejected ? <Text style={styles.warn}>{`  · ${t('status_rejected')}`}</Text> : null}
              </Text>
            );
          })}
        </View>
      ))}
      <Text style={styles.muted}>{t('contract_notice')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { gap: spacing[3] },
  group:   { gap: spacing[1] },
  service: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  task:    { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  warn:    { color: colors.warning, fontSize: 12 },
  muted:   { color: colors.textMuted, fontSize: 12 },
});

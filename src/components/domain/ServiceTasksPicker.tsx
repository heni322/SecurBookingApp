/**
 * ServiceTasksPicker — tâches attendues, par prestation.
 *
 * Pour chaque service présent dans les créneaux, le client coche les tâches
 * parmi celles DE CE SERVICE (catalogue GET /service-tasks), puis lit « Ce
 * que l’agent ne fait pas ». La validation qui fait foi est côté API.
 *
 * Un service retiré des créneaux disparaît de la liste ; ses tâches ne sont
 * pas envoyées (voir `toServiceTasksPayload`).
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@i18n';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { serviceTasksApi } from '@api/endpoints/serviceTasks';
import type { TaskCatalogEntry } from '@models/index';

interface Props {
  serviceTypeIds: string[];
  value: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
}

export function toServiceTasksPayload(
  value: Record<string, string[]>,
  serviceTypeIds: string[],
): Array<{ serviceTypeId: string; taskCodes: string[] }> {
  return [...new Set(serviceTypeIds)]
    .map(serviceTypeId => ({ serviceTypeId, taskCodes: [...new Set(value[serviceTypeId] ?? [])] }))
    .filter(s => s.taskCodes.length > 0);
}

export function ServiceTasksPicker({ serviceTypeIds, value, onChange }: Props) {
  const { t, i18n } = useTranslation('mission_tasks');
  const en = i18n.language?.startsWith('en');
  const [catalog, setCatalog] = useState<TaskCatalogEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const key = [...new Set(serviceTypeIds)].sort().join(',');

  useEffect(() => {
    if (!key) { setCatalog([]); return; }
    let alive = true;
    setFailed(false);
    serviceTasksApi
      .catalog(key.split(','))
      .then(({ data }) => {
        if (!alive) return;
        // Enveloppe { success, data } de l'API, ou tableau nu selon l'intercepteur.
        const body = data as unknown as { data?: TaskCatalogEntry[] } | TaskCatalogEntry[];
        setCatalog(Array.isArray(body) ? body : body?.data ?? []);
      })
      .catch(() => { if (alive) { setCatalog([]); setFailed(true); } });
    return () => { alive = false; };
  }, [key]);

  if (!key) return <Text style={styles.muted}>{t('no_service')}</Text>;
  if (catalog === null) {
    return (
      <View style={styles.row}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={styles.muted}>{t('loading')}</Text>
      </View>
    );
  }
  // Catalogue indisponible : la commande reste possible (service seul).
  if (failed || catalog.length === 0) return null;

  const toggle = (serviceTypeId: string, code: string) => {
    const current = value[serviceTypeId] ?? [];
    onChange({
      ...value,
      [serviceTypeId]: current.includes(code) ? current.filter(c => c !== code) : [...current, code],
    });
  };

  const needsValidation = catalog.some(e =>
    e.tasks.some(task =>
      (value[e.serviceType.id] ?? []).includes(task.code) &&
      (task.requiresAdminValidation || task.requiresPrefectoralAuthorization)),
  );

  return (
    <View style={styles.wrap}>
      {catalog.map(entry => (
        <View key={entry.serviceType.id} style={styles.service}>
          <Text style={styles.serviceName}>{entry.serviceType.name}</Text>
          {entry.tasks.length === 0 ? (
            <Text style={styles.muted}>{t('no_task')}</Text>
          ) : (
            <View style={styles.chips}>
              {entry.tasks.map(task => {
                const on = (value[entry.serviceType.id] ?? []).includes(task.code);
                const suffix = task.requiresPrefectoralAuthorization
                  ? ` · ${t('prefectoral')}`
                  : task.requiresAdminValidation ? ` · ${t('on_validation')}` : '';
                return (
                  <TouchableOpacity
                    key={task.code}
                    onPress={() => toggle(entry.serviceType.id, task.code)}
                    activeOpacity={0.8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityHint={(en ? task.descriptionEn : task.descriptionFr) ?? undefined}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {on ? '✓ ' : ''}{en ? task.labelEn : task.labelFr}{suffix}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {entry.exclusions.length > 0 ? (
            <View style={styles.exclusions}>
              <Text style={styles.exclusionsTitle}>{t('exclusions_title')}</Text>
              {entry.exclusions.map(e => (
                <Text key={e.code} style={styles.exclusion}>• {en ? e.labelEn : e.labelFr}</Text>
              ))}
            </View>
          ) : null}
        </View>
      ))}
      <Text style={styles.notice}>{t('contract_notice')}</Text>
      {needsValidation ? <Text style={styles.notice}>{t('validation_notice')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:            { gap: spacing[4] },
  row:             { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  service:         { gap: spacing[2] },
  serviceName:     { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  chips:           { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip:            {
    borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: 999,
    paddingHorizontal: spacing[3], paddingVertical: 6,
  },
  chipOn:          { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  chipText:        { color: colors.textSecondary, fontSize: 13 },
  chipTextOn:      { color: colors.textPrimary },
  exclusions:      {
    borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: 10,
    padding: spacing[3], gap: 2,
  },
  exclusionsTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  exclusion:       { color: colors.textMuted, fontSize: 12 },
  notice:          { color: colors.textMuted, fontSize: 12 },
  muted:           { color: colors.textMuted, fontSize: 13 },
});

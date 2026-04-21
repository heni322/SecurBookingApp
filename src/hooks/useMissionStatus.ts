/**
 * useMissionStatus — returns the i18n label + semantic color for any MissionStatus value.
 *
 * Usage:
 *   const { label, color } = useMissionStatus(mission.status);
 *
 * Labels come from missions.statuses.* so they react to locale changes automatically.
 * Colors come from MISSION_STATUS_COLOR (theme-aware, not locale-aware).
 */
import { useTranslation } from '@i18n';
import { MISSION_STATUS_COLOR } from '@utils/statusHelpers';
import { colors } from '@theme/colors';
import type { MissionStatus } from '@constants/enums';

const STATUS_KEY_MAP: Record<string, string> = {
  CREATED:     'created',
  PUBLISHED:   'published',
  STAFFING:    'staffing',
  STAFFED:     'staffed',
  IN_PROGRESS: 'in_progress',
  COMPLETED:   'completed',
  CANCELLED:   'cancelled',
};

export function useMissionStatus(status: string): { label: string; color: string } {
  const { t } = useTranslation('missions');
  const key   = STATUS_KEY_MAP[status];
  const label = key ? t(`statuses.${key}` as any) : status;
  const color = MISSION_STATUS_COLOR[status] ?? colors.textMuted;
  return { label, color };
}
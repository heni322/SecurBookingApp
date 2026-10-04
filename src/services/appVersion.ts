import { Platform } from 'react-native';
import { config } from '@config';
import { useAppUpdateStore, type UpdateRequirement } from '@store/appUpdateStore';

const APP_VERSION = config.appVersion;

/**
 * App identity sent on every request, and the update-required handling
 * (pre-launch audit 2026-10-02, H9). The API answers 426 APP_UPDATE_REQUIRED
 * when this build is older than APP_MIN_VERSION_CLIENT.
 */
export const APP_ID = 'client';

export function appVersionHeaders(): Record<string, string> {
  return {
    'x-app-name': APP_ID,
    'x-app-version': APP_VERSION,
    'x-app-platform': Platform.OS,
  };
}

/** "1.4.2" → [1, 4, 2]; null when not a version number. */
export function parseVersion(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  const core = String(raw).trim().replace(/^v/i, '').split(/[-+ ]/)[0];
  return /^\d+(\.\d+){0,3}$/.test(core) ? core.split('.').map(Number) : null;
}

/** True when `current` is strictly older than `min`. False if either is unreadable. */
export function isOlderThan(current: string, min: string | null | undefined): boolean {
  const a = parseVersion(current);
  const b = parseVersion(min);
  if (!a || !b) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d < 0;
  }
  return false;
}

/** Reads a 426 body; null when it is not an update-required answer. */
export function updateRequirementFrom(status: number | undefined, body: unknown): UpdateRequirement | null {
  if (status !== 426 || !body || typeof body !== 'object') return null;
  const b = body as { code?: unknown; minVersion?: unknown; storeUrl?: unknown };
  if (b.code !== 'APP_UPDATE_REQUIRED') return null;
  return {
    minVersion: typeof b.minVersion === 'string' ? b.minVersion : '',
    storeUrl: typeof b.storeUrl === 'string' && b.storeUrl ? b.storeUrl : null,
  };
}

export function reportUpdateRequired(status: number | undefined, body: unknown): boolean {
  const requirement = updateRequirementFrom(status, body);
  if (!requirement) return false;
  useAppUpdateStore.getState().setRequired(requirement);
  return true;
}

interface PolicyRule {
  minVersion: string | null;
  storeUrls?: { android?: string | null; ios?: string | null };
}

/**
 * Launch-time check against GET /app/version-policy, so a signed-out user on
 * the login screen sees the update screen before typing anything. Network
 * failures are ignored: the 426 on the next request covers that case.
 */
export async function checkVersionPolicy(
  fetchPolicy: () => Promise<unknown>,
): Promise<void> {
  try {
    const raw = (await fetchPolicy()) as { data?: unknown } | null;
    const policy = ((raw && 'data' in raw ? raw.data : raw) ?? {}) as Record<string, PolicyRule>;
    const rule = policy[APP_ID];
    if (!rule?.minVersion || !isOlderThan(APP_VERSION, rule.minVersion)) return;
    const os = Platform.OS === 'ios' ? 'ios' : 'android';
    useAppUpdateStore.getState().setRequired({
      minVersion: rule.minVersion,
      storeUrl: rule.storeUrls?.[os] ?? null,
    });
  } catch {
    // Offline or API down: nothing to decide here.
  }
}

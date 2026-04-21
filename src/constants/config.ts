import { Platform } from 'react-native';

// ─── API Base URL ─────────────────────────────────────────────────────────────
// Dev host strategy (pick ONE):
//
//  A) USB (recommended) — run once per session:
//       adb reverse tcp:3000 tcp:3000
//     DEV_HOST = 'localhost'                    <- active
//
//  B) Wi-Fi — set to your machine's Wi-Fi IP:
//     DEV_HOST = '192.168.1.15'               <- your current Wi-Fi IP
//
//  C) Android emulator (no USB):
//     DEV_HOST = '10.0.2.2'
const DEV_HOST = '192.168.1.15';
export const API_BASE_URL = __DEV__
  ? `http://${DEV_HOST}:3000/api/v1`
  : 'https://api.securbooking.com/api/v1';

export const API_TIMEOUT = 15_000;

// ─── Pagination ───────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;

// ─── Cache (stale times in ms) ────────────────────────────────────────────────
export const STALE_TIME = {
  SHORT:  2 * 60 * 1000,   // 2 min  — disponibilités, devis
  MEDIUM: 5 * 60 * 1000,   // 5 min  — profils, missions
  LONG:   10 * 60 * 1000,  // 10 min — service-types, pricing-rules
} as const;

// ─── GPS ──────────────────────────────────────────────────────────────────────
export const CHECKIN_RADIUS_METERS = 30; // rayon toléré pour le check-in

// ─── App ─────────────────────────────────────────────────────────────────────
export const APP_NAME    = 'SecurBook';
export const APP_VERSION = '1.0.0';

import apiClient from '@api/client';
import type { ApiResponse } from '@models/index';

/**
 * Geocoding API — calls the SecurBooking backend, which proxies the official
 * French government geocoding services (IGN Géoplateforme / BAN and the
 * gouv.fr commune referential). The app no longer calls OpenStreetMap Nominatim
 * directly: routing through our own backend gives official French street-level
 * data, server-side caching, a single consistent address shape, and no exposure
 * to any third-party rate limit or usage policy.
 *
 * Response shape mirrors the backend GeocodingResult (see GeocodingController).
 */
export interface GeocodingResult {
  /** Full human-readable address, e.g. "12 Rue de la Paix 75002 Paris". */
  displayName: string;
  /** Street-level short form, e.g. "12 Rue de la Paix". */
  shortName: string;
  city: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  /** Stable BAN identifier (housenumber/street id). */
  placeId: string;
}

export const geocodingApi = {
  /**
   * Forward address search (BAN, France). Min 3 chars enforced server-side.
   * @param q     free-text query
   * @param limit max results (server caps at 10)
   */
  searchAddress: (q: string, limit = 6) =>
    apiClient.get<ApiResponse<GeocodingResult[]>>('/geocoding/address', {
      params: { q, limit },
    }),

  /**
   * Reverse geocode coordinates → nearest address (BAN, France).
   * Returns null in `data` when no address is found.
   */
  reverseGeocode: (lat: number, lng: number) =>
    apiClient.get<ApiResponse<GeocodingResult | null>>('/geocoding/reverse', {
      params: { lat, lng },
    }),
};

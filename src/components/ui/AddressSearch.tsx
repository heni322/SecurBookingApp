/**
 * AddressSearch — French address autocomplete via the SecurBooking backend.
 *
 * The backend proxies the official IGN Géoplateforme / BAN address service
 * (data.geopf.fr) — the app no longer calls OpenStreetMap Nominatim directly.
 * This gives official French street-level data, server-side caching, and no
 * third-party rate-limit exposure.
 *
 * Backward compatibility: this component still emits a `NominatimResult`-shaped
 * object via onSelect so existing consumers (MissionCreateScreen) need no
 * changes. The backend's GeocodingResult is adapted into that shape internally.
 *
 * Debounced 400ms · min 3 chars · max 6 results.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Search, MapPin, X } from 'lucide-react-native';
import { geocodingApi, type GeocodingResult } from '@api/endpoints/geocoding';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { useTranslation } from '@i18n';

/**
 * Public result shape kept stable for backward compatibility with existing
 * consumers. Historically this mirrored OSM Nominatim; it is now populated from
 * the backend BAN result via adaptGeocodingResult(). The nested `address`
 * fields a consumer may read (road, house_number, city, postcode…) are filled
 * on a best-effort basis from the BAN short name + city + zip.
 */
export interface NominatimResult {
  place_id:    number;
  display_name: string;
  address: {
    road?:          string;
    house_number?:  string;
    suburb?:        string;
    city?:          string;
    town?:          string;
    village?:       string;
    county?:        string;
    postcode?:      string;
    country?:       string;
    country_code?:  string;
  };
  lat: string;
  lon: string;
}

interface Props {
  value:       string;
  onSelect:    (result: NominatimResult) => void;
  placeholder?: string;
  error?:      string;
  countrycodes?: string; // accepted for API compatibility; BAN is France-only
}

// ── BAN → NominatimResult adapter ─────────────────────────────────────────────
/**
 * Split a BAN shortName ("12 Rue de la Paix") into house number + road so that
 * consumers reading `address.house_number` / `address.road` keep working.
 */
function splitShortName(shortName: string): { house_number?: string; road?: string } {
  const m = /^\s*(\d+[a-zA-Z]?(?:\s*(?:bis|ter|quater))?)\s+(.*)$/.exec(shortName);
  if (m) return { house_number: m[1].trim(), road: m[2].trim() };
  return { road: shortName.trim() || undefined };
}

/** Convert a backend GeocodingResult into the legacy NominatimResult shape. */
function adaptGeocodingResult(r: GeocodingResult, idx: number): NominatimResult {
  const { house_number, road } = splitShortName(r.shortName);
  return {
    // BAN placeId is a string; consumers only use it as a React key, so we hash
    // to a stable numeric fallback when it isn't numeric.
    place_id: Number.isFinite(Number(r.placeId)) ? Number(r.placeId) : idx + 1,
    display_name: r.displayName,
    address: {
      road,
      house_number,
      city: r.city || undefined,
      postcode: r.zipCode || undefined,
      country: r.country || undefined,
      country_code: 'fr',
    },
    lat: String(r.latitude),
    lon: String(r.longitude),
  };
}

export const AddressSearch: React.FC<Props> = ({
  value,
  onSelect,
  placeholder,
  error,
  // countrycodes is accepted for API compatibility but unused: the backend
  // BAN service is France-only.
  countrycodes: _countrycodes,
}) => {
  const { t } = useTranslation('common');
  const [query,    setQuery]    = useState(value);
  const [results,  setResults]  = useState<NominatimResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const [selected, setSelected] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against out-of-order responses: only the latest query may render.
  const reqIdRef = useRef(0);

  const search = useCallback(async (text: string) => {
    if (text.length < 3) { setResults([]); setOpen(false); return; }
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const res = await geocodingApi.searchAddress(text, 6);
      if (reqId !== reqIdRef.current) return; // a newer query superseded this one
      const raw = res.data.data ?? [];
      const adapted = raw.map(adaptGeocodingResult);
      setResults(adapted);
      setOpen(adapted.length > 0);
    } catch {
      if (reqId !== reqIdRef.current) return;
      setResults([]);
      setOpen(false);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, []);

  const handleChange = (text: string) => {
    setQuery(text);
    setSelected(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 400);
  };

  const handleSelect = (item: NominatimResult) => {
    const label = buildLabel(item);
    setQuery(label);
    setSelected(true);
    setOpen(false);
    setResults([]);
    onSelect(item);
  };

  const handleClear = () => {
    setQuery('');
    setSelected(false);
    setResults([]);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, error && styles.labelError]}>Adresse *</Text>

      {/* Input row */}
      <View style={[
        styles.inputRow,
        open           && styles.inputRowOpen,
        error          && styles.inputRowError,
        selected       && styles.inputRowSelected,
      ]}>
        <Search size={16} color={selected ? colors.success : colors.textMuted} strokeWidth={1.8} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleChange}
          placeholder={placeholder ?? t('search_address')}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          selectionColor={colors.primary}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
        {!loading && query.length > 0 && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={14} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((item, idx) => (
            <TouchableOpacity
              key={item.place_id}
              style={[styles.resultItem, idx < results.length - 1 && styles.resultDivider]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.75}
            >
              <MapPin size={13} color={colors.primary} strokeWidth={1.8} style={styles.resultIcon} />
              <View style={styles.resultText}>
                <Text style={styles.resultMain} numberOfLines={1}>{buildShortLabel(item)}</Text>
                <Text style={styles.resultSub}  numberOfLines={1}>{buildSubLabel(item)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLabel(item: NominatimResult): string {
  const a = item.address;
  const parts = [
    a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
    a.postcode,
    a.city ?? a.town ?? a.village,
  ].filter(Boolean);
  return parts.join(', ') || item.display_name.split(',').slice(0, 3).join(',');
}

function buildShortLabel(item: NominatimResult): string {
  const a = item.address;
  return a.house_number && a.road
    ? `${a.house_number} ${a.road}`
    : a.road ?? item.display_name.split(',')[0];
}

function buildSubLabel(item: NominatimResult): string {
  const a = item.address;
  return [a.postcode, a.city ?? a.town ?? a.village, a.country].filter(Boolean).join(' · ');
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing[3] },
  label: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      fontSize.xs,
    color:         colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  spacing[1] + 2,
  },
  labelError: { color: colors.danger },

  inputRow: {
    flexDirection:     'row',
    alignItems:        'center',
    height:            52,
    borderRadius:      radius.xl,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
    paddingHorizontal: spacing[4],
    gap:               spacing[2],
  },
  inputRowOpen:     { borderColor: colors.primary, borderWidth: 1.5, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  inputRowError:    { borderColor: colors.danger, borderWidth: 1.5 },
  inputRowSelected: { borderColor: colors.success },

  input: {
    flex:       1,
    fontFamily: fontFamily.body,
    fontSize:   fontSize.base,
    color:      colors.textPrimary,
    height:     '100%',
  },
  error: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.danger,
    marginTop:  spacing[1],
  },

  dropdown: {
    backgroundColor: colors.backgroundElevated,
    borderWidth:     1.5,
    borderTopWidth:  0,
    borderColor:     colors.primary,
    borderBottomLeftRadius:  radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.3,
    shadowRadius:    8,
    elevation:       8,
  },
  resultItem: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing[4],
    paddingVertical:   spacing[3],
    gap:               spacing[2],
  },
  resultDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultIcon: { flexShrink: 0 },
  resultText: { flex: 1 },
  resultMain: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    color:      colors.textPrimary,
  },
  resultSub: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    marginTop:  2,
  },
});

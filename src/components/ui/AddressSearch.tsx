/**
 * AddressSearch — OpenStreetMap Nominatim autocomplete.
 * Zero extra dependencies — uses axios already in the project.
 * Debounced 400ms · min 3 chars · max 5 results.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Search, MapPin, X } from 'lucide-react-native';
import axios from 'axios';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

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
  countrycodes?: string; // e.g. 'fr' to restrict to France
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export const AddressSearch: React.FC<Props> = ({
  value,
  onSelect,
  placeholder   = 'Rechercher une adresse…',
  error,
  countrycodes  = 'fr',
}) => {
  const [query,    setQuery]    = useState(value);
  const [results,  setResults]  = useState<NominatimResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const [selected, setSelected] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (text: string) => {
    if (text.length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await axios.get<NominatimResult[]>(NOMINATIM_URL, {
        params: {
          q:              text,
          format:         'json',
          addressdetails: 1,
          limit:          5,
          countrycodes,
        },
        headers: {
          'Accept-Language': 'fr',
          'User-Agent':      'SecurBook/1.0',
        },
      });
      setResults(res.data ?? []);
      setOpen((res.data ?? []).length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [countrycodes]);

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
          placeholder={placeholder}
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

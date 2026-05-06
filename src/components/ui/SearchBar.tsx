/**
 * SearchBar — debounced search input with clear button.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { colors, palette } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface Props {
  value:         string;
  onChangeText:  (text: string) => void;
  placeholder?:  string;
  debounceMs?:   number;
  autoFocus?:    boolean;
}

export const SearchBar: React.FC<Props> = ({
  value,
  onChangeText,
  placeholder = 'Rechercher…',
  debounceMs  = 300,
  autoFocus   = false,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const clearOpacity = useRef(new Animated.Value(0)).current;

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => onChangeText(localValue), debounceMs);
    return () => clearTimeout(t);
  }, [localValue, debounceMs]);

  // Sync when parent resets
  useEffect(() => { setLocalValue(value); }, [value]);

  // Animate clear button
  useEffect(() => {
    Animated.timing(clearOpacity, {
      toValue:         localValue.length > 0 ? 1 : 0,
      duration:        150,
      useNativeDriver: true,
    }).start();
  }, [localValue]);

  const handleClear = () => {
    setLocalValue('');
    onChangeText('');
  };

  return (
    <View style={styles.container}>
      <Search size={16} color={colors.textMuted} strokeWidth={2} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={localValue}
        onChangeText={setLocalValue}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      <Animated.View style={{ opacity: clearOpacity }}>
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.clearBtn}>
            <X size={10} color={colors.textMuted} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   colors.surface,
    borderRadius:      radius.xl,
    borderWidth:       1,
    borderColor:       colors.border,
    paddingHorizontal: spacing[3] + 2,
    height:            42,
    gap:               spacing[2],
  },
  icon: { flexShrink: 0 },
  input: {
    flex:        1,
    fontFamily:  fontFamily.body,
    fontSize:    fontSize.sm,
    color:       colors.textPrimary,
    paddingVertical: 0,
  },
  clearBtn: {
    width:           20,
    height:          20,
    borderRadius:    10,
    backgroundColor: colors.borderStrong, // Fix #11: surfaceBorder=rgba(0.1) invisible; borderStrong=rgba(0.2)
    alignItems:      'center',
    justifyContent:  'center',
  },
});

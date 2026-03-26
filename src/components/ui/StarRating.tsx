/**
 * StarRating — affichage interactif ou lecture seule d'une note 1-5.
 */
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';

interface Props {
  value:       number;
  max?:        number;
  onChange?:   (v: number) => void;
  size?:       number;
  readonly?:   boolean;
}

export const StarRating: React.FC<Props> = ({
  value,
  max      = 5,
  onChange,
  size     = 22,
  readonly = false,
}) => (
  <View style={styles.row}>
    {Array.from({ length: max }).map((_, i) => {
      const filled = i < Math.round(value);
      const star = (
        <Text
          key={i}
          style={[
            styles.star,
            { fontSize: size },
            { color: filled ? colors.primary : colors.border },
          ]}
        >
          ★
        </Text>
      );
      if (readonly || !onChange) return star;
      return (
        <TouchableOpacity key={i} onPress={() => onChange(i + 1)} activeOpacity={0.7}>
          {star}
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap:           spacing[1],
  },
  star: {
    lineHeight: undefined,
  },
});

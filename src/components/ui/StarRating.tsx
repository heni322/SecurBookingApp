/**
 * StarRating — affichage interactif ou lecture seule d'une note 1-5.
 *
 * ACCESSIBILITÉ (audit 2026-08, UX-1)
 * ───────────────────────────────────
 * En lecture seule, le composant rendait cinq caractères « ★ » bruts sans
 * aucune annotation. Un lecteur d'écran énonçait donc la ponctuation des
 * glyphes : la note d'un agent était littéralement inaudible pour un
 * utilisateur non-voyant parcourant la liste des agents (AgentCard).
 * La rangée est désormais exposée comme un élément unique porteur d'un libellé
 * explicite (« Note : 4 sur 5 »), et les étoiles elles-mêmes sont masquées de
 * l'arbre d'accessibilité puisqu'elles sont purement décoratives.
 *
 * En mode interactif, chaque étoile devient un bouton radio annoncé et sa zone
 * tactile est étendue à 44 pt via hitSlop (WCAG 2.5.5) : à `size` par défaut de
 * 22 pt, la cible réelle ne faisait que 22 pt.
 *
 * NOTE : le seul appelant actuel est AgentCard, en lecture seule. Le mode
 * interactif n'est utilisé nulle part — l'écran de notation (RateAgentScreen)
 * implémente sa propre rangée d'étoiles, déjà accessible. Ce composant est
 * corrigé plutôt que supprimé parce qu'il reste l'affichage partagé des notes.
 */
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { useTranslation } from '@i18n';

interface Props {
  value:       number;
  max?:        number;
  onChange?:   (v: number) => void;
  size?:       number;
  readonly?:   boolean;
}

/** Étend la zone tactile d'une étoile de `size` pt jusqu'au minimum de 44 pt. */
const hitSlopFor = (size: number) => {
  const pad = Math.max(0, Math.ceil((44 - size) / 2));
  return { top: pad, bottom: pad, left: pad, right: pad };
};

export const StarRating: React.FC<Props> = ({
  value,
  max      = 5,
  onChange,
  size     = 22,
  readonly = false,
}) => {
  const { t } = useTranslation('common');
  const interactive = !readonly && !!onChange;

  const stars = Array.from({ length: max }).map((_, i) => {
    const filled = i < Math.round(value);
    const star = (
      <Text
        key={i}
        // Décoratif : le libellé porté par le conteneur (lecture seule) ou par
        // le bouton (interactif) suffit. Sans cela le lecteur d'écran énonce
        // chaque glyphe en plus du libellé.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.star,
          { fontSize: size },
          { color: filled ? colors.primary : colors.border },
        ]}
      >
        ★
      </Text>
    );

    if (!interactive) return star;

    return (
      <TouchableOpacity
        key={i}
        onPress={() => onChange!(i + 1)}
        activeOpacity={0.7}
        hitSlop={hitSlopFor(size)}
        accessibilityRole="radio"
        accessibilityState={{ selected: i < value, checked: i < value }}
        accessibilityLabel={t('star_rating_set', {
          value: i + 1,
          max,
        })}
      >
        {star}
      </TouchableOpacity>
    );
  });

  if (interactive) {
    return (
      <View style={styles.row} accessibilityRole="radiogroup">
        {stars}
      </View>
    );
  }

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={t('star_rating_value', {
        value: Math.round(value),
        max,
      })}
    >
      {stars}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap:           spacing[1],
  },
  star: {
    lineHeight: undefined,
  },
});

/**
 * OfflineBanner — slide-in strip when device loses connectivity.
 *
 * Connectivity is sourced from connectivityService (a single NetInfo wrapper)
 * instead of importing NetInfo directly. This guarantees the banner reflects the
 * same state used to trigger reconnect refetches, and degrades gracefully (stays
 * hidden) when NetInfo is unavailable in tests.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useTranslation } from '@i18n';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { connectivityService } from '@services/connectivityService';

export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(false);
  const { t } = useTranslation('offline_banner');
  const slideY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    // Ensure the single NetInfo subscription is running, then mirror its state.
    connectivityService.start();
    const unsub = connectivityService.subscribe(online => setOffline(!online));
    return () => unsub();
  }, []);

  useEffect(() => {
    Animated.spring(slideY, {
      toValue:         offline ? 0 : -60,
      useNativeDriver: true,
      tension:         80,
      friction:        10,
    }).start();
  }, [offline, slideY]);

  if (!offline && (slideY as any)._value === -60) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideY }] }]}>
      <WifiOff size={14} color={colors.white} strokeWidth={2} />
      <Text style={styles.text}>{t('no_connection')}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position:          'absolute',
    top:               0,
    left:              0,
    right:             0,
    zIndex:            9999,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               spacing[2],
    backgroundColor:   colors.dangerSurface,
    paddingVertical:   spacing[3],
    paddingHorizontal: spacing[4],
  },
  text: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
    color:      colors.white,
  },
});

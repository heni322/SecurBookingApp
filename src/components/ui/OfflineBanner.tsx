/**
 * OfflineBanner — slide-in strip when device loses connectivity.
 * Uses @react-native-community/netinfo.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

// Soft import — app works even if NetInfo not installed
let NetInfo: any = null;
try { NetInfo = require('@react-native-community/netinfo').default; } catch { /* ok */ }

export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(false);
  const slideY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (!NetInfo) return;
    const unsub = NetInfo.addEventListener((state: any) => {
      const isOffline = !(state.isConnected && state.isInternetReachable !== false);
      setOffline(isOffline);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    Animated.spring(slideY, {
      toValue:         offline ? 0 : -60,
      useNativeDriver: true,
      tension:         80,
      friction:        10,
    }).start();
  }, [offline]);

  if (!offline && (slideY as any)._value === -60) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideY }] }]}>
      <WifiOff size={14} color={colors.white} strokeWidth={2} />
      <Text style={styles.text}>Pas de connexion — affichage en cache</Text>
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
    backgroundColor:   colors.danger,
    paddingVertical:   spacing[3],
    paddingHorizontal: spacing[4],
  },
  text: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
    color:      colors.white,
  },
});

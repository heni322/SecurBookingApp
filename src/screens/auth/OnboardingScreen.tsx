import React, { useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Dimensions, Animated, Platform,
} from 'react-native';
import { Shield, MapPin, CreditCard } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors }                  from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { useTranslation }          from '@i18n';

const { width: W } = Dimensions.get('window');
const ONBOARDING_KEY = '@securbook:onboarding:done';

type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

interface ResolvedSlide {
  key:       string;
  Icon:      LucideIcon;
  iconBg:    string;
  iconColor: string;
  title:     string;
  subtitle:  string;
}

interface Props { onDone: () => void; }

export const OnboardingScreen: React.FC<Props> = ({ onDone }) => {
  const { t }         = useTranslation('auth');
  const [idx, setIdx] = useState(0);
  const flatRef       = useRef<FlatList>(null);
  const scaleAnim     = useRef(new Animated.Value(1)).current;

  // Keys are explicit — no dynamic template literals — satisfying i18next types.
  const SLIDES: ResolvedSlide[] = [
    {
      key: 'security', Icon: Shield,
      iconBg: colors.primarySurface, iconColor: colors.primary,
      title:    t('onboarding.slides.security_title'),
      subtitle: t('onboarding.slides.security_subtitle'),
    },
    {
      key: 'tracking', Icon: MapPin,
      iconBg: colors.infoSurface, iconColor: colors.info,
      title:    t('onboarding.slides.tracking_title'),
      subtitle: t('onboarding.slides.tracking_subtitle'),
    },
    {
      key: 'payment', Icon: CreditCard,
      iconBg: colors.successSurface, iconColor: colors.success,
      title:    t('onboarding.slides.payment_title'),
      subtitle: t('onboarding.slides.payment_subtitle'),
    },
  ];

  const handleNext = () => {
    if (idx < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: idx + 1, animated: true });
      setIdx(i => i + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => {});
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim,  { toValue: 1,   friction: 4,  useNativeDriver: true }),
    ]).start(onDone);
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => {});
    onDone();
  };

  const isLast = idx === SLIDES.length - 1;

  return (
    <View style={styles.screen}>
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={s => s.key}
        horizontal pagingEnabled scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <SlideView slide={item} />}
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
        ))}
      </View>

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity style={styles.cta} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.ctaText}>
            {isLast ? t('onboarding.get_started') : t('onboarding.next')}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.bottomSpacer} />
    </View>
  );
};

// Slide receives fully-resolved strings — no t() call inside.
const SlideView: React.FC<{ slide: ResolvedSlide }> = ({ slide }) => {
  const { Icon, iconBg, iconColor, title, subtitle } = slide;
  return (
    <View style={slideStyles.wrap}>
      <View style={[slideStyles.iconOuter, { backgroundColor: iconBg }]}>
        <View style={[slideStyles.iconInner, { borderColor: iconColor + '44' }]}>
          <Icon size={40} color={iconColor} strokeWidth={1.6} />
        </View>
      </View>
      <Text style={slideStyles.title}>{title}</Text>
      <Text style={slideStyles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const slideStyles = StyleSheet.create({
  wrap:      { width: W, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.screenPaddingH + spacing[4], gap: spacing[5] },
  iconOuter: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center' },
  iconInner: { width: 96,  height: 96,  borderRadius: 48, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  title:     { fontFamily: fontFamily.display, fontSize: 30, color: colors.textPrimary, textAlign: 'center', letterSpacing: -0.8, lineHeight: 36 },
  subtitle:  { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  skipBtn:      { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: layout.screenPaddingH, zIndex: 10, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  skipText:     { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted },
  dotsRow:      { flexDirection: 'row', gap: spacing[2], marginTop: spacing[8], marginBottom: spacing[6] },
  dot:          { width: 8,  height: 8,  borderRadius: 4, backgroundColor: colors.surfaceBorder },
  dotActive:    { width: 24, backgroundColor: colors.primary },
  cta:          { width: W - layout.screenPaddingH * 2, height: 52, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  ctaText:      { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.lg, color: colors.textInverse },
  bottomSpacer: { height: Platform.OS === 'ios' ? 40 : 24 },
});

export const checkOnboardingDone = async (): Promise<boolean> => {
  const v = await AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null);
  return v === '1';
};


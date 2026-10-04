import React from 'react';
import { Linking, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { config } from '@config';
import type { UpdateRequirement } from '@store/appUpdateStore';

/**
 * Blocking screen shown when the API refuses this build (426
 * APP_UPDATE_REQUIRED, audit 2026-10-02 H9). There is deliberately no way
 * past it: the endpoints this version would call have changed.
 */
export function UpdateRequiredScreen({ requirement }: { requirement: UpdateRequirement }) {
  const { t } = useTranslation(['common']);
  const storeUrl = requirement.storeUrl;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} translucent={false} />
      <Text style={styles.title} accessibilityRole="header">
        {t('common:update_required_title')}
      </Text>
      <Text style={styles.body}>{t('common:update_required_body')}</Text>
      <Text style={styles.meta}>
        {t('common:update_required_version', { current: config.appVersion, min: requirement.minVersion })}
      </Text>
      {storeUrl ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => { Linking.openURL(storeUrl).catch(() => undefined); }}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>
            {t(Platform.OS === 'ios' ? 'common:update_required_button_ios' : 'common:update_required_button_android')}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.body}>{t('common:update_required_no_store')}</Text>
      )}
    </View>
  );
}

const NAVY = '#05172b';
const GOLD = '#bc933b';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { color: '#ffffff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  body: { color: '#c9d1e0', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 12 },
  meta: { color: '#8a94a8', fontSize: 13, textAlign: 'center', marginBottom: 28 },
  button: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, minWidth: 220, alignItems: 'center' },
  pressed: { opacity: 0.85 },
  buttonText: { color: NAVY, fontSize: 16, fontWeight: '700' },
});

/**
 * biometricService — wrapper around react-native-biometrics.
 * Soft-import: gracefully degrades when library is not installed.
 */

let ReactNativeBiometrics: any = null;
try {
  ReactNativeBiometrics = require('react-native-biometrics').default;
} catch { /* library not installed — features disabled */ }

let AsyncStorage: any = null;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch {}

const BIOMETRIC_ENABLED_KEY = '@securbook:biometric:enabled';

export type BiometricType = 'TouchID' | 'FaceID' | 'Biometrics' | 'none';

class BiometricService {
  private rnBiometrics: any = null;

  private get instance() {
    if (!this.rnBiometrics && ReactNativeBiometrics) {
      this.rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });
    }
    return this.rnBiometrics;
  }

  /** Check if device supports biometrics */
  async isAvailable(): Promise<{ available: boolean; biometryType: BiometricType }> {
    if (!this.instance) return { available: false, biometryType: 'none' };
    try {
      const { available, biometryType } = await this.instance.isSensorAvailable();
      return { available: !!available, biometryType: biometryType ?? 'none' };
    } catch {
      return { available: false, biometryType: 'none' };
    }
  }

  /** Prompt biometric authentication */
  async authenticate(promptMessage = 'Confirmer votre identité'): Promise<boolean> {
    if (!this.instance) return false;
    try {
      const { success } = await this.instance.simplePrompt({ promptMessage });
      return !!success;
    } catch {
      return false;
    }
  }

  /** Persist the user's opt-in preference */
  async setEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage?.setItem(BIOMETRIC_ENABLED_KEY, enabled ? '1' : '0');
  }

  /** Read the user's opt-in preference */
  async isEnabled(): Promise<boolean> {
    const v = await AsyncStorage?.getItem(BIOMETRIC_ENABLED_KEY);
    return v === '1';
  }

  /** Human-readable label for the type */
  labelFor(type: BiometricType): string {
    switch (type) {
      case 'FaceID':    return 'Face ID';
      case 'TouchID':   return 'Touch ID';
      case 'Biometrics': return 'Empreinte digitale';
      default:          return 'Biométrie';
    }
  }
}

export const biometricService = new BiometricService();

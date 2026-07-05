/**
 * AlertModal -- Enterprise-grade in-app alert system
 *
 * A polished, accessible, promise-aware modal alert system tuned for the
 * Provalk Agent app.
 *
 * Key features
 * ------------
 *   - 100% backwards-compatible with showAlert(title, message, buttons)
 *   - Promise-based API:  confirmAsync()  /  useAlert().confirm()  /  useAlert().alertAsync()
 *   - Async button onPress: if it returns a Promise, the button shows a
 *     spinner and the whole modal is locked (no backdrop dismiss, no
 *     double-press) until the promise resolves.
 *   - Smart per-variant defaults:
 *       * confirm / error  -> backdrop tap does NOT dismiss
 *       * success / info / warning / default  -> backdrop tap dismisses
 *   - Accessibility: accessibilityViewIsModal, role="alert", live region,
 *     proper hardware-back handling.
 *   - Responsive (useWindowDimensions) + safe-area aware.
 *   - 6 semantic variants (success / error / warning / info / confirm / default).
 *
 * Quick reference
 * ---------------
 *   // Fire-and-forget shortcuts (new):
 *   showAlert.success('Sauvegarde', 'Profil mis a jour.');
 *   showAlert.error('Echec', 'Impossible de contacter le serveur.');
 *   showAlert.warning('Attention', '...');
 *   showAlert.info('Info', '...');
 *
 *   // Confirmation, callback style:
 *   showAlert.confirm({
 *     title: 'Supprimer le compte ?',
 *     message: 'Cette action est irreversible.',
 *     buttons: [
 *       { text: 'Annuler', style: 'cancel' },
 *       { text: 'Supprimer', style: 'destructive', onPress: () => api.deleteAccount() },
 *     ],
 *   });
 *
 *   // Confirmation, async/await style:
 *   const ok = await confirmAsync({
 *     title: 'Supprimer le compte ?',
 *     message: 'Cette action est irreversible.',
 *     destructive: true,
 *   });
 *   if (!ok) return;
 *   await api.deleteAccount();
 *
 *   // Legacy (unchanged, still works):
 *   showAlert('Titre', 'Message');
 *   showAlert('Titre', 'Message', [
 *     { text: 'Annuler', style: 'cancel' },
 *     { text: 'OK', onPress: () => {} },
 *   ]);
 *
 *   // Hook:
 *   const { alert, alertAsync, confirm, success, error, warning, info, dismiss } = useAlert();
 *
 *   // Async button onPress (button shows spinner, modal locked):
 *   alert({
 *     type: 'confirm',
 *     title: 'Envoyer ?',
 *     onConfirm: async () => { await api.send(); },
 *   });
 */

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator, Animated, Modal, Platform, Pressable, StyleSheet,
  Text, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CircleAlert, CircleCheck, Info as InfoIcon, ShieldQuestion,
  TriangleAlert, X,
} from 'lucide-react-native';

import { palette }                  from '@theme/colors';
import { fontFamily, fontSize }     from '@theme/typography';
import { radius, spacing }          from '@theme/spacing';

// =============================================================================
// Public types
// =============================================================================

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'default';

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AlertButton {
  text: string;
  /**
   * Sync or async. If `onPress` returns a Promise, the button displays a
   * spinner and the whole modal is locked (cannot be dismissed, other
   * buttons are disabled) until it resolves.
   */
  onPress?: () => void | Promise<unknown>;
  style?: AlertButtonStyle;
}

export interface AlertOptions {
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  /** Shortcut: fires on the primary action. Mutually exclusive with `buttons`. */
  onConfirm?: () => void | Promise<unknown>;
  /** Fires when the alert is closed by anything other than an action press (backdrop, cancel, hardware back). */
  onDismiss?: () => void;
  /** Whether backdrop tap dismisses. Defaults: false for confirm/error, true otherwise. */
  dismissable?: boolean;
  /** Optional override for the auto-generated icon. */
  icon?: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Defaults to 'Confirmer'. */
  confirmText?: string;
  /** Defaults to 'Annuler'. */
  cancelText?: string;
  /** Destructive style for the confirm button (red ghost). Defaults false. */
  destructive?: boolean;
  /** Optional override for the icon/accent variant. */
  type?: Exclude<AlertType, 'default'>;
}

interface AlertContextValue {
  alert: (opts: AlertOptions) => void;
  /** Promise variant of `alert`. Resolves with the pressed button or null on dismiss. */
  alertAsync: (opts: AlertOptions) => Promise<AlertButton | null>;
  /** Promise-based confirm. Resolves true if the primary action was pressed. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
  dismiss: () => void;
}

// =============================================================================
// Internal state
// =============================================================================

interface AlertState extends AlertOptions {
  visible: boolean;
  /** Resolver for promise-based callers, set by alertAsync()/confirm(). */
  _resolve?: (btn: AlertButton | null) => void;
}

const HIDDEN_STATE: AlertState = { visible: false, title: '', type: 'default' };

// =============================================================================
// Context
// =============================================================================

const AlertContext = createContext<AlertContextValue | null>(null);

// =============================================================================
// Imperative singleton (drop-in for Alert.alert + new shortcuts)
// =============================================================================

let _api: AlertContextValue | null = null;

interface ShowAlertFn {
  (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: Pick<AlertOptions, 'type' | 'dismissable'>,
  ): void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
  confirm: (opts: AlertOptions) => void;
};

/**
 * Drop-in replacement for React Native's Alert.alert.
 * Backwards-compatible signature: showAlert(title, message?, buttons?, options?).
 */
const _showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: Pick<AlertOptions, 'type' | 'dismissable'>,
): void => {
  if (!_api) {
    // Fallback to native Alert if the AlertProvider isn't mounted yet.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy require avoids hard dependency for providerless callers
    const { Alert } = require('react-native');
    Alert.alert(
      title,
      message,
      buttons?.map((b) => ({
        text: b.text,
        onPress: b.onPress as () => void,
        style: b.style === 'destructive' ? 'destructive'
             : b.style === 'cancel'      ? 'cancel'
             : 'default',
      })),
    );
    return;
  }

  // Preserve legacy auto-inference: if both destructive AND cancel exist, it's a confirm.
  let type: AlertType = options?.type ?? 'default';
  if (!options?.type && buttons) {
    const hasDestructive = buttons.some((b) => b.style === 'destructive');
    const hasCancel      = buttons.some((b) => b.style === 'cancel');
    if (hasDestructive && hasCancel) type = 'confirm';
  }

  _api.alert({ type, title, message, buttons, dismissable: options?.dismissable });
};

export const showAlert = _showAlert as ShowAlertFn;
showAlert.success = (title, message) => _api?.success(title, message);
showAlert.error   = (title, message) => _api?.error(title, message);
showAlert.warning = (title, message) => _api?.warning(title, message);
showAlert.info    = (title, message) => _api?.info(title, message);
showAlert.confirm = (opts) => _api?.alert({ type: 'confirm', ...opts });

/** Promise-based confirm. Resolves `true` if the primary action was pressed, `false` otherwise. */
export function confirmAsync(opts: ConfirmOptions): Promise<boolean> {
  if (!_api) return Promise.resolve(false);
  return _api.confirm(opts);
}

// =============================================================================
// Variant theme
// =============================================================================

interface VariantConfig {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  iconColor:     string;
  iconBgColor:   string;
  iconRingColor: string;
  accentColor:   string;
}

const VARIANTS: Record<AlertType, VariantConfig> = {
  success: {
    Icon:          CircleCheck,
    iconColor:     palette.txtGreen,
    iconBgColor:   'rgba(52, 211, 153, 0.13)',
    iconRingColor: 'rgba(52, 211, 153, 0.22)',
    accentColor:   palette.txtGreen,
  },
  error: {
    Icon:          CircleAlert,
    iconColor:     palette.txtRed,
    iconBgColor:   'rgba(248, 113, 113, 0.13)',
    iconRingColor: 'rgba(248, 113, 113, 0.22)',
    accentColor:   palette.txtRed,
  },
  warning: {
    Icon:          TriangleAlert,
    iconColor:     palette.goldTxt,
    iconBgColor:   'rgba(241, 196, 125, 0.13)',
    iconRingColor: 'rgba(241, 196, 125, 0.22)',
    accentColor:   palette.goldTxt,
  },
  info: {
    Icon:          InfoIcon,
    iconColor:     palette.txtBlue,
    iconBgColor:   'rgba(96, 165, 250, 0.13)',
    iconRingColor: 'rgba(96, 165, 250, 0.22)',
    accentColor:   palette.txtBlue,
  },
  confirm: {
    Icon:          ShieldQuestion,
    iconColor:     palette.gold,
    iconBgColor:   'rgba(188, 147, 59, 0.13)',
    iconRingColor: 'rgba(188, 147, 59, 0.25)',
    accentColor:   palette.gold,
  },
  default: {
    Icon:          InfoIcon,
    iconColor:     palette.mutedStrong,
    iconBgColor:   'rgba(255, 255, 255, 0.07)',
    iconRingColor: 'rgba(255, 255, 255, 0.12)',
    accentColor:   palette.gold,
  },
};

/** Default backdrop-tap behavior per type. Destructive flows are NOT dismissable accidentally. */
const DEFAULT_DISMISSABLE: Record<AlertType, boolean> = {
  success: true,  info: true,  warning: true,  default: true,
  error:   false, confirm: false,
};

// =============================================================================
// Modal view
// =============================================================================

interface ModalViewProps {
  state: AlertState;
  onClose: (btn: AlertButton | null) => void;
}

const AlertModalView: React.FC<ModalViewProps> = ({ state, onClose }) => {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const liftAnim  = useRef(new Animated.Value(12)).current;

  // Per-button async loading state -- index of the button currently awaiting a promise.
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const closing = useRef(false);

  // Reset transient state + run entry animation each time the alert opens.
  useEffect(() => {
    if (state.visible) {
      setLoadingIdx(null);
      closing.current = false;
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);
      liftAnim.setValue(12);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 9, tension: 110, useNativeDriver: true }),
        Animated.spring(liftAnim,  { toValue: 0, friction: 9, tension: 110, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0,    duration: 140, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.96, duration: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [state.visible, fadeAnim, scaleAnim, liftAnim]);

  // --- Derived state ---------------------------------------------------------
  const type        = state.type ?? 'default';
  const variant     = VARIANTS[type];
  const Icon        = state.icon ?? variant.Icon;
  const dismissable = state.dismissable ?? DEFAULT_DISMISSABLE[type];

  // Effective button list (fall back to defaults when caller didn't supply any).
  const buttons: AlertButton[] = useMemo(() => {
    if (state.buttons && state.buttons.length > 0) return state.buttons;
    if (state.onConfirm) {
      return [
        { text: 'Annuler',   style: 'cancel' },
        { text: 'Confirmer', style: 'default', onPress: state.onConfirm },
      ];
    }
    return [{ text: 'OK', style: 'default' }];
  }, [state.buttons, state.onConfirm]);

  const cancelBtn  = buttons.find((b)   => b.style === 'cancel');
  const actionBtns = buttons.filter((b) => b.style !== 'cancel');

  // Stack buttons vertically when there are many of them, or when combined labels are too long
  // to fit comfortably on one row (avoids text truncation).
  const stacked = actionBtns.length > 1
    || (actionBtns.length === 1 && !!cancelBtn
        && (actionBtns[0].text.length + cancelBtn.text.length) > 18);

  // --- Press handlers --------------------------------------------------------
  const close = useCallback((btn: AlertButton | null) => {
    if (closing.current) return;
    closing.current = true;
    onClose(btn);
  }, [onClose]);

  const handlePress = useCallback(async (btn: AlertButton, idx: number) => {
    if (loadingIdx !== null) return;            // another button is awaiting; ignore taps
    if (!btn.onPress) { close(btn); return; }   // sync: close immediately

    let result: void | Promise<unknown>;
    try { result = btn.onPress(); }
    catch { close(btn); return; }

    if (result && typeof result.then === 'function') {
      // Async: lock modal, show spinner, await, then close.
      setLoadingIdx(idx);
      try { await result; close(btn); }
      catch { setLoadingIdx(null); /* keep modal open so the user can retry */ }
    } else {
      close(btn);
    }
  }, [loadingIdx, close]);

  const handleBackdropPress = useCallback(() => {
    if (loadingIdx !== null) return;
    if (!dismissable) return;
    close(null);
  }, [loadingIdx, dismissable, close]);

  const handleRequestClose = useCallback(() => {
    // Hardware back button on Android.
    if (loadingIdx !== null) return;
    close(null);
  }, [loadingIdx, close]);

  // --- Sizing ----------------------------------------------------------------
  const cardWidth     = Math.min(winW - spacing[8], 380);
  const cardMaxHeight = (winH - insets.top - insets.bottom) * 0.86;

  // --- Render helpers --------------------------------------------------------
  const renderActionButton = (btn: AlertButton, i: number) => {
    const isDestructive = btn.style === 'destructive';
    const isLoading     = loadingIdx === i;
    const otherLoading  = loadingIdx !== null && !isLoading;

    return (
      <Pressable
        key={`a-${i}`}
        accessibilityRole="button"
        accessibilityState={{ busy: isLoading, disabled: otherLoading }}
        disabled={otherLoading}
        style={({ pressed }) => [
          styles.btn,
          stacked ? styles.btnStacked : styles.btnInlineFlex,
          isDestructive ? styles.btnDestructive : { backgroundColor: variant.accentColor },
          (pressed || isLoading) && { opacity: 0.85 },
          otherLoading && { opacity: 0.45 },
        ]}
        onPress={() => handlePress(btn, i)}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={isDestructive ? palette.txtRed : palette.bg}
          />
        ) : (
          <Text
            style={[styles.btnText, isDestructive ? styles.btnDestructiveText : styles.btnPrimaryText]}
            numberOfLines={1}
          >
            {btn.text}
          </Text>
        )}
      </Pressable>
    );
  };

  const renderCancelButton = (btn: AlertButton) => {
    const disabled = loadingIdx !== null;
    return (
      <Pressable
        key="cancel"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        style={({ pressed }) => [
          styles.btn,
          stacked ? styles.btnStacked : styles.btnInlineFlex,
          styles.btnCancel,
          pressed && { opacity: 0.8 },
          disabled && { opacity: 0.4 },
        ]}
        onPress={() => handlePress(btn, -1)}
      >
        <Text style={[styles.btnText, styles.btnCancelText]} numberOfLines={1}>
          {btn.text}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={state.visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
      hardwareAccelerated
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} pointerEvents="auto">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleBackdropPress}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Animated.View>

      {/* Card */}
      <View style={styles.centered} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            styles.card,
            {
              width:     cardWidth,
              maxHeight: cardMaxHeight,
              opacity:   fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: liftAnim }],
            },
          ]}
        >
          {/* Accent bar (top edge) */}
          <View style={[styles.accentBar, { backgroundColor: variant.accentColor }]} />

          {/* Body */}
          <View style={styles.body}>
            {/* Icon: layered ring + core for premium feel */}
            <View style={[styles.iconRing, { backgroundColor: variant.iconRingColor }]}>
              <View style={[styles.iconCore, { backgroundColor: variant.iconBgColor }]}>
                <Icon size={28} color={variant.iconColor} strokeWidth={1.7} />
              </View>
            </View>

            {/* Dismiss X -- only for non-actionable informational alerts.
                Hidden for confirm/error to enforce explicit choice. */}
            {dismissable && type !== 'confirm' && type !== 'error' && (
              <Pressable
                onPress={() => loadingIdx === null && close(null)}
                style={styles.dismissBtn}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <X size={16} color={palette.muted} strokeWidth={2.2} />
              </Pressable>
            )}

            {/* Title */}
            <Text style={styles.title} accessibilityRole="header">
              {state.title}
            </Text>

            {/* Optional message */}
            {!!state.message && (
              <Text style={styles.message}>{state.message}</Text>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Actions -- pinned, layout-stable, never scroll */}
          <View style={[styles.actions, stacked ? styles.actionsStacked : styles.actionsInline]}>
            {stacked
              ? /* Stacked: action(s) on top, cancel last (bottom) -- iOS convention */ (
                <>
                  {actionBtns.map(renderActionButton)}
                  {cancelBtn && renderCancelButton(cancelBtn)}
                </>
              )
              : /* Inline: cancel left, primary right -- Western reading flow */ (
                <>
                  {cancelBtn && renderCancelButton(cancelBtn)}
                  {actionBtns.map(renderActionButton)}
                </>
              )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// =============================================================================
// Provider
// =============================================================================

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AlertState>(HIDDEN_STATE);

  // -- Core mutators ----------------------------------------------------------
  const alert = useCallback((opts: AlertOptions) => {
    setState({ ...HIDDEN_STATE, ...opts, visible: true });
  }, []);

  const alertAsync = useCallback((opts: AlertOptions): Promise<AlertButton | null> =>
    new Promise<AlertButton | null>((resolve) => {
      setState({ ...HIDDEN_STATE, ...opts, visible: true, _resolve: resolve });
    }), []);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    const type = opts.type ?? (opts.destructive ? 'warning' : 'confirm');
    return new Promise<boolean>((resolve) => {
      const cancelText  = opts.cancelText  ?? 'Annuler';
      const confirmText = opts.confirmText ?? 'Confirmer';
      setState({
        ...HIDDEN_STATE,
        visible: true,
        type,
        title:    opts.title,
        message:  opts.message,
        dismissable: false,
        buttons: [
          { text: cancelText,  style: 'cancel',                                       onPress: () => resolve(false) },
          { text: confirmText, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true)  },
        ],
        onDismiss: () => resolve(false),
      });
    });
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  // -- Shortcuts --------------------------------------------------------------
  const success = useCallback((title: string, message?: string) =>
    alert({ type: 'success', title, message }), [alert]);
  const error   = useCallback((title: string, message?: string) =>
    alert({ type: 'error',   title, message }), [alert]);
  const warning = useCallback((title: string, message?: string) =>
    alert({ type: 'warning', title, message }), [alert]);
  const info    = useCallback((title: string, message?: string) =>
    alert({ type: 'info',    title, message }), [alert]);

  // -- Close handler ----------------------------------------------------------
  const handleClose = useCallback((btn: AlertButton | null) => {
    setState((prev) => {
      // Resolve any pending promise
      prev._resolve?.(btn);
      // Fire onDismiss for non-action closes (backdrop, cancel, hardware back)
      if (!btn || btn.style === 'cancel') prev.onDismiss?.();
      return { ...prev, visible: false };
    });
  }, []);

  // -- Context value ----------------------------------------------------------
  const ctxValue = useMemo<AlertContextValue>(() => ({
    alert, alertAsync, confirm, success, error, warning, info, dismiss,
  }), [alert, alertAsync, confirm, success, error, warning, info, dismiss]);

  // Wire imperative singleton so `showAlert(...)` works outside React tree.
  useEffect(() => {
    _api = ctxValue;
    return () => { _api = null; };
  }, [ctxValue]);

  return (
    <AlertContext.Provider value={ctxValue}>
      {children}
      <AlertModalView state={state} onClose={handleClose} />
    </AlertContext.Provider>
  );
};

// =============================================================================
// Hook
// =============================================================================

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within <AlertProvider>');
  return ctx;
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // -- Backdrop ---------------------------------------------------------------
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 8, 20, 0.76)',
  },
  centered: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },

  // -- Card -------------------------------------------------------------------
  card: {
    backgroundColor: palette.panelSolid,
    borderRadius:    radius['2xl'],
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 24 },
        shadowOpacity: 0.55,
        shadowRadius:  40,
      },
      android: { elevation: 28 },
    }),
  },
  accentBar: {
    height: 3,
    width:  '100%',
  },

  // -- Body -------------------------------------------------------------------
  body: {
    paddingTop:        spacing[6],
    paddingBottom:     spacing[4],
    paddingHorizontal: spacing[5],
    alignItems:        'center',
    position:          'relative',
  },
  iconRing: {
    width:          72,
    height:         72,
    borderRadius:   36,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing[4],
  },
  iconCore: {
    width:          56,
    height:         56,
    borderRadius:   28,
    alignItems:     'center',
    justifyContent: 'center',
  },
  dismissBtn: {
    position:        'absolute',
    top:             spacing[3],
    right:           spacing[3],
    width:           30,
    height:          30,
    borderRadius:    15,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  title: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.lg,
    color:         palette.fg,
    textAlign:     'center',
    letterSpacing: -0.3,
    lineHeight:    fontSize.lg * 1.32,
    marginBottom:  spacing[2],
    paddingHorizontal: spacing[2],
  },
  message: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      palette.muted,
    textAlign:  'center',
    lineHeight: fontSize.sm * 1.55,
    marginTop:  spacing[1],
    paddingHorizontal: spacing[2],
  },

  // -- Divider ----------------------------------------------------------------
  divider: {
    height:          1,
    width:           '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  // -- Actions ----------------------------------------------------------------
  actions: {
    padding: spacing[4],
    gap:     spacing[2],
  },
  actionsInline: {
    flexDirection: 'row',
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  btn: {
    height:            48,
    borderRadius:      radius.lg,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing[4],
  },
  btnInlineFlex: { flex: 1 },
  btnStacked:    { width: '100%' },
  btnDestructive: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth:     1,
    borderColor:     'rgba(248, 113, 113, 0.38)',
  },
  btnCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth:     1,
    borderColor:     'rgba(255, 255, 255, 0.10)',
  },
  btnText: {
    fontFamily:    fontFamily.bodySemiBold,
    fontSize:      fontSize.sm,
    letterSpacing: 0.1,
  },
  btnPrimaryText:     { color: palette.bg },
  btnDestructiveText: { color: palette.txtRed },
  btnCancelText:      { color: palette.mutedStrong },
});

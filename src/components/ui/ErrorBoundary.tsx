/**
 * ErrorBoundary — catches render crashes and shows a branded retry screen.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { colors, palette } from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Erreur inconnue' };
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <AlertTriangle size={32} color={colors.warning} strokeWidth={1.8} />
        </View>
        <Text style={styles.title}>Une erreur est survenue</Text>
        <Text style={styles.message} numberOfLines={3}>{this.state.message}</Text>
        <TouchableOpacity style={styles.btn} onPress={this.handleRetry} activeOpacity={0.8}>
          <RefreshCw size={16} color={colors.textInverse} strokeWidth={2} />
          <Text style={styles.btnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex:             1,
    alignItems:       'center',
    justifyContent:   'center',
    backgroundColor:  colors.background,
    paddingHorizontal: layout.screenPaddingH,
    gap:              spacing[4],
  },
  iconWrap: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: colors.warningSurface,
    borderWidth:     1,
    borderColor:     colors.warning + '55',
    alignItems:      'center',
    justifyContent:  'center',
  },
  title: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.xl,
    color:         colors.textPrimary,
    textAlign:     'center',
    letterSpacing: -0.4,
  },
  message: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
  btn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[2],
    backgroundColor:   colors.primary,
    paddingHorizontal: spacing[6],
    paddingVertical:   spacing[3],
    borderRadius:      radius.full,
    marginTop:         spacing[2],
    shadowColor:       '#bc933b',
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.35,
    shadowRadius:      10,
    elevation:         5,
  },
  btnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.base,
    color:      colors.textInverse,
  },
});

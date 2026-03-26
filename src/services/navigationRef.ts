/**
 * navigationRef.ts — référence globale au NavigationContainer.
 * Permet de naviguer depuis des services (logout intercepteur 401, etc.).
 *
 * Usage dans App.tsx :
 *   <NavigationContainer ref={navigationRef}>
 *
 * Usage depuis n'importe quel service :
 *   import { navigateRoot } from '@services/navigationRef';
 *   navigateRoot('Auth');
 */
import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { RootStackParamList } from '@models/index';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Naviguer vers un écran root depuis n'importe quel service.
 * Utilise CommonActions.navigate pour éviter les problèmes de surcharge
 * de type sur navigationRef.navigate() avec des params génériques.
 */
export const navigateRoot = (name: keyof RootStackParamList) => {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.navigate({ name }));
  }
};

/**
 * Réinitialiser la stack vers un écran (utile pour le logout).
 */
export const resetToRoot = (name: keyof RootStackParamList) => {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name }] }),
    );
  }
};

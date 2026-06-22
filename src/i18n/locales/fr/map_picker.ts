import type { MapPickerNS } from '../types';

const map_picker: MapPickerNS = {
  label:        'Position GPS *',
  hint:         'Touchez la carte pour placer le marqueur · Glissez pour déplacer',
  loading:      'Chargement de la carte…',
  validate_btn: 'Valider',
  validated:    'Validé',
  unlock_hint:  'Appuyer pour interagir avec la carte',
  perm_title:           'Localisation requise',
  perm_message:         'Provalk a besoin de votre position pour centrer la carte.',
  perm_allow:           'Autoriser',
  perm_cancel:          'Annuler',
  perm_settings_hint:   'Activez la localisation dans les réglages.',
  perm_denied_title:    'Permission refusée',
  perm_denied:          'Permission de localisation refusée.',
  position_unavailable: 'Position introuvable. Vérifiez que le GPS est activé.',
  timeout_retry:        'Délai dépassé. Réessayez.',
  locate_failed_title:  'Localisation impossible',
};

export default map_picker;

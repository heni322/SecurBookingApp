import type { MapPickerNS } from '../types';

const map_picker: MapPickerNS = {
  label:        'Position GPS *',
  hint:         'Touchez la carte pour placer le marqueur · Glissez pour déplacer',
  loading:      'Chargement de la carte…',
  validate_btn: 'Valider',
  validated:    'Validé',
  unlock_hint:  'Toucher pour ajuster la position',
  position_saved:    'Position enregistrée',
  address_resolving: "Recherche de l'adresse…",
  perm_title:           'Localisation requise',
  perm_message:         'Provalk a besoin de votre position pour centrer la carte.',
  perm_allow:           'Autoriser',
  perm_cancel:          'Annuler',
  perm_settings_hint:   'Activez la localisation dans les réglages.',
  perm_denied_title:    'Permission refusée',
  perm_denied:          'Permission de localisation refusée.',
  position_unavailable: "Position introuvable. Activez la localisation du téléphone, ou touchez la carte pour placer le marqueur.",
  timeout_retry:        "Le GPS ne répond pas (souvent en intérieur). Touchez la carte pour placer le marqueur.",
  locate_failed_title:  'Localisation impossible',
  perm_blocked_title:   'Localisation désactivée',
  perm_blocked_body:    "L'accès à la localisation est désactivé pour Provalk. Ouvrez les réglages pour l'activer, puis réessayez.",
  perm_open_settings:   'Ouvrir les réglages',
  perm_unavailable:     "Les services de localisation ne sont pas disponibles sur cet appareil.",
};

export default map_picker;

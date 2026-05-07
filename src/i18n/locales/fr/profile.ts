import type { ProfileNS } from '../types';

const profile: ProfileNS = {
  title: 'Mon profil',
  sections: {
    account:     'MON COMPTE',
    security:    'SÉCURITÉ',
    preferences: 'PRÉFÉRENCES',
    info:        'INFORMATIONS',
    legal:       'LÉGAL',
  },
  menu: {
    edit_profile:    'Modifier le profil',
    analytics:       'Analytiques',
    payment_history: 'Historique paiements',
    payment_methods: 'Mes cartes & SEPA',
    two_fa:          'Double authentification (2FA)',
    two_fa_enabled:  'Activé',
    two_fa_disabled: 'Désactivé',
    quick_login:     'Connexion rapide',
    notifications:   'Notifications',
    language:        'Langue',
    language_fr:     '🇫🇷  Français',
    language_en:     '🇬🇧  English',
    email:           'Email',
    phone:           'Téléphone',
    member_since:    'Membre depuis',
    version:         'Version',
    privacy_policy:  'Politique de confidentialité',
    terms:           'CGV',
  },
  hero: {
    verified:      'CLIENT VÉRIFIÉ',
    since:         'Depuis {{date}}',
    phone_not_set: 'Non renseigné',
  },
  language_picker: {
    title:    'Choisir la langue',
    subtitle: 'Sélectionnez votre langue préférée',
  },
  logout: {
    button:  'Se déconnecter',
    title:   'Déconnexion',
    message: 'Voulez-vous vous déconnecter de Provalk ?',
    confirm: 'Déconnecter',
    cancel:  'Annuler',
  },
  delete_account: 'Supprimer mon compte',
};

export default profile;

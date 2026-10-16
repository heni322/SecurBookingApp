import type { ProfileNS } from '../types';

const profile: ProfileNS = {
  title: 'My profile',
  sections: {
    account:     'MY ACCOUNT',
    security:    'SECURITY',
    preferences: 'PREFERENCES',
    info:        'INFORMATION',
    legal:       'LEGAL',
  },
  menu: {
    edit_profile:    'Edit profile',
    analytics:       'Analytics',
    payment_history: 'Payment history',
    payment_methods: 'My cards & SEPA',
    two_fa:          'Two-Factor Authentication (2FA)',
    two_fa_enabled:  'Enabled',
    two_fa_disabled: 'Disabled',
    two_fa_recommended: 'Off · recommended to protect your payments',
    quick_login:     'Quick login',
    notifications:   'Notifications',
    language:        'Language',
    language_fr:     '🇫🇷  Français',
    language_en:     '🇬🇧  English',
    email:           'Email',
    phone:           'Phone',
    member_since:    'Member since',
    version:         'Version',
    privacy_policy:  'Privacy policy',
    terms:           'Terms of use',
    sales_terms:     'Terms of sale',
    legal_notice:    'Legal notice',
    support:         'Contact support',
  },
  hero: {
    verified:      'VERIFIED ACCOUNT',
    since:         'Member since {{date}}',
    phone_not_set: 'Not provided',
    add_name:      'Add your name',
    account_id:    'Account ID · {{id}}',
    email_unverified: 'Email not verified',
    email_verified:   'Verified',
  },
  language_picker: {
    title:    'Choose language',
    subtitle: 'Select your preferred language',
  },
  logout: {
    button:  'Sign out',
    title:   'Sign out',
    message: 'Are you sure you want to sign out of Provalk?',
    confirm: 'Sign out',
    cancel:  'Cancel',
  },
  delete_account: 'Delete my account',
};

export default profile;

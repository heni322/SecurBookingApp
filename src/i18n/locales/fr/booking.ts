import type { BookingNS } from '../types';

const booking: BookingNS = {
  screen_title: 'Détail du booking',

  agent: {
    assigned_label:  'Agent assigné',
    cnaps_badge:     'CNAPS ✓',
    missions_count:  '{{count}} missions',
    follow_live:     "Suivre l'agent en direct",
    rating_empty:    '—',
  },

  applications: {
    section_title:   'Candidatures ({{count}})',
    more:            '+{{count}} autre candidature',
    more_plural:     '+{{count}} autres candidatures',
    waiting:         'En attente de candidatures agents…',
    select_title:    'Sélectionner un agent',
    select_subtitle: '{{count}} candidature en attente',
    select_subtitle_plural: '{{count}} candidatures en attente',
    choose_btn:      'Choisir',
    selecting:       'Attribution…',
    selected_title:  'Agent sélectionné',
    selected_body:   "L'agent a été assigné à ce poste.",
    select_error:    "Impossible de sélectionner l'agent",
  },

  checkins: {
    section_title:   'Pointages GPS',
    date_label:      'Date : {{date}}',
    checkin_label:   'Check-in · {{time}}',
    checkout_label:  'Check-out · {{time}}',
  },

  photos: {
    section_title:   'Photos de présence (CNAPS)',
    verified_badge:  'Vérifiées',
    no_photos_title: 'Photos de présence',
    caption:         'Photo horodatée · Agent {{name}}',
  },

  incidents: {
    section_title:   'Incidents ({{count}})',
    report_title:    'Signaler un incident',
    placeholder:     "Décrivez l'incident…",
    reported_title:  'Incident signalé',
    reported_body:   "Votre rapport a été transmis à l'équipe Provalk.",
    report_error:    "Impossible de signaler l'incident.",
  },

  actions: {
    rate_agent:      "Évaluer l'agent",
    already_rated:   'Vous avez déjà évalué cette mission',
    open_dispute:    'Ouvrir un litige',
  },

  uniforms: {
    STANDARD:     '🦺 Standard',
    CIVIL:        '👔 Civil',
    EVENEMENTIEL: '🤵 Soirée',
    SSIAP:        '🔥 SSIAP',
    CYNOPHILE:    '🐕 Cynophile',
  },

  statuses: {
    open:        'Ouvert',
    assigned:    'Assigné',
    in_progress: 'En cours',
    completed:   'Terminé',
    cancelled:   'Annulé',
    abandoned:   'Abandonné',
  },

  errors: {
    load:    'Impossible de charger le booking.',
    generic: 'Une erreur est survenue.',
  },
};

export default booking;

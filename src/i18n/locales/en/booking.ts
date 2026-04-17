import type { BookingNS } from '../types';

const booking: BookingNS = {
  screen_title: 'Booking detail',

  agent: {
    assigned_label:  'Assigned agent',
    cnaps_badge:     'CNAPS ✓',
    missions_count:  '{{count}} missions',
    follow_live:     'Follow agent live',
    rating_empty:    '—',
  },

  applications: {
    section_title:   'Applications ({{count}})',
    more:            '+{{count}} more application',
    more_plural:     '+{{count}} more applications',
    waiting:         'Waiting for agent applications…',
    select_title:    'Select an agent',
    select_subtitle: '{{count}} pending application',
    select_subtitle_plural: '{{count}} pending applications',
    choose_btn:      'Choose',
    selecting:       'Assigning…',
    selected_title:  'Agent selected',
    selected_body:   'The agent has been assigned to this position.',
    select_error:    'Unable to select the agent',
  },

  checkins: {
    section_title:   'GPS Check-ins',
    date_label:      'Date: {{date}}',
    checkin_label:   'Check-in · {{time}}',
    checkout_label:  'Check-out · {{time}}',
  },

  photos: {
    section_title:   'Presence photos (CNAPS)',
    verified_badge:  'Verified',
    no_photos_title: 'Presence photos',
    caption:         'Timestamped photo · Agent {{name}}',
  },

  incidents: {
    section_title:   'Incidents ({{count}})',
    report_title:    'Report an incident',
    placeholder:     'Describe the incident…',
    reported_title:  'Incident reported',
    reported_body:   'Your report has been sent to the SecurBook team.',
    report_error:    'Unable to report the incident.',
  },

  actions: {
    rate_agent:      'Rate agent',
    already_rated:   'You have already rated this mission',
    open_dispute:    'Open a dispute',
  },

  uniforms: {
    STANDARD:     '🦺 Standard',
    CIVIL:        '👔 Civil',
    EVENEMENTIEL: '🤵 Evening',
    SSIAP:        '🔥 SSIAP',
    CYNOPHILE:    '🐕 K9',
  },

  errors: {
    load:   'Unable to load booking.',
    generic: 'An error occurred.',
  },
};

export default booking;

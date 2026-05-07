import type { HomeNS } from '../types';

const home: HomeNS = {
  greeting: {
    morning: 'Good morning',
    evening: 'Good evening',
  },
  stats: {
    total:       'Total',
    completed:   'Completed',
    in_progress: 'In progress',
  },
  cta: {
    title:    'New mission',
    subtitle: 'Qualified agents in 48h',
  },
  active_mission: {
    label: 'ACTIVE MISSION',
  },
  recent: {
    title:   'Recent missions',
    see_all: 'See all',
  },
  empty: {
    title:    'No missions',
    subtitle: 'Create your first security mission.',
    action:   'Create a mission',
  },
  sos: {
    title:           'SOS Alert',
    body:            'By pressing "Send alert" you immediately notify the Provalk emergency teams and the relevant authorities.',
    send:            'Send alert',
    cancel:          'Cancel',
    success_title:   '🚨 Alert sent',
    success_body:    'Emergency teams have been notified.',
    error_body:      'Unable to send the alert. Call 911.',
    trigger_message: 'SOS alert triggered from the app',
  },
};

export default home;

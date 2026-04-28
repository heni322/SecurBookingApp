import type { TrackingNS } from '../types';

const tracking: TrackingNS = {
  screen_title:       'Suivi en direct',
  status_offline:     'Hors ligne — reconnexion…',
  status_live:        'En direct',
  status_waiting:     'En attente de position…',
  status_signal_lost: '⚠ Signal GPS perdu',
  map_loading:        'Chargement de la carte…',
  in_zone:            'En zone',
  out_of_zone:        'Hors zone',
  follow_agent_btn:   "Suivre l'agent",
  view_site_btn:      'Voir le site',
  sync_btn:           'Sync',
  last_seen:          'Vu {{time}}',
  attribution:        '© OpenStreetMap contributors',
};

export default tracking;

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
  updated_ago_s:      'Mis à jour il y a {{seconds}}s',
  zone_unknown:       "Localisation de l'agent…",
  attribution:        '© OpenStreetMap contributors',
  recenter_a11y:      'Recentrer sur la carte',
  close_a11y:         'Fermer',
  en_route:           'En route vers votre site',
  track_btn:          'Suivre',
  eta_label:          '~{{minutes}} min',
  eta_arriving:       "Arrivée imminente",
  eta_calculating:    'Estimation…',
};

export default tracking;

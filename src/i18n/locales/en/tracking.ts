import type { TrackingNS } from '../types';

const tracking: TrackingNS = {
  screen_title:       'Live tracking',
  status_offline:     'Offline — reconnecting…',
  status_live:        'Live',
  status_waiting:     'Waiting for position…',
  status_signal_lost: '⚠ GPS signal lost',
  map_loading:        'Loading map…',
  in_zone:            'In zone',
  out_of_zone:        'Out of zone',
  follow_agent_btn:   'Follow agent',
  view_site_btn:      'View site',
  sync_btn:           'Sync',
  last_seen:          'Last seen {{time}}',
  updated_ago_s:      'Updated {{seconds}}s ago',
  zone_unknown:       'Locating agent…',
  attribution:        '© OpenStreetMap contributors',
  recenter_a11y:      'Re-center on map',
  close_a11y:         'Close',
  en_route:           'On the way to your site',
  track_btn:          'Track',
  eta_label:          '~{{minutes}} min',
  eta_arriving:       'Arriving',
  eta_calculating:    'Estimating…',
};

export default tracking;

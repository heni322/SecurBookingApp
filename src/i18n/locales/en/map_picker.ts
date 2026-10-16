import type { MapPickerNS } from '../types';

const map_picker: MapPickerNS = {
  label:        'GPS position *',
  hint:         'Tap the map to place the marker · Drag to move',
  loading:      'Loading map…',
  validate_btn: 'Validate',
  validated:    'Validated',
  unlock_hint:  'Tap to adjust the position',
  position_saved:    'Position saved',
  address_resolving: 'Looking up the address…',
  perm_title:           'Location required',
  perm_message:         'Provalk needs your location to center the map.',
  perm_allow:           'Allow',
  perm_cancel:          'Cancel',
  perm_settings_hint:   'Enable location in your settings.',
  perm_denied_title:    'Permission denied',
  perm_denied:          'Location permission denied.',
  position_unavailable: 'Position not found. Turn on location, or tap the map to place the marker.',
  timeout_retry:        'GPS is not responding (common indoors). Tap the map to place the marker.',
  locate_failed_title:  'Location failed',
  perm_blocked_title:   'Location is turned off',
  perm_blocked_body:    'Location access is disabled for Provalk. Open Settings to enable it, then try again.',
  perm_open_settings:   'Open settings',
  perm_unavailable:     'Location services are not available on this device.',
};

export default map_picker;

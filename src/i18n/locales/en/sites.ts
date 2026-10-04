export default {
  save:         'Save',
  saving:       'Saving…',
  title:        'My sites',
  loading:      'Loading sites…',
  add:          'Add a site',
  new_title:    'New site',
  edit_title:   'Edit site',
  saved_title:  'Site saved',
  saved_body:   'The instructions have been updated.',
  save_error:   'Unable to save the site.',
  secret_error: 'Unable to save this code.',
  create_first: 'Save the site first to add access codes, posts and contacts.',

  empty: {
    title:   'No sites yet',
    message: 'Create a site to record access details, contacts and codes. They will be reused for every mission at this location.',
  },

  counts: {
    posts:    '{{count}} post',
    posts_other:    '{{count}} posts',
    contacts: '{{count}} contact',
    contacts_other: '{{count}} contacts',
    secrets:  '{{count}} code',
    secrets_other:  '{{count}} codes',
  },

  sections: {
    identity:     'Identification',
    access:       'Access',
    expectations: 'Specific requirements',
    codes:        'Access codes',
    posts:        'Posts to cover',
    contacts:     'Contacts',
  },

  fields: {
    label:   'Site name',
    address: 'Address',
    city:    'City',
    zipCode: 'Postcode',
  },

  access_hint:
    'Describe here what is NOT secret: gate location, reception, route. Codes are entered below and are encrypted.',
  access_placeholder:
    'e.g. delivery gate on Lecourbe street, badge to collect at reception…',
  expectations_placeholder:
    'e.g. hourly patrol required, no parking in front of the loading bay…',

  briefing_change_warning:
    'Changing the instructions will require agents to acknowledge them again before their next shift.',

  codes_hint:
    'Codes are encrypted and only visible to an agent during their shift. Every viewing is logged.',
  secret_label_placeholder: 'Label — e.g. key box, main entrance',
  secret_value_placeholder: 'Code',
  add_code:       'Add this code',
  stale_rotation: 'due for renewal',

  kinds: {
    BOITE_CLES: 'Key box',
    ALARME:     'Alarm',
    CADENAS:    'Padlock',
    BADGE:      'Badge',
    INTERPHONE: 'Intercom',
    AUTRE:      'Other',
  },

  roles: {
    REMISE_CLES:    'Key handover',
    RETOUR_CLES:    'Key return',
    ASTREINTE:      'On-call',
    HIERARCHIE:     'Management',
    DONNEUR_ORDRES: 'Client contact',
    TECHNIQUE:      'Technical',
    AUTRE:          'Other',
  },
} as const;

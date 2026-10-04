export default {
  save:         'Enregistrer',
  saving:       'Enregistrement…',
  title:        'Mes sites',
  loading:      'Chargement des sites…',
  add:          'Ajouter un site',
  new_title:    'Nouveau site',
  edit_title:   'Modifier le site',
  saved_title:  'Site enregistré',
  saved_body:   'Les consignes ont été mises à jour.',
  save_error:   'Impossible d’enregistrer le site.',
  secret_error: 'Impossible d’enregistrer ce code.',
  create_first: 'Enregistrez le site pour pouvoir ajouter des codes d’accès, des postes et des contacts.',

  empty: {
    title:   'Aucun site enregistré',
    message: 'Créez un site pour y consigner les moyens d’accès, les contacts et les codes. Ils seront réutilisés à chaque mission sur ce lieu.',
  },

  counts: {
    posts:    '{{count}} poste',
    posts_other:    '{{count}} postes',
    contacts: '{{count}} contact',
    contacts_other: '{{count}} contacts',
    secrets:  '{{count}} code',
    secrets_other:  '{{count}} codes',
  },

  sections: {
    identity:     'Identification',
    access:       'Moyens d’accès',
    expectations: 'Attentes particulières',
    codes:        'Codes d’accès',
    posts:        'Postes à occuper',
    contacts:     'Contacts',
  },

  fields: {
    label:   'Nom du site',
    address: 'Adresse',
    city:    'Ville',
    zipCode: 'Code postal',
  },

  access_hint:
    'Décrivez ici ce qui n’est PAS secret : emplacement du portail, accueil, cheminement. Les codes se saisissent plus bas, ils sont chiffrés.',
  access_placeholder:
    'Ex. : portail livraisons côté rue Lecourbe, badge à retirer à l’accueil…',
  expectations_placeholder:
    'Ex. : ronde horaire obligatoire, pas de stationnement devant le quai…',

  briefing_change_warning:
    'Modifier les consignes obligera les agents à les réacquitter avant leur prochaine prise de service.',

  codes_hint:
    'Les codes sont chiffrés et ne sont visibles par un agent que pendant sa vacation. Chaque consultation est enregistrée.',
  secret_label_placeholder: 'Libellé — ex. : boîte à clés entrée principale',
  secret_value_placeholder: 'Code',
  add_code:       'Ajouter ce code',
  stale_rotation: 'à renouveler',

  kinds: {
    BOITE_CLES: 'Boîte à clés',
    ALARME:     'Alarme',
    CADENAS:    'Cadenas',
    BADGE:      'Badge',
    INTERPHONE: 'Interphone',
    AUTRE:      'Autre',
  },

  roles: {
    REMISE_CLES:    'Remise des clés',
    RETOUR_CLES:    'Retour des clés',
    ASTREINTE:      'Astreinte',
    HIERARCHIE:     'Hiérarchie',
    DONNEUR_ORDRES: 'Donneur d’ordres',
    TECHNIQUE:      'Technique',
    AUTRE:          'Autre',
  },
} as const;

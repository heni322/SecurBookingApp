/**
 * Tâches de mission et modération des observations (docs/mission-tasks/AUDIT.md côté API).
 */
export default {
  section_title:        'Tâches attendues',
  section_hint:         'Pour chaque prestation, cochez ce que l’agent doit faire.',
  loading:              'Chargement des tâches…',
  no_service:           'Choisissez d’abord une prestation dans les créneaux.',
  no_task:              'Aucune tâche n’est encore proposée pour ce service.',
  exclusions_title:     'Ce que l’agent ne fait pas',
  contract_notice:      'La mission comprend uniquement les tâches sélectionnées. Les observations sont informatives.',
  on_validation:        'sur validation',
  prefectoral:          'autorisation préfectorale',
  validation_notice:    'Une tâche « sur validation » est examinée par Provalk avant que le devis puisse être accepté.',
  notes_hint:           'Contexte utile aux agents. Les observations sont informatives et non contractuelles : elles n’ajoutent aucune tâche.',
  detail_title:         'Tâches de la mission',
  detail_empty:         'Aucune tâche détaillée : la mission couvre les missions habituelles de la prestation commandée.',
  status_pending:       'en attente de validation',
  status_rejected:      'refusée',
  review_pending:       'Vos observations sont en cours de relecture : elles seront transmises aux agents après validation.',
  review_rejected:      'Vos observations n’ont pas été validées : elles ne sont pas transmises aux agents.',
  moderation_confirm_title: 'Une précision ne fait pas partie de la mission',
  moderation_blocked_title: 'Une précision ne peut pas être transmise',
  moderation_fix:       'Corriger',
  moderation_maintain:  'Maintenir mon texte',
  moderation_maintain_hint: 'Votre texte sera relu par Provalk et transmis aux agents seulement après validation.',
} as const;
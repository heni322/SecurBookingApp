/**
 * Mission tasks and moderation of client notes (see the API's docs/mission-tasks/AUDIT.md).
 */
export default {
  section_title:        'Expected tasks',
  section_hint:         'For each service, tick what the officer must do.',
  loading:              'Loading tasks…',
  no_service:           'Pick a service in the time slots first.',
  no_task:              'No task is offered for this service yet.',
  exclusions_title:     'What the officer does not do',
  contract_notice:      'The assignment covers only the selected tasks. Notes are for information only.',
  on_validation:        'subject to approval',
  prefectoral:          'prefectoral authorisation',
  validation_notice:    'A task “subject to approval” is reviewed by Provalk before the quote can be accepted.',
  notes_hint:           'Context useful to the officers. Notes are for information only and add no task.',
  detail_title:         'Assignment tasks',
  detail_empty:         'No detailed task: the assignment covers the usual duties of the ordered service.',
  status_pending:       'awaiting approval',
  status_rejected:      'refused',
  review_pending:       'Your notes are being reviewed: they will reach the officers once approved.',
  review_rejected:      'Your notes were not approved: they are not passed on to the officers.',
  moderation_confirm_title: 'A note is not part of the assignment',
  moderation_blocked_title: 'A note cannot be passed on',
  moderation_fix:       'Edit',
  moderation_maintain:  'Keep my text',
  moderation_maintain_hint: 'Provalk will review your text and pass it on to the officers only once approved.',
} as const;
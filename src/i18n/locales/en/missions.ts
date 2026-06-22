import type { MissionsNS } from '../types';

const missions: MissionsNS = {
  title: 'Missions', subtitle_one: '{{count}} mission', subtitle_other: '{{count}} missions',
  new: 'New', search_placeholder: 'Search a mission...', card_fallback_title: 'Mission in {{city}}',
  starts_in_min:   'Starts in {{count}} min',
  starts_in_hours: 'Starts in {{h}}h{{m}}',
  starts_in_days_one:   'Starts in {{count}} day',
  starts_in_days_other: 'Starts in {{count}} days', card_urgent: 'Urgent',

  filters: {
    all: 'All',
    active: 'Active',
    created: 'Created',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },

  empty: {
    no_results: 'No results', no_missions: 'No missions', filter_label: 'No "{{filter}}" missions',
    search_sub: 'No mission matches "{{query}}".', all_sub: 'Create your first security mission.',
    category_sub: 'No missions in this category.', action: 'Create a mission',
  },

  error: {
    title: 'Unable to load missions',
    subtitle: 'Check your connection and try again.',
    retry: 'Try again',
  },

  a11y: {
    loading:               'Loading missions',
    refreshing:            'Refreshing mission list',
    retry:                 'Retry loading missions',
    new_mission:           'Create a new mission',
    new_mission_hint:      'Opens the mission creation flow',
    search:                'Search missions',
    filter_bar:            'Filter missions by status',
    filter_chip:           'Filter by {{label}}',
    filter_chip_with_count:'Filter by {{label}}, {{count}} missions',
    mission_list:          'Mission list, {{count}} items',
  },

  detail: {
    status: 'Status', location: 'Location', date: 'Date', agent: 'Agent',
    cancel: 'Cancel mission', rate: 'Rate agent', track: 'Live tracking',
    screen_title: 'Mission detail', loading: 'Loading...', error_load: 'Unable to load mission.', retry: 'Retry',
    cancel_title: 'Cancel mission', cancel_body: 'This action is irreversible. Continue?',
    cancel_back: 'Back', cancel_confirm: 'Cancel', cancel_error: 'Unable to cancel',
    duration: 'Duration', created_on: 'Created on',
    cta_get_quote: 'Get a quote',
    cta_see_quote: 'View quote',
    cta_edit: 'Edit mission',
    cta_pay: 'View quote & pay',
    cta_select: 'Select agents',
    cta_waiting: 'Waiting for applications...',
    cta_assigning: 'Agent being assigned automatically...',
    cta_messaging: 'Mission messaging',
    badge_live: 'LIVE',
    badge_approach: 'AGENT EN ROUTE',
    badge_urgent: 'URGENT',
    sepa_settling_title:   'SEPA payment settling',
    sepa_settling_body:    'Your SEPA payment is still settling (1-3 business days). Your mission is already published; the agent can begin once the funds clear.',
    section_approach: 'Agent approaching',
    section_location: 'Mission location',
    section_notes: 'Notes & instructions',
    section_bookings: 'Positions',
    total_ttc: 'Total incl. VAT',
  },

  edit: {
    screen_title: 'Edit mission',
    loading:      'Loading mission…',
    save_btn:     'Save',
    saved_toast:  'Mission updated.',
  },

  statuses: {
    created:     'Created',
    published:   'Published',
    staffing:    'Staffing in progress',
    staffed:     'Agents assigned',
    in_progress: 'In progress',
    completed:   'Completed',
    cancelled:   'Cancelled',
  },

  success: {
    title: 'Mission launched!',
    subtitle: 'Your payment is confirmed. Our qualified agents in your area will receive a notification shortly.',
    timeline_title: 'MISSION STEPS',
    step_confirmed:   'Mission confirmed & paid',
    step_published:   'Published to agents in your area',
    step_selection:   'Agent selection',
    step_operational: 'Mission operational',
    step_done: 'DONE',
    info: 'You will receive a push notification and email as soon as an agent applies. Your invoice is available in your account.',
    home: 'Back to home',
    pending_title: 'Confirming payment...',
    pending_subtitle: 'We are verifying payment receipt. This usually takes a few seconds.',
    timeout_title: 'Payment being processed',
    timeout_subtitle: 'For SEPA payments, confirmation can take 1–2 business days. You will be notified once confirmed.',
    timeout_info: 'Your mission will be published to agents automatically once payment is received.',
    follow_mission: 'Follow my mission',
  },

  select_agent: {
    title: 'Choose an agent',
    subtitle_one: '{{count}} application available',
    subtitle_other: '{{count}} applications available',
    empty_title: 'No applications', empty_subtitle: 'No agent has applied yet. Check back in a few moments.',
    intro: 'Compare profiles and select the agent who will work this position.',
    confirm_title: 'Confirm selection',
    confirm_body: 'Assign {{name}} to this position? Other applications will be automatically rejected.',
    success_title: 'Agent selected', success_body: '{{name}} has been assigned to this position.',
    error: 'Unable to select this agent', select_btn: 'Select this agent',
    selecting: 'Assigning...', experienced: 'Experienced', loading: 'Loading applications...',
  },

  create: {
    step_one: 'Step 1 of 3 · Uniforms & agents',
    step_two: 'Step 2 of 3 · Location',
    step_three: 'Step 3 of 3 · Scheduling',
    service_required_title: 'Service required', service_required_body: 'Select at least one service.',
    map_position_required: 'Select a position on the map', start_required: 'Start date is required',
    duration_min: 'Minimum duration: 6 hours (legal requirement)', duration_max: 'Maximum duration: 10 days',
    end_before_start: 'End must be after start',
    start_min_future: 'Mission must start at least 1 hour from now',
    error_create: 'Error while creating',
    title_placeholder: 'E.g. Private evening security',
    instructions_placeholder: 'Special instructions for agents...',
    schedule_title: 'When does the mission take place?',
    start_label: 'Mission start *', start_hint: 'At earliest in 1 hour',
    end_hint: 'Minimum legal duration: 6 hours',
    summary_start: 'Start', summary_duration: 'Duration',
    next_btn: 'Next step', create_btn: 'Create and get a quote',
    address_required: 'Address required', city_required: 'City required',
    end_required: 'End date required',
    uniform_per_agent: 'UNIFORM PER AGENT',
    total_agents: '{{count}} agent · {{lines}} service',
    add_service: 'Add a service',
    summary_title: 'SUMMARY',
    recap_section: 'SERVICES & UNIFORMS',
    urgency_note: 'Urgency surcharge applicable',
    title_label:       'Title (optional)',
    notes_label:       'Notes / instructions (optional)',
    city_label:        'City *',
    city_placeholder:  'London',
    zip_label:         'Postcode',
    zip_placeholder:   'SW1A 1AA',
    address_placeholder: 'Search an address…',
    summary_location:  'Location',
    summary_end:       'End',
    end_label:         'Mission end *',
    total_agents_label:'Total agents',
    step_one_title:    'Uniforms & agents',
    duration_hours:    '{{hours}} hours mission',
    step_two_title:    'Mission location',
    agent_label:       'Agent {{n}}',
    amplitude_max:     'Mission too long: {{h}}h (max 12h per mission).',
    weekly_cap:        'Weekly limit reached: {{h}}h worked (max 48h from Mon to Sun).',
    rest_between:      'Insufficient rest: only {{h}}h between two missions (min 11h required).',
    rest_after_cap:    '24h rest required after reaching the 48h weekly cap.',

    // ── Multi-slot scheduling ───────────────────────────────────────────────
    slot_mode_single: 'Single time window',
    slot_mode_multi:  'Multiple time windows',
    slot_mode_hint:   'Add multiple time windows for multi-day missions or variable hours. Each window must be at least 6 hours.',

    slots_section_title: 'TIME WINDOWS',
    slot_add_btn:        'Add a time window',
    slot_label:          'Window {{n}}',
    slot_notes_placeholder: 'E.g. Monday night shift…',
    slot_remove:         'Remove this time window',

    slot_start_required:   'Window start date is required',
    slot_end_required:     'Window end date is required',
    slot_end_before_start: 'Window end must be after its start',
    slot_duration_min:     'Minimum window duration: 6 hours (legal requirement)',
    slot_overlap:          'Time windows cannot overlap',
    slot_required:         'Add at least one time window',
    slot_max:              'Maximum 30 time windows',

    slot_duration_badge:  '{{hours}} h',
    slots_total_duration: 'Total: {{hours}} h · {{count}} window',

    summary_slots:       'Time windows',
    summary_slots_one:   '{{count}} window',
    summary_slots_other: '{{count}} windows',

    slot_lines_default:  'Default agents: {{count}}',
    slot_lines_custom:   'Custom agents: {{count}}',
    slot_lines_reset:    'Reset to default agents',
    slot_lines_required: 'Add at least one position for this slot',

    // ── Redesigned 3-step wizard ───────────────────────────────────────────
    step_where:      'Step 1 of 3 · Location',
    step_when:       'Step 2 of 3 · When',
    step_review:     'Step 3 of 3 · Review',

    progress_where:  'Location',
    progress_when:   'When',
    progress_review: 'Review',

    where_title:     'Where is the mission?',
    where_subtitle:  'Enter the exact mission address.',
    when_title:      'When does the mission take place?',
    when_subtitle:   'Pick a quick preset or set custom hours.',
    review_title:    'All set?',
    review_subtitle: 'Review the details before generating your quote.',

    edit_btn:         'Edit',
    summary_when:     'Date & time',
    summary_services: 'Services',

    preset_section:   'Quick presets',
    preset_tonight:   'Tonight',
    preset_tomorrow:  'Tomorrow',
    preset_weekend:   'This weekend',
    custom_section:   'Custom hours',

    add_another_slot:      'Add another time slot',
    add_another_slot_hint: 'For multi-day missions or variable schedules.',
    slots_count:           '{{n}} time slots',

    optional_section: 'Additional info (optional)',

    // ── Per-slot customization ─────────────────────────────────────────
    customize_for_slot:        'Customize for this slot',
    slot_uniform_label:        'Uniform for this slot',
    slot_line_excluded_note:   'This service is excluded from this slot',
    slot_total_agents:         '{{count}} agents total',
    custom_label:              'Custom',
    summary_services_default:  'Default services',

    // ── Copy-from-slot feature ─────────────────────────────────────────
    slot_copy_from:    'Copy from slot {{n}}',

    // ── Slot header date summary ───────────────────────────────────────
    slot_date_summary: '{{start}} → {{end}}',
    slot_date_pending: 'No dates set yet',

    // Footer status
    footer_step_progress: 'Step {{current}} of {{total}}',
    footer_ready:         'Ready to publish',
    slots_total_short:    '{{count}} slots · {{hours}}h',

    // ── Review step enrichments ────────────────────────────────────────
    review_agent_hours:  '{{hours}} estimated agent-hours',
    review_slot_summary: '{{agents}} agent · {{hours}}h',

    // ── ENTERPRISE UX: draft autosave / restore ─────────────────────────
    draft_restore_title:    'Resume your draft?',
    draft_restore_subtitle: 'You have an unfinished mission (saved {{when}}).',
    relative_just_now:  'just now',
    relative_min_ago:   '{{count}} min ago',
    relative_hours_ago: '{{count}} h ago',
    relative_days_ago:  '{{count}} d ago',
    draft_restore_btn:      'Resume',
    draft_discard_btn:      'Start over',
    draft_discard_confirm_title:   'Discard draft?',
    draft_discard_confirm_message: 'All entered information will be lost.',
    draft_discard_confirm_btn:     'Discard',

    // ── ENTERPRISE UX: smarter footer ───────────────────────────────────
    next_to_when:    'Continue · When',
    next_to_review:  'Continue · Review',
    footer_back:     'Back',

    // ── ENTERPRISE UX: cross-slot error banner ──────────────────────────
    cross_slot_error_title:    'Time-slot conflict',
    cross_slot_error_subtitle: 'Some windows overlap or do not meet legal duration limits.',
    cross_slot_error_jump:     'Go to slot {{n}}',

    // ── ENTERPRISE UX: multi-slot escape ────────────────────────────────
    exit_multi_slot:                 'Back to a single window',
    exit_multi_slot_confirm_title:   'Back to a single time window?',
    exit_multi_slot_confirm_message: 'Other slots and their customisations will be removed.',
    exit_multi_slot_confirm_btn:     'Back to single window',

    // ── ENTERPRISE UX: review price estimate ────────────────────────────
    review_estimate_label:  'INDICATIVE ESTIMATE',
    review_estimate_amount: '≈ {{amount}} excl. VAT',
    review_estimate_note:   'The final price (with night / weekend surcharges and VAT) will be computed on the next screen.',

    // ── ENTERPRISE UX: structured submit error ──────────────────────────
    step_where_2:        'Step 1 of 2 - Location',
    step_staff_2:        'Step 2 of 2 - When & agents',
    progress_staff:      'When & agents',
    next_to_staff:       'Continue - Agents',
    when_staff_title:    'When and with whom?',
    when_staff_subtitle: 'Set each time slot and the agents assigned to it.',
    creneau_label:       'Slot {{n}}',
    add_another_creneau: 'Add a time slot',
    staff_section:       'SLOT STAFFING',
    staff_empty:         'No service for this slot',
    staff_empty_hint:    'Add at least one service below.',
    staff_add_service:   'Add a service',
    staff_loading:       'Loading services...',
    staff_services_empty: 'No service available',
    staff_all_added:     'All services already added',
    staff_rate_per_hour: '{{rate}}/h - agent',
    submit_error_title:    'Unable to create the mission',
    submit_error_jump_to:  'Edit',
    submit_error_network:  'Check your connection and try again.',
  },
};

export default missions;

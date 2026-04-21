import type { MissionsNS } from '../types';

const missions: MissionsNS = {
  title: 'Missions', subtitle_one: '{{count}} mission', subtitle_other: '{{count}} missions',
  new: 'New', search_placeholder: 'Search a mission...', card_fallback_title: 'Mission in {{city}}', card_urgent: 'Urgent',

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
    search:                'Search missions',
    filter_bar:            'Filter missions by status',
    filter_chip:           'Filter by {{label}}',
    filter_chip_with_count:'Filter by {{label}}, {{count}} missions',
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
    cta_pay: 'View quote & pay',
    cta_select: 'Select agents',
    cta_waiting: 'Waiting for applications...',
    cta_messaging: 'Mission messaging',
  },

  // Flow: CREATED → PUBLISHED → STAFFING → STAFFED → IN_PROGRESS → COMPLETED
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
    radius_min: 'Minimum radius: 5 km', radius_max: 'Maximum radius: 500 km',
    error_create: 'Error while creating',
    title_placeholder: 'E.g. Private evening security',
    instructions_placeholder: 'Special instructions for agents...',
    schedule_title: 'When does the mission take place?',
    start_label: 'Mission start *', start_hint: 'At earliest in 1 hour',
    end_hint: 'Minimum legal duration: 6 hours',
    summary_start: 'Start', summary_duration: 'Duration',
    next_btn: 'Next step', create_btn: 'Create and get a quote',
  },
};

export default missions;

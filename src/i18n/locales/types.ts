/**
 * locales/types.ts — Complete namespace shape definitions.
 * Both EN and FR implement these interfaces — no literal-type cross-lock.
 */

export interface CommonNS {
  cancel:        string;
  save:          string;
  confirm:       string;
  close:         string;
  retry:         string;
  yes:           string;
  no:            string;
  ok:            string;
  loading:       string;
  error:         string;
  success:       string;
  unknown_error: string;
  tls_badge: string; map_loading: string; total_spent: string; }

export interface AuthNS {
  login: {
    tagline: string; title: string; subtitle: string;
    email_label: string; email_placeholder: string;
    password_label: string; password_placeholder: string;
    submit: string; submitting: string; secure_text: string;
    no_account: string; create_link: string; biometrics: string;
    errors: { email_required: string; email_invalid: string; password_required: string; invalid_creds: string; generic: string; };
    alert: { title: string; };
  };
  register: {
    title: string; subtitle: string;
    perks: { verified: string; quote: string; payment: string; };
    account_type: string; individual: string; individual_sub: string;
    company: string; company_sub: string;
    full_name_label: string; full_name_placeholder: string;
    phone_label: string; phone_placeholder: string;
    password_hint: string; password_placeholder: string;
    submit: string; rgpd: string; has_account: string; login_link: string;
    errors: { full_name_required: string; email_required: string; email_invalid: string; password_length: string; generic: string; };
    alert: { title: string; };
  };
  onboarding: {
    next: string; skip: string; get_started: string;
    slides: {
      security_title: string; security_subtitle: string;
      tracking_title: string; tracking_subtitle: string;
      payment_title: string; payment_subtitle: string;
    };
  };
  two_fa: {
    title: string; description: string; placeholder: string;
    submit: string; submitting: string; invalid: string;
  };
  two_fa_screen: {
    header: string; title: string; subtitle: string;
    verify: string; incomplete_title: string; incomplete_body: string;
    invalid_title: string; invalid_body: string;
    resend: string; resent_title: string; resent_body: string; resend_error: string;
  };
}

export interface HomeNS {
  greeting: { morning: string; evening: string; };
  stats: { total: string; completed: string; in_progress: string; };
  cta: { title: string; subtitle: string; };
  active_mission: { label: string; };
  recent: { title: string; see_all: string; };
  empty: { title: string; subtitle: string; action: string; };
  sos: {
    title: string; body: string; send: string; cancel: string;
    success_title: string; success_body: string; error_body: string; trigger_message: string;
  };
}

export interface MissionsNS {
  title: string; subtitle_one: string; subtitle_other: string;
  new: string; search_placeholder: string; card_fallback_title: string; card_urgent: string;
  filters: { all: string; active: string; created: string; completed: string; cancelled: string; };
  empty: {
    no_results: string; no_missions: string; filter_label: string;
    search_sub: string; all_sub: string; category_sub: string; action: string;
  };
  error: {
    title: string; subtitle: string; retry: string;
  };
  a11y: {
    loading: string; refreshing: string; retry: string; new_mission: string; search: string;
    filter_bar: string; filter_chip: string; filter_chip_with_count: string;
  };
  detail: {
    status: string; location: string; date: string; agent: string;
    cancel: string; rate: string; track: string;
    screen_title: string; loading: string; error_load: string; retry: string;
    cancel_title: string; cancel_body: string; cancel_back: string; cancel_confirm: string;
    cancel_error: string; duration: string; created_on: string;
    cta_get_quote: string; cta_see_quote: string; cta_pay: string; radius: string;
    cta_select: string; cta_waiting: string; cta_assigning: string; cta_messaging: string;
  };
  statuses: { created: string; published: string; staffing: string; staffed: string; in_progress: string; completed: string; cancelled: string; };
  success: {
    title: string; subtitle: string; timeline_title: string;
    step_confirmed: string; step_published: string; step_selection: string; step_operational: string;
    step_done: string; info: string; home: string;
    pending_title: string; pending_subtitle: string;
    timeout_title: string; timeout_subtitle: string; timeout_info: string;
    follow_mission: string;
  };
  select_agent: {
    title: string; subtitle_one: string; subtitle_other: string;
    empty_title: string; empty_subtitle: string; intro: string;
    confirm_title: string; confirm_body: string;
    success_title: string; success_body: string; error: string;
    select_btn: string; selecting: string; experienced: string; loading: string;
  };
  create: {
    step_one: string; step_two: string; step_three: string;
    service_required_title: string; service_required_body: string;
    map_position_required: string; start_required: string;
    duration_min: string; duration_max: string; end_before_start: string;
    start_min_future: string; radius_min: string; radius_max: string;
    error_create: string;
    title_placeholder: string; instructions_placeholder: string;
    schedule_title: string; start_label: string; start_hint: string;
    end_hint: string; summary_start: string; summary_duration: string;
    next_btn: string; create_btn: string;
    address_required: string; city_required: string; end_required: string;
    uniform_per_agent: string; total_agents: string; add_service: string;
    summary_title: string; recap_section: string; urgency_note: string;
    title_label: string; notes_label: string;
    radius_label: string; radius_hint: string;
    address_placeholder: string;
    city_label: string; city_placeholder: string;
    zip_label: string; zip_placeholder: string;
    end_label: string;
    summary_location: string; summary_end: string; total_agents_label: string;
    duration_hours: string; step_two_title: string; agent_label: string;
    amplitude_max: string; weekly_cap: string; rest_between: string; rest_after_cap: string;
  };
}

export interface ProfileNS {
  title: string;
  sections: { account: string; security: string; preferences: string; info: string; legal: string; };
  menu: {
    edit_profile: string; analytics: string; payment_history: string; payment_methods: string;
    two_fa: string; two_fa_enabled: string; two_fa_disabled: string;
    quick_login: string; notifications: string; language: string;
    language_fr: string; language_en: string;
    email: string; phone: string;
    member_since: string; version: string; privacy_policy: string; terms: string;
  };
  hero: { verified: string; since: string; phone_not_set: string; };
  language_picker: { title: string; subtitle: string; };
  logout: { button: string; title: string; message: string; confirm: string; cancel: string; };
  delete_account: string;
}

export interface NavigationNS {
  tabs: { home: string; missions: string; notifications: string; profile: string; };
}

export interface NotificationsNS {
  title: string;
  all_up_to_date: string;
  unread_one: string;
  unread_other: string;
  mark_all_read: string;
  strip_one: string;
  strip_other: string;
  loading: string;
  empty_title: string;
  empty_subtitle: string;
}

export interface QuoteNS {
  title: string; loading: string;
  empty_title: string; empty_subtitle: string;
  pending_banner: string;
  payment_method: string; card: string; sepa: string; offline: string;
  accept: string; accepting: string;
  pay_card: string; pay_sepa: string; pay_offline: string; paying: string;
  expired_title: string; expired_body: string; recalculate: string;
  countdown_warning: string; countdown_urgent: string;
  error_accept: string; error_pay: string;
  accepted_banner: string;
  secure_note: string;
  sepa_note: string;
  offline_note: string; breakdown_title: string; agent_payout: string; accepted_badge: string; row_base_ht: string; row_night: string; row_weekend: string; row_urgency: string; row_subtotal: string; row_vat: string; row_total_ttc: string; row_commission: string; valid_until: string; accept_label: string; }

export interface PaymentNS {
  title_card: string; title_sepa: string; secured_by: string;
  incomplete_card: string; sepa_failed: string; card_failed: string;
  sepa_success: string; card_success: string;
  sepa_success_body: string; card_success_body: string;
  home: string;
  stripe_info_sepa: string; stripe_info_card: string; sepa_legal: string; amount_sub: string; invoice_ref: string; invoice_count: string; invoice_open_error: string;
  errors: {
    card_declined: string; expired_card: string; incorrect_number: string;
    invalid_expiry_year: string; processing_error: string; do_not_honor: string;
    invalid_iban: string; sepa_unexpected: string; generic: string;
  };
  history: {
    title: string; empty_subtitle: string;
    status: { paid: string; failed: string; refunded: string; pending: string; processing: string; };
  };
  methods: {
    title: string; delete_error: string;
    security_1: string; security_2: string; security_3: string;
  };
  offline: {
    title: string; subtitle: string;
    method_virement: string; method_cheque: string;
    method_bank: string; method_postal: string;
    confirm_virement: string; confirm_cheque: string; confirming: string;
    delay_title: string; delay_virement: string; delay_cheque: string;
    info_virement: string; info_cheque: string;
    declared_title: string; declared_subtitle_virement: string; declared_subtitle_cheque: string;
    iban_label: string; bic_label: string; ref_label: string;
    beneficiary_label: string; payable_label: string; address_label: string;
    amount_exact: string; amount_cheque: string;
    bank_coords_title: string; cheque_title: string;
    follow_mission: string;
    copied: string;
  };
}

export interface AccountNS {
  edit: {
    title: string; avatar_hint: string; full_name_label: string; phone_label: string;
    full_name_placeholder: string; phone_placeholder: string;
    name_required_title: string; name_required_body: string;
    save: string; saved: string; error: string;
  };
  delete: {
    title: string; screen_title: string;
    warning_title: string; warning_body: string;
    deleted_items_title: string;
    item_personal: string; item_missions: string; item_payments: string;
    item_conversations: string; item_ratings: string;
    password_label: string; password_placeholder: string;
    phrase_label: string; phrase_error: string; confirm_phrase: string;
    confirm_title: string; confirm_body: string;
    cancel: string; delete_btn: string; deleting: string; error: string;
  };
  two_fa: {
    title: string; loading: string;
    status_enabled: string; status_disabled: string;
    status_body_enabled: string; status_body_disabled: string;
    setup_btn: string;
    scan_title: string; scan_subtitle: string; secret_label: string; scanned_btn: string;
    verify_title: string; verify_subtitle: string;
    code_placeholder: string; verify_btn: string; verifying: string;
    code_required_title: string; code_required_body: string;
    invalid_title: string; invalid_body: string;
    done_title: string; done_subtitle: string; done_close: string;
    disable_title: string; disable_body: string;
    disable_cancel: string; disable_confirm: string;
    disable_code_title: string; disable_code_body: string;
    disabled_title: string; disabled_body: string;
    perk_code_title: string; perk_code_body: string;
    error_setup: string;
  };
}

export interface BookingNS {
  screen_title: string;
  agent: { assigned_label: string; cnaps_badge: string; missions_count: string; follow_live: string; rating_empty: string; };
  applications: {
    section_title: string; more: string; more_plural: string; waiting: string;
    select_title: string; select_subtitle: string; select_subtitle_plural: string;
    choose_btn: string; selecting: string;
    selected_title: string; selected_body: string; select_error: string;
  };
  checkins: { section_title: string; date_label: string; checkin_label: string; checkout_label: string; };
  photos: { section_title: string; verified_badge: string; no_photos_title: string; caption: string; };
  incidents: { section_title: string; report_title: string; placeholder: string; reported_title: string; reported_body: string; report_error: string; };
  actions: { rate_agent: string; already_rated: string; open_dispute: string; };
  uniforms: { STANDARD: string; CIVIL: string; EVENEMENTIEL: string; SSIAP: string; CYNOPHILE: string; };
  /** Status labels for BookingCard badge - mirrors BookingStatus enum values. */
  statuses: { open: string; assigned: string; in_progress: string; completed: string; cancelled: string; abandoned: string; };
  errors: { load: string; generic: string; };
}

export interface RatingNS {
  screen_title: string;
  steps: { rating: string; nps: string; comment: string; };
  star_labels: string[]; // 6 entries - index 0 unused, 1-5 = star labels
  step_rating: { title: string; subtitle: string; };
  step_nps: { title: string; subtitle: string; detractors: string; passives: string; promoters: string; };
  step_comment: { title: string; subtitle: string; placeholder: string; char_count: string; skip: string; tags: string[]; };
  nps_scale: string[]; // 11 entries, index 0-10
  nps_categories: { promoter: string; passive: string; detractor: string; };
  done: { title: string; back_btn: string; };
  nav: { back: string; continue: string; submit: string; sending: string; };
  errors: { score_required_title: string; score_required_body: string; nps_required_title: string; nps_required_body: string; generic: string; };
}

export interface DisputeNS {
  screen_title: string; done_title: string; back_btn: string;
  reasons: {
    agent_absent: { label: string; desc: string; };
    agent_late:   { label: string; desc: string; };
    quality:      { label: string; desc: string; };
    billing:      { label: string; desc: string; };
    behavior:     { label: string; desc: string; };
    other:        { label: string; desc: string; };
  };
  form: { description_placeholder: string; };
  submit: string; submitting: string;
  errors: { reason_required_title: string; reason_required_body: string; desc_too_short_title: string; desc_too_short_body: string; generic: string; };
}

export interface TrackingNS {
  screen_title: string; status_offline: string; status_live: string; status_waiting: string;
  /** Shown when socket is connected but GPS signal hasn't updated in 30 s. */
  status_signal_lost: string;
  /** Shown in the map WebView loading overlay. */
  map_loading: string;
  in_zone: string; out_of_zone: string;
  follow_agent_btn: string; view_site_btn: string; sync_btn: string;
  last_seen: string; attribution: string;
}

export interface ConversationNS {
  screen_title: string; loading: string; placeholder: string;
  send: string; empty_title: string; empty_subtitle: string;
}

export interface ServicesNS {
  screen_title: string; subtitle: string; continue_btn: string;
  summary_agents: string; summary_agents_plural: string;
  empty: { title: string; subtitle: string; };
  agent_config: { hide_detail: string; configure_agents: string; }; available_title: string; same_uniform_label: string; add_btn: string; clear_all: string; uniforms_none: string; agents_and_uniforms: string; summary: string;
  uniforms: {
    STANDARD:     { label: string; desc: string; emoji: string; };
    CIVIL:        { label: string; desc: string; emoji: string; };
    EVENEMENTIEL: { label: string; desc: string; emoji: string; };
    SSIAP:        { label: string; desc: string; emoji: string; };
    CYNOPHILE:    { label: string; desc: string; emoji: string; };
  };
}
export interface MapPickerNS {
  label: string; hint: string; loading: string;
  validate_btn: string; validated: string; unlock_hint: string;
}

export interface AnalyticsNS {
  missions_per_month: string;
}

export interface OfflineBannerNS {
  no_connection: string;
}
/** Union of all namespaces â€” drives i18next CustomTypeOptions. */
export interface LocaleResources {
  common:        CommonNS;
  auth:          AuthNS;
  home:          HomeNS;
  missions:      MissionsNS;
  profile:       ProfileNS;
  navigation:    NavigationNS;
  notifications: NotificationsNS;
  quote:         QuoteNS;
  payment:       PaymentNS;
  account:       AccountNS;
  booking:       BookingNS;
  rating:        RatingNS;
  dispute:       DisputeNS;
  tracking:      TrackingNS;
  conversation: ConversationNS; services: ServicesNS; map_picker: MapPickerNS; analytics: AnalyticsNS; offline_banner: OfflineBannerNS; }


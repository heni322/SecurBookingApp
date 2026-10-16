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
  tls_badge: string; map_loading: string; total_spent: string;
  search_address: string; address_label: string; clear: string; address_no_result: string; address_search_error: string;
  datetime_time_label: string; datetime_too_early: string; datetime_too_late: string;
  datetime_prev_month: string; datetime_next_month: string; phone_too_short: string; phone_invalid: string;
  biometric_confirm: string; biometric_fingerprint: string; biometric_default: string;
  generic_error: string;
  datetime_select_label: string; datetime_confirm_prefix: string; datetime_select_date_first: string; datetime_at_sep: string; back: string; send: string; search: string; back_home: string; add_agent: string; map_unavailable: string; check_connection: string; mission_zone: string; mission_cancelled: string;
  /** StarRating accessibility labels (audit 2026-08, UX-1). */
  star_rating_value: string; star_rating_set: string;
  /** Blocking update screen (audit 2026-10-02, H9). */
  update_required_title: string; update_required_body: string; update_required_version: string;
  update_required_button_android: string; update_required_button_ios: string; update_required_no_store: string; }

export interface AuthNS {
  login: {
    tagline: string; title: string; subtitle: string;
    email_label: string; email_placeholder: string;
    password_label: string; password_placeholder: string;
    submit: string; submitting: string; secure_text: string;
    no_account: string; create_link: string; biometrics: string; forgot_link: string;
    errors: { email_required: string; email_invalid: string; password_required: string; invalid_creds: string; generic: string; };
    alert: { title: string; };
  };
  register: {
    title: string; subtitle: string;
    perks: { verified: string; quote: string; payment: string; };
    email_label: string; email_placeholder: string; email_available: string;
    account_type: string; individual: string; individual_sub: string;
    company: string; company_sub: string;
    partner: string; partner_sub: string;
    first_name_label: string; first_name_placeholder: string; last_name_label: string; last_name_placeholder: string;
    phone_label: string; phone_placeholder: string; phone_hint: string; phone_available: string;
    password_hint: string; password_placeholder: string;
    submit: string; rgpd: string; has_account: string; login_link: string; company_name_label: string; company_name_placeholder: string; siret_label: string; siret_hint: string; accept_terms: string; strength: { weak: string; fair: string; good: string; strong: string; };
    errors: { first_name_required: string; last_name_required: string; email_required: string; email_invalid: string; password_length: string; password_complexity: string; phone_invalid: string; phone_checking: string; phone_taken: string; email_checking: string; company_name_required: string; siret_invalid: string; terms_required: string; email_taken: string; too_many_attempts: string; network: string; generic: string; };
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
  forgot_password: {
    header: string; title: string; subtitle: string;
    email_label: string; email_placeholder: string;
    submit: string; submitting: string; back_to_login: string;
    sent_title: string; sent_body: string; resend: string; open_mail: string; enter_code: string; have_code: string;
    errors: { email_required: string; email_invalid: string; generic: string; };
  };
  reset_password: {
    header: string; title: string; subtitle: string;
    token_label: string; token_placeholder: string; token_hint: string;
    password_label: string; password_placeholder: string;
    confirm_label: string; confirm_placeholder: string;
    submit: string; submitting: string; back_to_login: string;
    requirements: { length: string; uppercase: string; digit: string; };
    strength: { weak: string; fair: string; good: string; strong: string; };
    success_title: string; success_body: string; go_to_login: string;
    errors: { token_required: string; password_length: string; password_complexity: string; mismatch: string; invalid_token: string; generic: string; };
  };
  emailVerification: {
    bannerTitle: string; bannerTitleShort: string; bannerBody: string; inlineBody: string;
    resendButton: string; resendShort: string; cooldown: string; dismiss: string;
    sentTitle: string; sentBody: string; errorTitle: string; errorBody: string;
    blockedTitle: string; blockedBody: string; resendCta: string; cancelCta: string;
  };
  phoneVerification: {
    cardTitle: string; cardBody: string; verifyButton: string;
    modalTitle: string; modalBody: string; sendButton: string; confirmButton: string;
    resendButton: string; codeLabel: string; close: string;
    sentTitle: string; sentBody: string; verifiedTitle: string; verifiedBody: string;
    errorTitle: string; sendErrorBody: string; verifyErrorBody: string;
  };
}

export interface HomeNS {
  greeting: { morning: string; evening: string; };
  stats: { total: string; completed: string; in_progress: string; };
  cta: { title: string; subtitle: string; };
  active_mission: { label: string; };
  upcoming_mission: { label: string; starts: string; };
  recent: { title: string; see_all: string; };
  cancelled: { title: string; };
  empty: { title: string; subtitle: string; action: string; };
  sos: {
    title: string; body: string; send: string; cancel: string;
    success_title: string; success_body: string; error_body: string; trigger_message: string;
  };
}

export interface MissionsNS {
  title: string; subtitle_one: string; subtitle_other: string;
  new: string; search_placeholder: string; card_fallback_title: string; card_urgent: string;
  starts_in_min: string; starts_in_hours: string; starts_in_days_one: string; starts_in_days_other: string;
  filters: { all: string; active: string; created: string; completed: string; cancelled: string; };
  empty: {
    no_results: string; no_missions: string; filter_label: string;
    search_sub: string; all_sub: string; category_sub: string; action: string;
  };
  error: {
    title: string; subtitle: string; retry: string;
  };
  a11y: {
    loading: string; refreshing: string; retry: string; new_mission: string; new_mission_hint: string; search: string;
    filter_bar: string; filter_chip: string; filter_chip_with_count: string;
    mission_list: string;
  };
  detail: {
    status: string; location: string; date: string; agent: string;
    cancel: string; rate: string; track: string;
    screen_title: string; loading: string; error_load: string; retry: string;
    cancel_title: string; cancel_body: string; cancel_back: string; cancel_confirm: string;
    cancel_error: string; duration: string; created_on: string;
    cta_get_quote: string; cta_see_quote: string; cta_pay: string; cta_edit: string;
    cta_select: string; cta_waiting: string; cta_assigning: string; cta_messaging: string;
    badge_live: string; badge_approach: string; badge_urgent: string;
    section_approach: string; section_location: string; section_notes: string; section_bookings: string;
    section_refunds: string; refund_done: string; refund_pending: string; refund_applied: string;
    total_ttc: string;
    sepa_settling_title: string; sepa_settling_body: string;
  };
  edit: { screen_title: string; loading: string; save_btn: string; saved_toast: string; };
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
    relative_just_now: string; relative_min_ago: string; relative_hours_ago: string; relative_days_ago: string;
    service_required_title: string; service_required_body: string;
    map_position_required: string; start_required: string; start_min_future: string;
    duration_min: string; duration_max: string; end_before_start: string;
    error_create: string;
    title_placeholder: string; instructions_placeholder: string;
    schedule_title: string; start_label: string; start_hint: string;
    end_hint: string; summary_start: string; summary_duration: string;
    next_btn: string; create_btn: string;
    address_required: string; city_required: string; end_required: string;
    uniform_per_agent: string; total_agents: string; add_service: string;
    summary_title: string; recap_section: string; urgency_note: string;
    title_label: string; notes_label: string;
    address_placeholder: string;
    city_label: string; city_placeholder: string;
    zip_label: string; zip_placeholder: string;
    end_label: string;
    summary_location: string; summary_end: string; total_agents_label: string;
    step_one_title: string; duration_hours: string; step_two_title: string; agent_label: string;
    amplitude_max: string; weekly_cap: string; rest_between: string; rest_after_cap: string;

    // ── Multi-slot scheduling ─────────────────────────────────────────────
    slot_mode_single: string;
    slot_mode_multi:  string;
    slot_mode_hint:   string;
    slots_section_title: string;
    slot_add_btn:        string;
    slot_label:          string;
    slot_notes_placeholder: string;
    slot_remove:         string;
    slot_start_required: string;
    slot_end_required:   string;
    slot_end_before_start: string;
    slot_duration_min:   string;
    slot_overlap:        string;
    slot_required:       string;
    slot_max:            string;
    slot_duration_badge: string;
    slots_total_duration: string;
    summary_slots:       string;
    summary_slots_one:   string;
    summary_slots_other: string;

    // Per-slot booking lines panel
    slot_lines_default:  string;
    slot_lines_custom:   string;
    slot_lines_reset:    string;
    slot_lines_required: string;

    // ── Redesigned 3-step wizard ─────────────────────────────────────────
    step_where:  string;
    step_when:   string;
    step_review: string;
    progress_where:  string;
    progress_when:   string;
    progress_review: string;
    where_title:    string; where_subtitle:  string;
    when_title:     string; when_subtitle:   string;
    review_title:   string; review_subtitle: string;
    edit_btn:       string;
    summary_when:     string;
    summary_services: string;
    preset_section:  string;
    preset_tonight:  string;
    preset_tomorrow: string;
    preset_weekend:  string;
    custom_section:  string;
    add_another_slot:      string;
    add_another_slot_hint: string;
    slots_count:           string;
    optional_section: string;

    // ── Per-slot customization ─────────────────────────────────────────
    customize_for_slot:        string;
    slot_uniform_label:        string;
    slot_line_excluded_note:   string;
    slot_total_agents:         string;
    custom_label:              string;
    summary_services_default:  string;

    // ── Copy-from-slot feature ─────────────────────────────────────────
    slot_copy_from:     string;

    // ── Slot header date summary ───────────────────────────────────────
    slot_date_summary:  string;
    slot_date_pending:  string;

    // Footer status
    footer_step_progress: string;
    footer_ready:         string;
    slots_total_short:    string;
    slots_total_short_one: string;

    // ── Review step enrichments ────────────────────────────────────────
    review_agent_hours:     string;
    review_slot_summary:    string;

    // ── ENTERPRISE UX: draft autosave / restore ─────────────────────────
    draft_restore_title:    string;
    draft_restore_subtitle: string;
    draft_restore_btn:      string;
    draft_discard_btn:      string;
    draft_discard_confirm_title:   string;
    draft_discard_confirm_message: string;
    draft_discard_confirm_btn:     string;

    // ── ENTERPRISE UX: smarter footer ───────────────────────────────────
    /** Smart CTA: "Continuer · Quand →" / "Continuer · Récap →". */
    next_to_when:    string;
    next_to_review:  string;
    /** Footer "Précédent" affordance text. */
    footer_back:     string;

    // ── ENTERPRISE UX: cross-slot error banner ──────────────────────────
    cross_slot_error_title:   string;
    cross_slot_error_subtitle:string;
    cross_slot_error_jump:    string;

    // ── ENTERPRISE UX: multi-slot escape ────────────────────────────────
    /** "Revenir à une plage unique" — return to single-slot mode. */
    exit_multi_slot:           string;
    exit_multi_slot_confirm_title:   string;
    exit_multi_slot_confirm_message: string;
    exit_multi_slot_confirm_btn:     string;

    // ── ENTERPRISE UX: review price estimate ────────────────────────────
    /** "Estimation HT" header above the indicative price. */
    review_estimate_label:  string;
    /** "≈ {{amount}} HT" — approximate cost rendered in the review. */
    review_estimate_amount: string;
    /** Disclaimer rendered below the estimate. */
    review_estimate_note:   string;

    // ── ENTERPRISE UX: structured submit error ──────────────────────────
    /** Banner title shown when /missions/create returns validation errors. */
    step_where_2:        string;
    step_staff_2:        string;
    progress_staff:      string;
    next_to_staff:       string;
    screen_title_new: string; address_label: string; zip_invalid: string;
    location_checking: string; location_incoherent: string; location_use_resolved: string;
    location_keep: string; remove_agent_a11y: string; remove_service_a11y: string;
    slot_duration_max: string; slot_duration_hint: string; staff_load_error: string; partner_created_toast: string; beyond_horizon: string;
    when_staff_title:    string;
    when_staff_subtitle: string;
    creneau_label:       string;
    add_another_creneau: string;
    staff_section:       string;
    staff_empty:         string;
    staff_empty_hint:    string;
    staff_add_service:   string;
    staff_loading:       string;
    staff_services_empty: string;
    staff_all_added:     string;
    staff_rate_per_hour: string;
    submit_error_title:    string;
    /** "Modifier" CTA inside the submit-error banner. */
    submit_error_jump_to:  string;
    /** Generic submit error subtitle (network / server). */
    submit_error_network:  string;
    /**
     * Shown when the mission committed but the downstream quote calculation
     * failed - a different situation from a failed creation, and the reason
     * clients used to resubmit and create duplicate missions.
     */
    submit_error_title_quote:  string;
    submit_quote_retry:        string;
    submit_quote_open_mission: string;
  };
}

export interface ProfileNS {
  title: string;
  sections: { account: string; security: string; preferences: string; info: string; legal: string; };
  menu: {
    edit_profile: string; analytics: string; payment_history: string; payment_methods: string;
    two_fa: string; two_fa_enabled: string; two_fa_disabled: string; two_fa_recommended: string;
    quick_login: string; notifications: string; language: string;
    language_fr: string; language_en: string;
    email: string; phone: string;
    member_since: string; version: string; privacy_policy: string; terms: string;
    sales_terms: string; legal_notice: string; support: string;
  };
  hero: { verified: string; since: string; phone_not_set: string; add_name: string; account_id: string; email_unverified: string; email_verified: string; };
  language_picker: { title: string; subtitle: string; };
  logout: { button: string; title: string; message: string; confirm: string; cancel: string; };
  delete_account: string;
}

export interface NavigationNS {
  tabs: { home: string; missions: string; notifications: string; profile: string; };
  partner_tabs: { dashboard: string; team: string; finance: string; profile: string; };
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
  offline_note: string;
  breakdown_title: string;
  prestations_title: string;
  prestation_hours: string;
  prestation_agents: string;
  prestation_agents_plural: string;
  prestation_rate: string;
  prestation_subtotal: string;
  accepted_badge: string;
  row_base_ht: string;
  row_night: string;
  row_weekend: string;
  row_urgency: string;
  row_subtotal: string;
  row_vat: string;
  row_total_ttc: string;
  valid_until: string;
  accept_label: string;
  ref: string;
}

export interface PaymentNS {
  title_card: string; title_sepa: string; secured_by: string;
  incomplete_card: string; sepa_failed: string; card_failed: string;
  sepa_success: string; card_success: string;
  total_ttc_label: string; use_new_card: string;
  card_held: string; card_held_body: string;
  sepa_success_body: string; card_success_body: string;
  home: string;
  stripe_info_sepa: string; stripe_info_card: string; sepa_legal: string; amount_sub: string; invoice_ref: string; invoice_count: string; invoice_open_error: string; invoice_unavailable: string; invoice_download_a11y: string;
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
    title: string; screen_title: string;
    delete_error: string; delete_error_title: string;
    delete_confirm_title: string; delete_confirm_body: string;
    delete_confirm_btn: string; delete_cancel_btn: string;
    empty_title: string; empty_subtitle: string;
    saved_label: string; how_title: string; stripe_info: string;
    security_1: string; security_2: string; security_3: string;
  };
  pay: {
    title: string;
    saved_title: string;
    account_iban: string; account_card: string;
    saved_selected: string;
    iban_invalid: string; iban_valid: string;
    mandate_text: string;
    cta_processing: string; cta_sepa: string; cta_pay: string;
    footer_cgv: string;
    err_generic: string;
    /** Shown under a disabled CTA so a blocked button always states its cause. */
    reason_enter_iban: string;
    reason_iban_invalid: string;
    reason_complete_card: string;
    reason_card_unavailable: string;
  };
  add: {
    header_method: string;
    header_add: string;
    header_iban: string;
    header_card: string;
    pick_sub: string; pick_title: string; iban_invalid: string; iban_valid: string;
    card_label: string; card_desc: string;
    sepa_label: string; sepa_desc: string;
    method_badge_card: string; method_badge_sepa: string;
    form_title_card: string; form_title_sepa: string;
    iban_field_label: string;
    mandate_text: string;
    sec_info_card: string; sec_info_sepa: string;
    incomplete_card: string; invalid_iban: string;
    success_sub_card: string; success_sub_sepa: string;
    success_cta: string;
    save_card: string; save_iban: string; saving: string;
    err_session: string; err_card_refused: string; err_card_save: string; err_iban_refused: string; err_sepa_save: string; err_generic: string;
    iban_hint: string; footer_iban_consent: string; footer_tokenized: string;
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
    result_title_virement: string; result_title_cheque: string; result_subtitle: string;
    total_ttc: string; vat_included: string; method_section_title: string; copy: string;
    copied: string;
  };
}

export interface AccountNS {
  edit: {
    title: string; avatar_hint: string; full_name_label: string; phone_label: string;
    full_name_placeholder: string; phone_placeholder: string;
    first_name_label: string; last_name_label: string;
    first_name_placeholder: string; last_name_placeholder: string;
    name_required_title: string; name_required_body: string;
    phone_invalid_title: string; phone_invalid_body: string;
    save: string; saved: string; error: string; avatar_uploading: string;
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
  agent: { assigned_label: string; cnaps_badge: string; missions_count: string; missions_count_one: string; follow_live: string; rating_empty: string; new_agent: string; checkin_at: string; checkout_at: string; awaiting_agent: string; auto_assign: string; };
  applications: {
    section_title: string; more: string; more_plural: string; waiting: string;
    select_title: string; select_subtitle: string; select_subtitle_plural: string;
    choose_btn: string; selecting: string;
    selected_title: string; selected_body: string; select_error: string;
  };
  checkins: { section_title: string; date_label: string; checkin_label: string; checkout_label: string; };
  photos: { section_title: string; verified_badge: string; no_photos_title: string; caption: string; zoom_a11y: string; empty_in_progress: string; empty_completed: string; };
  incidents: { section_title: string; report_title: string; placeholder: string; reported_title: string; reported_body: string; report_error: string; too_short: string; kinds: { INTRUSION: string; BLESSURE: string; AGRESSION: string; INCENDIE: string; EVACUATION: string; MATERIEL: string; AUTRE: string; }; };
  actions: { rate_agent: string; already_rated: string; open_dispute: string; };
  uniforms: { STANDARD: string; CIVIL: string; EVENEMENTIEL: string; SSIAP: string; CYNOPHILE: string; };
  statuses: { open: string; assigned: string; in_progress: string; completed: string; cancelled: string; abandoned: string; };
  errors: { load: string; generic: string; };
}

export interface RatingNS {
  screen_title: string;
  steps: { rating: string; nps: string; comment: string; };
  star_labels: string[];
  step_rating: { title: string; subtitle: string; };
  step_nps: { title: string; subtitle: string; detractors: string; passives: string; promoters: string; };
  step_comment: { title: string; subtitle: string; placeholder: string; char_count: string; skip: string; tags: string[]; };
  nps_scale: string[];
  nps_categories: { promoter: string; passive: string; detractor: string; };
  done: { title: string; back_btn: string; };
  nav: { back: string; continue: string; submit: string; sending: string; };
  errors: { score_required_title: string; score_required_body: string; nps_required_title: string; nps_required_body: string; generic: string; };
}

export interface DisputeNS {
  screen_title: string; done_title: string; done_subtitle: string; back_btn: string;
  info_banner: string; reason_label: string; description_label: string;
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
  status_signal_lost: string;
  map_loading: string;
  in_zone: string; out_of_zone: string;
  follow_agent_btn: string; view_site_btn: string; sync_btn: string;
  last_seen: string; updated_ago_s: string; zone_unknown: string; attribution: string;
  recenter_a11y: string; close_a11y: string;
  en_route: string; track_btn: string;
  eta_label: string; eta_arriving: string; eta_calculating: string;
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
  agents_label: string; uniform_label: string; customize_show: string; customize_hide: string;
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
  validate_btn: string; validated: string; unlock_hint: string; position_saved: string; address_resolving: string;
  perm_title: string; perm_message: string; perm_allow: string; perm_cancel: string;
  perm_settings_hint: string; perm_denied_title: string; perm_denied: string;
  position_unavailable: string; timeout_retry: string; locate_failed_title: string;
  perm_blocked_title: string; perm_blocked_body: string; perm_open_settings: string;
  perm_unavailable: string;
}

export interface AnalyticsNS {
  missions_per_month: string;
  status_completed: string; status_in_progress: string; status_drafts: string; status_cancelled: string;
  kpi_total_spent: string; kpi_total_missions: string; monthly_spend: string; status_breakdown: string;
}

export interface OfflineBannerNS {
  no_connection: string;
}
export interface PartnerNS {
  dashboard: {
    title: string;
    loading: string;
    greeting: {
      morning: string;
      afternoon: string;
      evening: string;
      fallback: string;
    };
    sections: {
      team: string;
      missions: string;
      finances: string;
      quickAccess: string;
    };
    kpi: {
      agents: string;
      validated: string;
      active: string;
      completed: string;
      scheduledPayouts: string;
      totalPaid: string;
    };
    actions: {
      team: string;
      teamSub: string;
      finances: string;
      financesSub: string;
      billing: string;
      billingSub: string;
      staffing?: string;
      staffingSub?: string;
      contracts?: string;
      contractsSub?: string;
      compliance: string;
      complianceSub: string;
      documents: string;
      documentsSub: string;
      editCompany: string;
      editCompanySub: string;
      createMission: string;
      createMissionSub: string;
      myMissions: string;
      myMissionsSub: string;
      timesheets: string;
      timesheetsSub: string;
    };
    errors: {
      title: string;
      body: string;
      retry: string;
    };
  };
  team: {
    title: string;
    subtitle_one: string;
    subtitle_other: string;
    loading: string;
    search: {
      placeholder: string;
    };
    filters: {
      all: string;
      validated: string;
      pending: string;
      alerts: string;
    };
    pills: {
      cnapsValidated: string;
      cnapsNotValidated: string;
      missions: string;
    };
    alerts: {
      rejected_one: string;
      rejected_other: string;
      missing_one: string;
      missing_other: string;
      expiring_one: string;
      expiring_other: string;
      pending_one: string;
      pending_other: string;
    };
    empty: {
      noAgentsTitle: string;
      noAgentsSubtitle: string;
      noResultsBySearch: string;
      noResultsByFilter: string;
    };
    errors: {
      title: string;
      body: string;
      retry: string;
    };
  };
  agentDetail: {
    title: string;
    loading: string;
    sections: {
      documents: string;
      onboarding: string;
      info: string;
    };
    pills: {
      cnapsValidated: string;
      cnapsNotValidated: string;
    };
    onboarding: {
      title: string;
      steps: {
        profile: string;
        documents: string;
        cnaps: string;
        stripe: string;
      };
    };
    docs: {
      status: {
        approved: string;
        pending: string;
        rejected: string;
        missing: string;
        expired: string;
      };
      empty: string;
    };
    errors: {
      notFound: string;
      title: string;
      body: string;
      retry: string;
    };
  };
  financials: {
    title: string;
    subtitle: string;
    loading: string;
    period: {
      label: string;
      all: string;
      pickTitle: string;
      year: string;
      all_periods: string;
    };
    totals: {
      paid: string;
      pending: string;
      missions: string;
    };
    search: {
      placeholder: string;
    };
    sections: {
      byAgent: string;
      byAgentWithResults_one: string;
      byAgentWithResults_other: string;
    };
    payout: {
      status: {
        paid: string;
        failed: string;
        scheduled: string;
      };
      pending: string;
      mission_one: string;
      mission_other: string;
    };
    pdf: {
      title: string;
      subtitle: string;
      generate: string;
      generating: string;
      generated: string;
      generatedBody: string;
      cannotOpen: string;
    };
    empty: {
      noPayments: string;
      noResults: string;
      noPaymentsForAgent: string;
    };
    errors: {
      load: string;
      pdfFailed: string;
      periodRequired: {
        title: string;
        body: string;
      };
    };
  };
  billing: {
    title: string;
    subtitle: string;
    notice: string;
    steps: {
      period: string;
      preview: string;
      generate: string;
    };
    period: {
      label: string;
      pickTitle: string;
    };
    preview: {
      totalPaid: string;
      pending: string;
      missions: string;
      agents: string;
      empty: string;
      loading: string;
    };
    generate: {
      title: string;
      subtitle: string;
      cta: string;
      loading: string;
      disabledHint: string;
    };
    alerts: {
      generated: string;
      generatedBody: string;
      cannotOpen: string;
      error: string;
      errorBody: string;
    };
    errors: {
      load: string;
    };
  };
  timesheets: {
    title: string;
    subtitle: string;
    notice: string;
    tabs: { pending: string; approved: string };
    empty: string;
    loading: string;
    hours: string;
    planned: string;
    autoOn: string;
    offline: string;
    incidents: string;
    approve: string;
    approved: string;
    confirmTitle: string;
    confirmBody: string;
    errors: { load: string; approve: string };
  };
  compliance: {
    title: string;
    hero: {
      source: string;
    };
    status: {
      rejected: string;
      pending: string;
      compliant: string;
      incomplete: string;
    };
    progress: {
      title: string;
      approved: string;
      pending: string;
      rejected: string;
      missing: string;
    };
    sections: {
      mandatory: string;
      optional: string;
      optionalSubtitle: string;
    };
    docStatus: {
      approved: string;
      pending: string;
      rejected: string;
      missing: string;
      optional: string;
    };
    rejectionNote: string;
    alert: {
      title: string;
      body_one: string;
      body_other: string;
    };
    rgpd: {
      title: string;
      retention: string;
      contactDpo: string;
    };
    actions: {
      checkStatus: string;
      addDocument: string;
    };
    errors: {
      title: string;
      body: string;
    };
  };
  documents: {
    title: string;
    subtitle: string;
    addButton: string;
    loading: string;
    stats: {
      approved: string;
      pending: string;
      rejected: string;
      total: string;
    };
    expiringBanner: {
      title: string;
      today: string;
      inDays_one: string;
      inDays_other: string;
      renew: string;
    };
    countLabel_one: string;
    countLabel_other: string;
    empty: {
      title: string;
      subtitle: string;
      action: string;
    };
    actions: {
      view: string;
      replace: string;
      delete: string;
    };
    alerts: {
      approvedBody: string;
      notApprovedBody: string;
      delete: {
        title: string;
        body: string;
      };
    };
    errors: {
      urlMissing: string;
      openFailedTitle: string;
      openFailedBody: string;
      deleteFailed: string;
    };
  };
  addDocument: {
    title: string;
    titleEdit: string;
    subtitle: string;
    sections: {
      selectType: string;
      uploadFile: string;
      rgpd: string;
    };
    upload: {
      cta: string;
      replace: string;
      formats: string;
      selected: string;
    };
    rgpd: {
      consent: string;
      required: string;
    };
    actions: {
      submit: string;
      submitting: string;
    };
    alerts: {
      typeRequired: {
        title: string;
        body: string;
      };
      fileRequired: {
        title: string;
        body: string;
      };
      rgpdRequired: {
        title: string;
        body: string;
      };
      success: {
        title: string;
        body: string;
      };
      expiryRequired: {
        title: string;
        body: string;
      };
    };
    errors: {
      pickFailed: string;
      uploadFailed: string;
      fileTooLarge: {
        title: string;
        body: string;
      };
    };
    steps: {
      expiry: string;
      expirySub: string;
      selectedDate: string;
      notProvided: string;
      shortcuts: string;
      months_other: string;
      years_one: string;
      years_other: string;
      review: string;
      reviewSub: string;
      summary: {
        type: string;
        file: string;
        expiration: string;
        retention: string;
      };
      uploading: string;
      months_one: string;
    };
  };
  profile: {
    title: string;
    loading: string;
    company: {
      siret: string;
      address: string;
      contact: string;
    };
    compliance: {
      ok: string;
      inProgress: string;
      docsValidated: string;
      noDocsYet: string;
      rejected_one: string;
      rejected_other: string;
    };
    sections: {
      company: string;
      account: string;
    };
    rows: {
      editCompany: string;
      editCompanySub: string;
      legalDocuments: string;
      legalDocumentsSub: string;
      compliance: string;
      complianceSub: string;
      logout: string;
      missing_one: string;
      missing_other: string;
      rejected_one: string;
      rejected_other: string;
    };
    logout: {
      title: string;
      body: string;
      cancel: string;
      confirm: string;
      inProgress: string;
    };
    footer: string;
    errors: {
      loadFailed: string;
      generic: string;
    };
  };
  companyEdit: {
    title: string;
    loading: string;
    sections: {
      legalInfo: string;
      address: string;
      contact: string;
      billing: string;
      legal: string;
      banking: string;
      insurance: string;
    };
    fields: {
      companyName: {
        label: string;
        placeholder: string;
      };
      siret: {
        label: string;
        placeholder: string;
      };
      vatNumber: {
        label: string;
        placeholder: string;
      };
      siren: { label: string; placeholder: string };
      apeCode: { label: string; placeholder: string };
      tradeName: { label: string; placeholder: string };
      legalRepName: { label: string; placeholder: string };
      legalRepRole: { label: string; placeholder: string };
      iban: { label: string; placeholder: string };
      bic: { label: string; placeholder: string };
      rcProInsurer: { label: string; placeholder: string };
      rcProPolicyNumber: { label: string; placeholder: string };
      rcProExpiresAt: { label: string; placeholder: string };
      billingAddress: {
        label: string;
        placeholder: string;
      };
      billingCity: {
        label: string;
        placeholder: string;
      };
      billingZipCode: {
        label: string;
        placeholder: string;
      };
      address: {
        label: string;
        placeholder: string;
      };
      city: {
        label: string;
        placeholder: string;
      };
      zipCode: {
        label: string;
        placeholder: string;
      };
    };
    actions: {
      save: string;
      saving: string;
    };
    success: {
      title: string;
      body: string;
    };
    validation: {
      nameRequired: {
        title: string;
        body: string;
      };
      siretInvalid: string;
      zipInvalid: string;
      vatInvalid: string;
      siretValid: string;
      dateInvalid: string;
    };
    errors: {
      loadFailed: string;
      saveFailed: string;
    };
  };
  missionsList: {
    error: {
      title: string;
      body: string;
      retry: string;
    };
    title: string;
    untitled: string;
    newMission: string;
    urgent: string;
    cancelAction: string;
    fundAction: string;
    filled: string;
    moreAgents: string;
    transferPending: string;
    agents_one: string;
    agents_other: string;
    tabs: {
      active: string;
      archived: string;
    };
    empty: {
      title: string;
      activeBody: string;
      archivedBody: string;
      action: string;
    };
    cancel: {
      title: string;
      body: string;
      confirm: string;
      dismiss: string;
      errorTitle: string;
      errorBody: string;
    };
    status: {
      DRAFT: string;
      CONFIRMED: string;
      PUBLISHED: string;
      STAFFING: string;
      STAFFED: string;
      IN_PROGRESS: string;
      COMPLETED: string;
      CANCELLED: string;
      CREATED: string;
    };
  };
  createMission: {
    title: string;
    submit: string;
    submitting: string;
    cancel: string;
    confirm: string;
    endsAt: string;
    legalNote: string;
    noServiceTypes: string;
    perHour: string;
    totalAgents_one: string;
    totalAgents_other: string;
    sections: {
      schedule: string;
      staffing: string;
      details: string;
    };
    fields: {
      title: string;
      location: string;
      address: string;
      date: string;
      startTime: string;
      duration: string;
      notes: string;
      urgent: string;
    };
    placeholders: {
      title: string;
      location: string;
      address: string;
      notes: string;
    };
    hints: {
      location: string;
      duration: string;
      urgent: string;
    };
    errors: {
      title: string;
      generic: string;
      address: string;
      duration: string;
      startAt: string;
      lines: string;
    };
    success: {
      title: string;
      body: string;
      confirm: string;
    };
  };
  employment: {
    status: {
      DRAFT: string;
      SENT_FOR_SIGNATURE: string;
      SIGNED: string;
      CANCELLED: string;
    };
    motifs: {
      CDDU: string;
      ACCROISSEMENT: string;
      REMPLACEMENT: string;
      SAISONNIER: string;
    };
    categories: {
      AGENT_EXPLOITATION: string;
      AGENT_MAITRISE: string;
      CADRE: string;
    };
    signature: {
      partner: string;
      agent: string;
      signed: string;
      pending: string;
    };
    salary: {
      estimate: string;
      base: string;
      nightSurcharge: string;
      sundaySurcharge: string;
      holidaySurcharge: string;
      seniorityPremium: string;
      panier: string;
      cynophilePremium: string;
      indemniteFinContrat: string;
      totalBrut: string;
      employerCharges: string;
      totalEmployerCost: string;
    };
    contract: {
      detail: {
        title: string;
        loading: string;
        sections: {
          legal: string;
          classification: string;
          period: string;
          employer: string;
          dpae: string;
          signatures: string;
        };
        fields: {
          motif: string;
          legalCode: string;
          justification: string;
          category: string;
          niveau: string;
          echelon: string;
          coefficient: string;
          hourlyBrut: string;
          start: string;
          end: string;
          plannedHours: string;
        };
        dpae: {
          statusLabel: string;
          submittedAt: string;
          notCreated: string;
          status: {
            PENDING: string;
            SUBMITTED: string;
            ACKNOWLEDGED: string;
            FAILED: string;
          };
        };
        sign: {
          confirmTitle: string;
          confirmBody: string;
          confirm: string;
          cta: string;
          consent: string;
          bothSigned: string;
          waitingAgent: string;
          successTitle: string;
          successBody: string;
          failed: string;
        };
        cancel: {
          cta: string;
          confirmTitle: string;
          confirmBody: string;
          confirm: string;
          reasonDefault: string;
          successTitle: string;
          successBody: string;
          failed: string;
        };
        errors: {
          title: string;
          body: string;
          retry: string;
        };
      };
      create: {
        title: string;
        context: string;
        agent: string;
        bookingRef: string;
        motif: {
          title: string;
          hint: string;
          legalCode: string;
          CDDU: string;
          ACCROISSEMENT: string;
          REMPLACEMENT: string;
          SAISONNIER: string;
        };
        justification: {
          label: string;
          placeholder: string;
        };
        sneps: {
          title: string;
          hint: string;
          category: string;
          niveau: string;
          echelon: string;
          coefficient: string;
          categories: {
            AGENT_EXPLOITATION: string;
            AGENT_MAITRISE: string;
            CADRE: string;
          };
          hourlyBrut: {
            label: string;
            placeholder: string;
            hint: string;
          };
        };
        extras: {
          title: string;
          seniority: string;
          seniorityHint: string;
          cynophile: string;
        };
        actions: {
          submit: string;
        };
        errors: {
          justification: string;
          niveau: string;
          echelon: string;
          coefficient: string;
          hourlyBrut: string;
          seniority: string;
          fixForm: string;
          createFailed: string;
        };
      };
    };
  };
  staffing: {
    title: string; subtitle: string; cityPlaceholder: string; retry: string;
    empty: { title: string; body: string };
    error: { title: string; body: string };
    urgent: string; filled: string; noSlot: string;
    assign: {
      title: string; intro: string; empty: string; cta: string;
      confirmTitle: string; confirmBody: string; confirm: string; cancel: string;
      success: string; favorite: string; available: string; distance: string;
      notAssignable: string; rating: string;
      errors: { generic: string; network: string; taken: string; notFound: string; forbidden: string };
    };
  };
  missionDetail: { [key: string]: string | { [key: string]: string } };
  contractsList: {
    title: string; subtitle: string; retry: string;
    empty: { title: string; body: string };
    error: { title: string; body: string };
    agentSigned: string; awaitingAgent: string; dpae: string; unknownAgent: string;
  };
  funding: {
    title: string;
    calculating: string;
    funded: string;
    pending: { title: string; body: string; invoice: string };
    expired: { title: string; body: string; action: string };
    actions: {
      accept: string;
      declare: string;
      done: string;
      retryQuote: string;
    };
    errors: {
      noQuote: string;
      acceptFailed: string;
      declareFailed: string;
    };
    copied: {
      title: string;
      body: string;
    };
    breakdown: {
      title: string;
      status: string;
      totalHT: string;
      totalTTC: string;
      vat: string;
      agentSalary: string;
      platformMargin: string;
      base: string;
      fixedCharges: string;
      surcharges: {
        night: string;
        weekend: string;
        holiday: string;
        urgency: string;
        luxury: string;
        seasonal: string;
        location: string;
      };
    };
    payment: {
      method: string;
      notice: string;
      VIREMENT: string;
      CHEQUE: string;
    };
    status: {
      PENDING: string;
      ACCEPTED: string;
      REJECTED: string;
    };
    instructions: {
      title: string;
      invoice: string;
      amount: string;
      reference: string;
      beneficiary: string;
      address: string;
    };
  };
}

/** Union of all namespaces — drives i18next CustomTypeOptions. */
/**
 * Consignes de site (lot 3, audit 2026-08).
 *
 * Aucune clé ne concerne la VALEUR d'un code d'accès : les codes sont chiffrés
 * côté serveur et ne sont jamais réaffichés dans cette application.
 */
export interface SitesNS {
  save: string;
  saving: string;
  title: string;
  loading: string;
  add: string;
  new_title: string;
  edit_title: string;
  saved_title: string;
  saved_body: string;
  save_error: string;
  secret_error: string;
  create_first: string;
  empty: { title: string; message: string };
  counts: {
    posts: string; posts_other: string;
    contacts: string; contacts_other: string;
    secrets: string; secrets_other: string;
  };
  sections: {
    identity: string; access: string; expectations: string;
    codes: string; posts: string; contacts: string;
  };
  fields: { label: string; address: string; city: string; zipCode: string };
  access_hint: string;
  access_placeholder: string;
  expectations_placeholder: string;
  briefing_change_warning: string;
  codes_hint: string;
  secret_label_placeholder: string;
  secret_value_placeholder: string;
  add_code: string;
  stale_rotation: string;
  kinds: {
    BOITE_CLES: string; ALARME: string; CADENAS: string;
    BADGE: string; INTERPHONE: string; AUTRE: string;
  };
  roles: {
    REMISE_CLES: string; RETOUR_CLES: string; ASTREINTE: string;
    HIERARCHIE: string; DONNEUR_ORDRES: string; TECHNIQUE: string; AUTRE: string;
  };
}

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
  conversation: ConversationNS; services: ServicesNS; map_picker: MapPickerNS; analytics: AnalyticsNS; offline_banner: OfflineBannerNS;
  partner: PartnerNS;
  sites: SitesNS;
  mission_tasks: MissionTasksNS;
}

/** Tâches de mission et modération des observations. */
export interface MissionTasksNS {
  section_title: string; section_hint: string; loading: string; no_service: string; no_task: string;
  exclusions_title: string; contract_notice: string; on_validation: string; prefectoral: string;
  validation_notice: string; notes_hint: string; detail_title: string; detail_empty: string;
  status_pending: string; status_rejected: string; review_pending: string; review_rejected: string;
  moderation_confirm_title: string; moderation_blocked_title: string; moderation_fix: string;
  moderation_maintain: string; moderation_maintain_hint: string;
}

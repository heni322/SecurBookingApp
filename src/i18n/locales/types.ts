/**
 * locales/types.ts — Complete namespace shape definitions.
 * Both EN and FR implement these interfaces — no literal-type cross-lock.
 */

// ── Existing namespaces ───────────────────────────────────────────────────────

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
  tls_badge:     string;
}

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
  new: string; search_placeholder: string;
  filters: { all: string; active: string; drafts: string; completed: string; cancelled: string; };
  empty: {
    no_results: string; no_missions: string; filter_label: string;
    search_sub: string; all_sub: string; category_sub: string; action: string;
  };
  detail: {
    status: string; location: string; date: string; agent: string;
    cancel: string; rate: string; track: string;
    screen_title: string; loading: string; error_load: string; retry: string;
    cancel_title: string; cancel_body: string; cancel_back: string; cancel_confirm: string;
    cancel_error: string; duration: string; created_on: string;
    cta_get_quote: string; cta_see_quote: string; cta_pay: string;
    cta_select: string; cta_waiting: string; cta_messaging: string;
  };
  statuses: {
    draft: string; published: string; confirmed: string; in_progress: string;
    completed: string; cancelled: string; disputed: string;
  };
  success: {
    title: string; subtitle: string; timeline_title: string;
    step_confirmed: string; step_published: string; step_selection: string; step_operational: string;
    step_done: string; info: string; home: string;
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
    error_create: string;
    title_placeholder: string; instructions_placeholder: string;
    schedule_title: string; start_label: string; start_hint: string;
    end_hint: string; summary_start: string; summary_duration: string;
    next_btn: string; create_btn: string;
  };
}

export interface ProfileNS {
  title: string;
  sections: { account: string; security: string; preferences: string; info: string; legal: string; };
  menu: {
    edit_profile: string; analytics: string; payment_history: string; payment_methods: string;
    two_fa: string; two_fa_enabled: string; two_fa_disabled: string;
    quick_login: string; notifications: string; email: string; phone: string;
    member_since: string; version: string; privacy_policy: string; terms: string;
  };
  hero: { verified: string; since: string; phone_not_set: string; };
  logout: { button: string; title: string; message: string; confirm: string; cancel: string; };
  delete_account: string;
}

export interface NavigationNS {
  tabs: { home: string; missions: string; notifications: string; profile: string; };
}

// ── New namespaces ────────────────────────────────────────────────────────────

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
  payment_method: string; card: string; sepa: string;
  accept: string; accepting: string;
  pay_card: string; pay_sepa: string; paying: string;
  error_accept: string; error_pay: string;
}

export interface PaymentNS {
  title_card: string; title_sepa: string; secured_by: string;
  incomplete_card: string; sepa_failed: string; card_failed: string;
  sepa_success: string; card_success: string;
  sepa_success_body: string; card_success_body: string;
  home: string;
  stripe_info_sepa: string; stripe_info_card: string; sepa_legal: string;
  errors: {
    card_declined: string; expired_card: string; incorrect_number: string;
    invalid_expiry_year: string; processing_error: string; do_not_honor: string;
    invalid_iban: string; sepa_unexpected: string; generic: string;
  };
  history: {
    title: string; empty_subtitle: string;
    status: { paid: string; failed: string; refunded: string; };
  };
  methods: {
    title: string; delete_error: string;
    security_1: string; security_2: string; security_3: string;
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

/** Union of all namespaces — drives i18next CustomTypeOptions. */
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
}

/**
 * apiErrorKeys.ts — [FIX] stable, locale-independent error identifiers sent by
 * the backend in ApiError.key, alongside the already-localised `message`.
 *
 * The client should branch on these constants — never on `message` text,
 * which is French/English prose meant for display, not comparison, and can
 * change wording without notice.
 *
 * Add a new entry here whenever a screen needs to react differently to a
 * specific backend error condition (show a different CTA, deep-link
 * somewhere, retry automatically, etc.) rather than just surface the message.
 */
export const API_ERROR_KEYS = {
  /**
   * 403 returned by any email-verification-gated endpoint (e.g.
   * POST /payments/create-intent) when the authenticated user's email is not
   * yet confirmed. See EmailVerificationBanner for the resend flow this
   * should offer.
   */
  EMAIL_NOT_VERIFIED: 'auth.errors.email_not_verified',
} as const;

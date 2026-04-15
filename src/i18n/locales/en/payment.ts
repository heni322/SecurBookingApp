import type { PaymentNS } from '../types';

const payment: PaymentNS = {
  title_card: 'Bank card', title_sepa: 'SEPA debit', secured_by: 'Secured by Stripe',
  incomplete_card: 'Please enter complete card details.',
  sepa_failed: 'The SEPA mandate could not be confirmed. Please try again.',
  card_failed: 'The payment could not be confirmed. Please try again.',
  sepa_success: 'SEPA mandate registered!', card_success: 'Payment confirmed!',
  sepa_success_body: 'Your SEPA mandate is registered. The debit will be processed in 1–2 business days. Your mission will be activated upon payment confirmation.',
  card_success_body: 'Your mission is confirmed. Qualified agents in your area will receive a notification. You will receive your invoice by email.',
  home: 'Back to home',
  stripe_info_sepa: 'Your bank details are transmitted directly to Stripe and never pass through SecurBook servers. Compliant with SEPA regulation EU 260/2012.',
  stripe_info_card: 'Your bank data is encrypted by Stripe and never passes through SecurBook servers. 3DS payment compliant with PSD2.',
  sepa_legal: 'By confirming, you authorise the SEPA debit of the indicated amount. Terms apply.',
  errors: {
    card_declined: 'Your card was declined. Please use a different card.',
    expired_card: 'Your card is expired.',
    incorrect_number: 'The card number is incorrect.',
    invalid_expiry_year: 'The expiry year is invalid.',
    processing_error: 'A processing error occurred. Please try again.',
    do_not_honor: 'Payment declined by your bank. Contact your bank for more information.',
    invalid_iban: 'The IBAN entered is invalid. Check the format.',
    sepa_unexpected: 'The SEPA mandate is in an unexpected state. Try again.',
    generic: 'Operation declined. Check your details.',
  },
  history: {
    title: 'Payment history', empty_subtitle: 'Your payments will appear here after your first mission.',
    status: { paid: 'Paid', failed: 'Failed', refunded: 'Refunded' },
  },
  methods: {
    title: 'My cards & SEPA', delete_error: 'Unable to delete this payment method.',
    security_1: 'Your payment methods are saved automatically upon a successful payment.',
    security_2: 'They are stored exclusively with Stripe (PCI-DSS Level 1).',
    security_3: 'You can delete them at any time from this page.',
  },
};

export default payment;

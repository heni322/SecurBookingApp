import type { QuoteNS } from '../types';

const quote: QuoteNS = {
  title: 'Quote', loading: 'Generating quote...',
  empty_title: 'Quote not found', empty_subtitle: 'The quote has not yet been generated for this mission.',
  pending_banner: 'Check the pricing details and accept the quote to proceed to payment.',
  payment_method: 'Payment method',
  card: 'Bank card', sepa: 'SEPA transfer', offline: 'Bank wire / Cheque',
  accept: 'Accept quote', accepting: 'Accepting...',
  pay_card: 'Pay by card', pay_sepa: 'Pay by SEPA', pay_offline: 'Offline payment', paying: 'Redirecting...',
  expired_title: 'Quote expired',
  expired_body: 'This quote has expired. Please generate a new one to continue.',
  recalculate: 'Recalculate',
  countdown_warning: 'This quote is valid for another {{time}}',
  countdown_urgent: 'This quote expires in {{time}} — accept it now',
  error_accept: 'Unable to accept the quote', error_pay: 'Unable to initiate payment',
  accepted_banner: 'Quote accepted — proceed to payment to confirm your mission.',
  secure_note: "Secure payment via Stripe — your bank details never pass through our servers.",
  sepa_note: "SEPA transfer processed in 1-2 business days. Your IBAN will be collected on the next page via Stripe.",
  offline_note: "Bank wire or cheque. Your mission will be confirmed after validation by our team (1-3 business days).",
};

export default quote;

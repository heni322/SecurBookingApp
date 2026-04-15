import type { QuoteNS } from '../types';

const quote: QuoteNS = {
  title: 'Quote', loading: 'Generating quote…',
  empty_title: 'Quote not found', empty_subtitle: 'The quote has not yet been generated for this mission.',
  pending_banner: 'Check the pricing details and accept the quote to proceed to payment.',
  payment_method: 'Payment method', card: 'Bank card', sepa: 'SEPA transfer',
  accept: 'Accept quote', accepting: 'Accepting…',
  pay_card: 'Pay by card', pay_sepa: 'Pay by SEPA', paying: 'Redirecting…',
  error_accept: 'Unable to accept the quote', error_pay: 'Unable to initiate payment',
};

export default quote;

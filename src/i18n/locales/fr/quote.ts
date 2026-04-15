import type { QuoteNS } from '../types';

const quote: QuoteNS = {
  title: 'Devis', loading: 'Génération du devis…',
  empty_title: 'Devis introuvable', empty_subtitle: "Le devis n'a pas encore été généré pour cette mission.",
  pending_banner: 'Vérifiez le détail tarifaire et acceptez le devis pour procéder au paiement.',
  payment_method: 'Mode de paiement', card: 'Carte bancaire', sepa: 'Virement SEPA',
  accept: 'Accepter le devis', accepting: 'Acceptation…',
  pay_card: 'Payer par carte', pay_sepa: 'Payer par SEPA', paying: 'Redirection…',
  error_accept: "Impossible d'accepter le devis", error_pay: "Impossible d'initier le paiement",
};

export default quote;

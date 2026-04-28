import type { QuoteNS } from '../types';

const quote: QuoteNS = {
  title: 'Devis',
  loading: 'Génération du devis...',

  empty_title: 'Devis introuvable',
  empty_subtitle:
    "Le devis n'a pas encore été généré pour cette mission.",

  pending_banner:
    'Vérifiez le détail tarifaire et acceptez le devis pour procéder au paiement.',

  payment_method: 'Mode de paiement',

  card: 'Carte bancaire',
  sepa: 'Virement SEPA',
  offline: 'Virement / Chèque',

  accept: 'Accepter le devis',
  accepting: 'Acceptation...',

  pay_card: 'Payer par carte',
  pay_sepa: 'Payer par SEPA',
  pay_offline: 'Paiement hors ligne',
  paying: 'Redirection...',

  expired_title: 'Devis expiré',
  expired_body:
    'Ce devis a expiré. Veuillez en générer un nouveau pour continuer.',

  recalculate: 'Recalculer',

  countdown_warning:
    'Ce devis est encore valable {{time}}',
  countdown_urgent:
    'Ce devis expire dans {{time}} — acceptez-le maintenant',

  error_accept:
    "Impossible d'accepter le devis",
  error_pay:
    "Impossible d'initier le paiement",

  accepted_banner:
    'Devis accepté — procédez au paiement pour confirmer votre mission.',

  secure_note:
    "Paiement sécurisé via Stripe — vos coordonnées bancaires ne transitent jamais par nos serveurs.",

  sepa_note:
    "Le virement SEPA sera traité en 1 à 2 jours ouvrés. Votre IBAN sera collecté sur la page suivante via Stripe.",

  offline_note:
    "Virement bancaire ou chèque. Votre mission sera confirmée après validation par notre équipe (1 à 3 jours ouvrés).",
  breakdown_title: 'Détail du devis',
  agent_payout:    '↳ Rémunération agent (virement J+15)',
  accepted_badge:  '✓ Devis accepté',
  row_base_ht:   'Base HT',
  row_night:     'Majoration nuit',
  row_weekend:   'Majoration week-end',
  row_urgency:   'Majoration urgence',
  row_subtotal:  'Sous-total HT',
  row_vat:       'TVA 20%',
  row_total_ttc: 'TOTAL TTC',
  row_commission:'↳ Commission SecurBook',
  valid_until:   "Valable jusqu'au {{date}}",
  accept_label:  'Accepter ce devis',
};

export default quote;
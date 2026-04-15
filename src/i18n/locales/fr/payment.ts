import type { PaymentNS } from '../types';

const payment: PaymentNS = {
  title_card: 'Carte bancaire', title_sepa: 'Débit SEPA', secured_by: 'Sécurisé par Stripe',
  incomplete_card: 'Veuillez saisir vos informations de carte complètes.',
  sepa_failed: "Le mandat SEPA n'a pas pu être confirmé. Veuillez réessayer.",
  card_failed: "Le paiement n'a pas pu être confirmé. Veuillez réessayer.",
  sepa_success: 'Mandat SEPA enregistré !', card_success: 'Paiement confirmé !',
  sepa_success_body: "Votre mandat SEPA est enregistré. Le débit sera effectué dans 1–2 jours ouvrés. Votre mission sera activée dès confirmation du paiement.",
  card_success_body: "Votre mission est confirmée. Les agents qualifiés dans votre secteur vont recevoir une notification. Vous recevrez votre facture par email.",
  home: "Retour à l'accueil",
  stripe_info_sepa: "Vos coordonnées bancaires sont transmises directement à Stripe et ne transitent jamais par les serveurs SecurBook. Conforme au règlement SEPA UE 260/2012.",
  stripe_info_card: "Vos données bancaires sont chiffrées par Stripe et ne transitent jamais par les serveurs SecurBook. Paiement 3DS conforme DSP2.",
  sepa_legal: "En confirmant, vous autorisez le débit SEPA du montant indiqué. CGV applicables.",
  errors: {
    card_declined: 'Votre carte a été refusée. Veuillez utiliser une autre carte.',
    expired_card: 'Votre carte est expirée.',
    incorrect_number: 'Le numéro de carte est incorrect.',
    invalid_expiry_year: "L'année d'expiration est invalide.",
    processing_error: 'Une erreur de traitement est survenue. Veuillez réessayer.',
    do_not_honor: "Paiement refusé par votre banque. Contactez-la pour plus d'informations.",
    invalid_iban: "L'IBAN saisi est invalide. Vérifiez le format.",
    sepa_unexpected: 'Le mandat SEPA est dans un état inattendu. Réessayez.',
    generic: 'Opération refusée. Vérifiez vos informations.',
  },
  history: {
    title: 'Historique paiements', empty_subtitle: 'Vos paiements apparaîtront ici après votre première mission.',
    status: { paid: 'Payé', failed: 'Échoué', refunded: 'Remboursé' },
  },
  methods: {
    title: 'Mes cartes & SEPA', delete_error: 'Impossible de supprimer cette méthode de paiement.',
    security_1: "Vos moyens de paiement sont sauvegardés automatiquement lors d'un paiement réussi.",
    security_2: 'Ils sont stockés exclusivement chez Stripe (PCI-DSS Level 1).',
    security_3: 'Vous pouvez les supprimer à tout moment depuis cette page.',
  },
};

export default payment;

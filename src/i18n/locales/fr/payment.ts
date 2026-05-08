import type { PaymentNS } from '../types';

const payment: PaymentNS = {
  title_card: 'Carte bancaire',
  title_sepa: 'Débit SEPA',
  secured_by: 'Sécurisé par Stripe',

  incomplete_card: 'Veuillez saisir vos informations de carte complètes.',
  sepa_failed: "Le mandat SEPA n'a pas pu être confirmé. Veuillez réessayer.",
  card_failed: "Le paiement n'a pas pu être confirmé. Veuillez réessayer.",

  sepa_success: 'Mandat SEPA enregistré !',
  card_success: 'Paiement confirmé !',

  sepa_success_body:
    "Votre mandat SEPA est enregistré. Le débit sera effectué sous 1 à 2 jours ouvrés. Votre mission sera activée dès confirmation du paiement.",

  card_success_body:
    "Votre mission est confirmée. Les agents qualifiés dans votre secteur recevront une notification. Vous recevrez votre facture par e-mail.",

  home: "Retour à l'accueil",

  stripe_info_sepa:
    "Vos coordonnées bancaires sont transmises directement à Stripe et ne transitent jamais par les serveurs Provalk. Conforme au règlement SEPA UE 260/2012.",

  stripe_info_card:
    "Vos données bancaires sont chiffrées par Stripe et ne transitent jamais par les serveurs Provalk. Paiement 3D Secure conforme à la DSP2.",

  sepa_legal:
    "En confirmant, vous autorisez le débit SEPA du montant indiqué. CGV applicables.",

  amount_sub: 'TVA 20% incluse · Virement agent à J+15',
  invoice_ref:        'Paiement #{{ref}}',
  invoice_count:      '{{count}} facture',
  invoice_open_error: "Impossible d'ouvrir la facture.",

  errors: {
    card_declined:
      'Votre carte a été refusée. Veuillez utiliser une autre carte.',
    expired_card: 'Votre carte est expirée.',
    incorrect_number: 'Le numéro de carte est incorrect.',
    invalid_expiry_year: "L'année d'expiration est invalide.",
    processing_error:
      'Une erreur de traitement est survenue. Veuillez réessayer.',
    do_not_honor:
      "Paiement refusé par votre banque. Contactez-la pour plus d'informations.",
    invalid_iban:
      "L'IBAN saisi est invalide. Vérifiez le format.",
    sepa_unexpected:
      'Le mandat SEPA est dans un état inattendu. Réessayez.',
    generic:
      'Opération refusée. Vérifiez vos informations.',
  },

  history: {
    title: 'Historique des paiements',
    empty_subtitle:
      'Vos paiements apparaîtront ici après votre première mission.',
    status: {
      paid: 'Payé',
      failed: 'Échoué',
      refunded: 'Remboursé',
      pending: 'En attente',
      processing: 'En cours',
    },
  },

  methods: {
    title: 'Mes cartes et SEPA',
    screen_title: 'Moyens de paiement',
    delete_error: 'Impossible de supprimer cette méthode de paiement.',
    delete_error_title: 'Erreur',
    delete_confirm_title: 'Supprimer le moyen de paiement',
    delete_confirm_body: 'Supprimer {{label}} ?',
    delete_confirm_btn: 'Supprimer',
    delete_cancel_btn: 'Annuler',
    empty_title: 'Aucun moyen de paiement',
    empty_subtitle: "Ajoutez une carte ou un IBAN via le bouton + pour payer vos missions plus rapidement.",
    saved_label: 'ENREGISTRÉS',
    how_title: 'Comment ça fonctionne ?',
    stripe_info: "Vos données bancaires sont stockées de manière sécurisée par Stripe. Provalk n’y a jamais accès.",
    security_1: "Vos moyens de paiement sont sauvegardés automatiquement lors d'un paiement réussi.",
    security_2: 'Ils sont stockés exclusivement chez Stripe (PCI-DSS niveau 1).',
    security_3: 'Vous pouvez les supprimer à tout moment depuis cette page.',
  },

  offline: {
    title: 'Paiement hors ligne',
    subtitle: 'Virement ou chèque',

    method_virement: 'Virement',
    method_cheque: 'Chèque',
    method_bank: 'Bancaire',
    method_postal: 'Postal',

    confirm_virement: 'Confirmer le virement',
    confirm_cheque: 'Confirmer le chèque',
    confirming: 'Enregistrement...',

    delay_title: 'Délai de traitement',
    delay_virement:
      '1 à 3 jours ouvrés. Pour une confirmation immédiate, privilégiez la carte ou le SEPA.',
    delay_cheque:
      '2 à 5 jours ouvrés selon les délais postaux.',

    info_virement:
      "Vous recevrez les coordonnées bancaires (IBAN + référence). Votre mission sera publiée après réception du virement (1 à 3 jours ouvrés).",

    info_cheque:
      "Vous recevrez l'adresse d'envoi du chèque. Votre mission sera publiée après réception et validation.",

    declared_title: 'Déclaration enregistrée',

    declared_subtitle_virement:
      "Effectuez le virement avec les coordonnées ci-dessous. Votre mission sera confirmée dès réception par notre équipe (1 à 3 jours ouvrés).",

    declared_subtitle_cheque:
      "Envoyez votre chèque à l'adresse ci-dessous. Votre mission sera confirmée dès réception.",

    iban_label: 'IBAN',
    bic_label: 'BIC / SWIFT',
    ref_label: 'Référence obligatoire',

    beneficiary_label: 'Bénéficiaire',
    payable_label: "À l'ordre de",
    address_label: "Adresse d'envoi",

    amount_exact: 'Montant exact',
    amount_cheque: 'Montant du chèque',

    bank_coords_title: 'COORDONNÉES BANCAIRES',
    cheque_title: 'ENVOI DU CHÈQUE',

    follow_mission: 'Suivre ma mission',
    copied: 'Copié !',
  },
};

export default payment;

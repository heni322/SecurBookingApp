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

  pay: {
    title: 'Paiement',
    saved_title: 'CARTES ENREGISTRÉES',
    account_iban: 'Compte bancaire (IBAN)',
    account_card: 'Carte bancaire',
    saved_selected: 'Carte enregistrée sélectionnée — aucune saisie requise.',
    iban_invalid: 'Format IBAN invalide — ex : FR76 3000 4028…',
    iban_valid: 'IBAN valide',
    mandate_text: 'En fournissant votre IBAN, vous autorisez Provalk à débiter votre compte du montant indiqué conformément au mandat SEPA. Vous bénéficiez d\'un droit au remboursement dans les 8 semaines suivant le débit.',
    cta_processing: 'Traitement en cours…',
    cta_sepa: 'Confirmer le mandat SEPA',
    cta_pay: 'Payer {{amount}}',
    footer_cgv: 'En confirmant, vous acceptez les CGV Provalk et la politique de remboursement.',
    err_generic: 'Une erreur est survenue lors du paiement.',
  },
  add: {
    header_method: 'Moyen de paiement',
    header_add: 'Ajouter un moyen de paiement',
    header_iban: 'Ajouter un IBAN',
    header_card: 'Ajouter une carte',
    pick_sub: 'Stocké en sécurité chez Stripe (PCI-DSS niveau 1).',
    card_label: 'Carte bancaire',
    card_desc: 'Visa - Mastercard - CB - AMEX',
    sepa_label: 'Débit SEPA (IBAN)',
    sepa_desc: 'Virement SEPA - Zone euro',
    method_badge_card: 'Carte bancaire',
    method_badge_sepa: 'Débit SEPA',
    form_title_card: 'Informations de carte',
    form_title_sepa: 'Coordonnées bancaires',
    iban_field_label: 'IBAN',
    mandate_text: 'En fournissant votre IBAN vous autorisez Provalk à débiter votre compte conformément au mandat SEPA. Droit au remboursement dans les 8 semaines.',
    sec_info_card: 'Vos données de carte sont chiffrées par Stripe. Paiement 3DS DSP2.',
    sec_info_sepa: 'Vos coordonnées bancaires transitent directement vers Stripe.',
    incomplete_card: 'Veuillez saisir vos informations de carte complètes.',
    invalid_iban: 'Veuillez saisir un IBAN valide.',
    success_sub_card: 'Votre carte est sauvegardée en sécurité chez Stripe. Utilisez-la lors de vos prochains paiements.',
    success_sub_sepa: 'Votre IBAN est enregistré et disponible pour vos prochaines missions SEPA.',
    success_cta: 'Voir mes moyens de paiement',
    save_card: 'Enregistrer la carte',
    save_iban: "Enregistrer l'IBAN",
    saving: 'Enregistrement...',
    err_session: 'Impossible de créer la session. Réessayez.',
    err_card_refused: 'Carte refusée.',
    err_card_save: "La carte n'a pas pu être enregistrée.",
    err_iban_refused: 'IBAN refusé.',
    err_sepa_save: "Le mandat SEPA n'a pas pu être enregistré.",
    err_generic: 'Une erreur est survenue.',
    iban_hint: 'Saisissez votre IBAN pour enregistrer le mandat SEPA.',
    footer_iban_consent: 'En confirmant vous autorisez Provalk à utiliser cet IBAN.',
    footer_tokenized: 'Données tokenisées par Stripe, jamais stockées sur nos serveurs.',
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
    result_title_virement: 'Coordonnées bancaires', result_title_cheque: 'Envoi du chèque',
    result_subtitle: 'Votre déclaration a été enregistrée',
    total_ttc: 'Montant total TTC', vat_included: 'TVA 20% incluse',
    method_section_title: 'MODE DE PAIEMENT', copy: 'Copier',
    copied: 'Copié !',
  },
};

export default payment;

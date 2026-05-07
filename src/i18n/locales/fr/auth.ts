import type { AuthNS } from '../types';

const auth: AuthNS = {
  login: {
    tagline: 'Sécurité privée on‑demand', title: 'Connexion', subtitle: 'Accédez à votre espace sécurisé',
    email_label: 'Adresse email', email_placeholder: 'vous@exemple.com',
    password_label: 'Mot de passe', password_placeholder: '••••••••',
    submit: 'Se connecter', submitting: 'Connexion…',
    secure_text: 'Connexion chiffrée TLS · Conforme RGPD',
    no_account: 'Pas encore de compte ?', create_link: 'Créer un compte', biometrics: 'Biométrie',
    errors: { email_required: 'Email requis', email_invalid: 'Email invalide', password_required: 'Mot de passe requis', invalid_creds: 'Email ou mot de passe incorrect.', generic: 'Connexion échouée' },
    alert: { title: 'Connexion impossible' },
  },
  register: {
    title: 'Créer un compte', subtitle: 'Rejoignez Provalk en quelques secondes',
    perks: { verified: 'Agents vérifiés & assurés', quote: 'Devis instantané en ligne', payment: 'Paiement 100% sécurisé' },
    account_type: 'TYPE DE COMPTE', individual: 'Particulier', individual_sub: 'Usage personnel', company: 'Entreprise', company_sub: 'Facturation B2B',
    full_name_label: 'Nom complet', full_name_placeholder: 'Jean Dupont',
    email_label: 'Adresse email', email_placeholder: 'vous@exemple.com',
    phone_label: 'Téléphone (optionnel)', phone_placeholder: '+33 6 00 00 00 00',
    password_hint: 'Lettres, chiffres et caractères spéciaux recommandés', password_placeholder: '8 caractères minimum',
    submit: 'Créer mon compte', rgpd: "En créant un compte, vous acceptez nos CGV et notre politique de confidentialité. Vos données sont protégées conformément au RGPD.",
    company_name_label: 'Raison sociale', company_name_placeholder: 'Ex: ACME SARL',
    siret_label: 'SIRET', siret_hint: '14 chiffres INSEE',
    accept_terms: "J'accepte les CGU et la politique de confidentialité (RGPD).",
    strength: { weak: 'Faible', fair: 'Moyen', good: 'Bon', strong: 'Excellent' },
    has_account: 'Déjà inscrit ?', login_link: 'Se connecter',
    errors: { full_name_required: 'Nom complet requis', email_required: 'Email requis', email_invalid: 'Email invalide', password_length: '8 caractères minimum', password_complexity: 'Doit contenir une majuscule et un chiffre', phone_invalid: 'Numéro de téléphone invalide', company_name_required: 'Raison sociale requise', siret_invalid: 'SIRET invalide (14 chiffres requis)', terms_required: 'Vous devez accepter les CGU pour continuer', email_taken: 'Cet email est déjà utilisé', too_many_attempts: 'Trop de tentatives. Réessayez dans 1 minute.', network: 'Connexion impossible — vérifiez votre réseau', generic: 'Erreur lors de la création du compte' },
    alert: { title: 'Inscription impossible' },
  },
  onboarding: {
    next: 'Suivant', skip: 'Passer', get_started: 'Commencer',
    slides: {
      security_title: 'Sécurité premium\nsur mesure',
      security_subtitle: 'Réservez des agents de sécurité qualifiés et certifiés pour vos événements, sites ou établissements.',
      tracking_title: 'Suivi en temps\nréel',
      tracking_subtitle: 'Localisez vos agents sur la carte, suivez les check-ins et recevez des alertes instantanées.',
      payment_title: 'Paiement simple\net sécurisé',
      payment_subtitle: 'Réglez en carte ou virement SEPA. Téléchargez vos factures en un tap.',
    },
  },
  two_fa: {
    title: 'Double authentification', description: "Saisissez le code à 6 chiffres de votre application d'authentification.",
    placeholder: '000000', submit: 'Vérifier', submitting: 'Vérification…', invalid: 'Code invalide. Veuillez réessayer.',
  },
  two_fa_screen: {
    header: 'Vérification', title: 'Code de vérification',
    subtitle: 'Entrez le code à 6 chiffres envoyé sur votre téléphone ou généré par votre app 2FA.',
    verify: 'Vérifier', incomplete_title: 'Code incomplet', incomplete_body: 'Entrez les 6 chiffres.',
    invalid_title: 'Code invalide', invalid_body: 'Le code est incorrect ou expiré.',
    resend: 'Renvoyer le code', resent_title: 'Code renvoyé', resent_body: 'Un nouveau code a été envoyé.', resend_error: 'Impossible de renvoyer le code.',
  },
};

export default auth;

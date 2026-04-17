import type { DisputeNS } from '../types';

const dispute: DisputeNS = {
  screen_title: 'Ouvrir un litige',
  done_title:   'Litige ouvert',
  back_btn:     'Retour à mes missions',

  reasons: {
    agent_absent: {
      label: 'Agent absent',
      desc:  "L'agent ne s'est pas présenté",
    },
    agent_late: {
      label: 'Agent en retard',
      desc:  'Retard significatif sans prévenir',
    },
    quality: {
      label: 'Qualité insuffisante',
      desc:  'Prestation non conforme aux attentes',
    },
    billing: {
      label: 'Problème facturation',
      desc:  'Montant incorrect ou double facturation',
    },
    behavior: {
      label: 'Comportement',
      desc:  "Comportement inapproprié de l'agent",
    },
    other: {
      label: 'Autre motif',
      desc:  'Autre motif de litige',
    },
  },

  form: {
    description_placeholder: "Décrivez précisément les faits : date, heure, ce qui s'est passé, les préjudices subis…",
  },

  submit:     'Soumettre le litige',
  submitting: 'Envoi en cours…',

  errors: {
    reason_required_title: 'Motif requis',
    reason_required_body:  'Sélectionnez un motif de litige.',
    desc_too_short_title:  'Description trop courte',
    desc_too_short_body:   'Minimum 20 caractères requis.',
    generic:               "Impossible d'ouvrir le litige. Contactez le support.",
  },
};

export default dispute;

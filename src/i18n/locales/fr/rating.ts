import type { RatingNS } from '../types';

const rating: RatingNS = {
  screen_title: "Évaluer l'agent",

  steps: {
    rating:  'Note',
    nps:     'Recommandation',
    comment: 'Commentaire',
  },

  // index 0 inutilisé ; 1=Insuffisant … 5=Excellent
  star_labels: ['', 'Insuffisant', 'Passable', 'Bien', 'Très bien', 'Excellent !'],

  step_rating: {
    title:    "Comment s'est passée la mission ?",
    subtitle: 'Évaluez la qualité globale de la prestation',
  },

  step_nps: {
    title:      'Recommanderiez-vous SecurBook ?',
    subtitle:   'De 0 (pas du tout) à 10 (certainement)',
    detractors: 'Détracteurs 0–6',
    passives:   'Passifs 7–8',
    promoters:  'Promoteurs 9–10',
  },

  step_comment: {
    title:       'Un commentaire ?',
    subtitle:    'Facultatif — aide les prochains clients',
    placeholder: 'Partagez votre expérience…',
    char_count:  '{{count}} / 300',
    skip:        'Envoyer sans commentaire',
    tags: [
      'Ponctuel et professionnel',
      'Excellent travail',
      'Communication parfaite',
      'Je recommande',
      'Très réactif',
      'Travail soigné',
    ],
  },

  // index 0-10 — chaîne vide = pas de libellé à cette position
  nps_scale: [
    'Extrêmement improbable', '', '', '', '', '',
    'Peu probable', '', 'Probable', 'Très probable', 'Extrêmement probable',
  ],

  nps_categories: {
    promoter:  'Promoteur',
    passive:   'Passif',
    detractor: 'Détracteur',
  },

  done: {
    title:    'Merci pour votre évaluation !',
    back_btn: 'Retour à mes missions',
  },

  nav: {
    back:     'Retour',
    continue: 'Continuer',
    submit:   "Envoyer l'évaluation",
    sending:  'Envoi…',
  },

  errors: {
    score_required_title: 'Note requise',
    score_required_body:  'Sélectionnez une note entre 1 et 5.',
    nps_required_title:   'NPS requis',
    nps_required_body:    'Sélectionnez votre probabilité de recommandation.',
    generic:              "Impossible d'envoyer la note.",
  },
};

export default rating;

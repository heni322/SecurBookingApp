import type { MissionsNS } from '../types';

const missions: MissionsNS = {
  title: 'Missions',
  subtitle_one: '{{count}} mission',
  subtitle_other: '{{count}} missions',
  new: 'Nouvelle',
  search_placeholder: 'Rechercher une mission...',

  filters: {
    all: 'Toutes',
    active: 'En cours',
    drafts: 'Brouillons',
    completed: 'Terminées',
    cancelled: 'Annulées',
  },

  empty: {
    no_results: 'Aucun résultat',
    no_missions: 'Aucune mission',
    filter_label: 'Aucune mission « {{filter}} »',
    search_sub: 'Aucune mission ne correspond à « {{query}} ».',
    all_sub: 'Créez votre première mission de sécurité.',
    category_sub: 'Aucune mission dans cette catégorie.',
    action: 'Créer une mission',
  },

  detail: {
    status: 'Statut',
    location: 'Lieu',
    date: 'Date',
    agent: 'Agent',

    cancel: 'Annuler la mission',
    rate: "Évaluer l'agent",
    track: 'Suivi en direct',

    screen_title: 'Détail de la mission',
    loading: 'Chargement...',
    error_load: 'Impossible de charger la mission.',
    retry: 'Réessayer',

    cancel_title: 'Annuler la mission',
    cancel_body: 'Cette action est irréversible. Continuer ?',
    cancel_back: 'Retour',
    cancel_confirm: 'Annuler',
    cancel_error: "Impossible d'annuler",

    duration: 'Durée',
    created_on: 'Créée le',

    cta_get_quote: 'Obtenir un devis',
    cta_see_quote: 'Voir le devis',
    cta_pay: 'Voir le devis et payer',
    cta_select: 'Sélectionner les agents',
    cta_waiting: 'En attente de candidatures...',
    cta_messaging: 'Messagerie de la mission',
  },

  statuses: {
    draft: 'Brouillon',
    published: 'Publiée',
    confirmed: 'Confirmée',
    in_progress: 'En cours',
    completed: 'Terminée',
    cancelled: 'Annulée',
    disputed: 'Litige',
  },

  success: {
    title: 'Mission lancée !',
    subtitle:
      'Votre paiement est confirmé. Nos agents qualifiés dans votre secteur recevront une notification sous peu.',

    timeline_title: 'ÉTAPES DE LA MISSION',
    step_confirmed: 'Mission confirmée et payée',
    step_published: 'Publication aux agents de votre secteur',
    step_selection: 'Sélection de vos agents',
    step_operational: 'Mission opérationnelle',
    step_done: 'TERMINÉE',

    info:
      "Vous recevrez une notification push et un e-mail dès qu'un agent acceptera votre mission. Votre facture sera disponible dans votre espace client.",

    home: "Retour à l'accueil",

    pending_title: 'Confirmation en cours...',
    pending_subtitle:
      'Nous vérifions la réception du paiement. Cela prend généralement quelques secondes.',

    timeout_title: 'Paiement en cours de traitement',
    timeout_subtitle:
      "Pour les paiements SEPA, la confirmation peut prendre 1 à 2 jours ouvrés. Vous recevrez une notification dès que votre mission sera confirmée.",

    timeout_info:
      "Votre mission sera publiée automatiquement aux agents dès réception du paiement. Aucune action supplémentaire n'est requise.",

    follow_mission: 'Suivre ma mission',
  },

  select_agent: {
    title: 'Choisir un agent',
    subtitle_one: '{{count}} candidature disponible',
    subtitle_other: '{{count}} candidatures disponibles',

    empty_title: 'Aucune candidature',
    empty_subtitle:
      "Aucun agent n'a encore postulé. Revenez dans quelques instants.",

    intro:
      "Comparez les profils et sélectionnez l'agent qui interviendra sur ce poste.",

    confirm_title: 'Confirmer la sélection',
    confirm_body:
      'Assigner {{name}} à ce poste ? Les autres candidatures seront automatiquement refusées.',

    success_title: 'Agent sélectionné',
    success_body: '{{name}} a été assigné à ce poste.',

    error: 'Impossible de sélectionner cet agent',
    select_btn: 'Sélectionner cet agent',
    selecting: 'Attribution...',
    experienced: 'Expérimenté',
    loading: 'Chargement des candidatures...',
  },

  create: {
    step_one: 'Étape 1 sur 3 · Tenues et agents',
    step_two: 'Étape 2 sur 3 · Localisation',
    step_three: 'Étape 3 sur 3 · Planification',

    service_required_title: 'Prestation requise',
    service_required_body: 'Sélectionnez au moins une prestation.',

    map_position_required: 'Sélectionnez une position sur la carte',
    start_required: 'Date de début requise',

    duration_min: 'Durée minimum : 6 heures (obligation légale)',
    duration_max: 'Durée maximum : 10 jours',

    end_before_start: 'La fin doit être après le début',
    start_min_future: 'La mission doit débuter dans au moins 1 heure',

    radius_min: 'Rayon minimum : 5 km',
    radius_max: 'Rayon maximum : 500 km',

    error_create: 'Erreur lors de la création',

    title_placeholder: 'Ex : Gardiennage soirée privée',
    instructions_placeholder:
      'Instructions particulières pour les agents...',

    schedule_title: 'Quand se déroule la mission ?',

    start_label: 'Début de mission *',
    start_hint: 'Au plus tôt dans 1 heure',
    end_hint: 'Durée minimum légale : 6 heures',

    summary_start: 'Début',
    summary_duration: 'Durée',

    next_btn: 'Étape suivante',
    create_btn: 'Créer et obtenir un devis',
  },
};

export default missions;
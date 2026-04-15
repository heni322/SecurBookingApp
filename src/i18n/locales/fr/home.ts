import type { HomeNS } from '../types';

const home: HomeNS = {
  greeting: {
    morning: 'Bonjour',
    evening: 'Bonsoir',
  },
  stats: {
    total:       'Total',
    completed:   'Terminées',
    in_progress: 'En cours',
  },
  cta: {
    title:    'Nouvelle mission',
    subtitle: 'Agents qualifiés en 48h',
  },
  active_mission: {
    label: 'MISSION EN COURS',
  },
  recent: {
    title:   'Missions récentes',
    see_all: 'Voir tout',
  },
  empty: {
    title:    'Aucune mission',
    subtitle: 'Créez votre première mission de sécurité.',
    action:   'Créer une mission',
  },
  sos: {
    title:           'Alerte SOS',
    body:            "En appuyant sur « Envoyer l'alerte », vous notifiez immédiatement les équipes d'urgence SecurBook ainsi que les autorités compétentes.",
    send:            "Envoyer l'alerte",
    cancel:          'Annuler',
    success_title:   '🚨 Alerte envoyée',
    success_body:    "Les équipes d'urgence ont été notifiées.",
    error_body:      "Impossible d'envoyer l'alerte. Appelez le 17.",
    trigger_message: "Alerte SOS déclenchée depuis l'application",
  },
};

export default home;

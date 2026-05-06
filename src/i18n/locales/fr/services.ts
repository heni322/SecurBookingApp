import type { ServicesNS } from '../types';

const services: ServicesNS = {
  screen_title: 'Prestations',
  subtitle:     'Sélectionnez un ou plusieurs services',
  continue_btn: 'Continuer',
  summary_agents: '{{count}} agent',
  summary_agents_plural: '{{count}} agents',

  empty: {
    title:    'Aucun service disponible',
    subtitle: 'Revenez plus tard.',
  },

  agent_config: { hide_detail: 'Masquer le détail', configure_agents: 'Configurer chaque agent' },
  available_title: 'PRESTATIONS DISPONIBLES',
  same_uniform_label: 'Même tenue pour tous :',
  add_btn: 'Ajouter',
  clear_all: 'Tout effacer',
  uniforms_none: 'Non précisée',
  agents_and_uniforms: 'Agents & tenues',
  summary: '{{lines}} prestation · {{agents}} agent',

  uniforms: {
    STANDARD:     { label: 'Standard',   desc: 'Uniforme noir réglementaire',   emoji: '🦺' },
    CIVIL:        { label: 'Civil',       desc: 'Tenue discrète, en civil',      emoji: '👔' },
    EVENEMENTIEL: { label: 'Soirée',      desc: 'Costume / tenue de gala',       emoji: '🤵' },
    SSIAP:        { label: 'SSIAP',       desc: 'Tenue incendie réglementaire',  emoji: '🔥' },
    CYNOPHILE:    { label: 'Cynophile',   desc: 'Tenue maître-chien',            emoji: '🐕' },
  },
};

export default services;

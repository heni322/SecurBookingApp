import type { ServicesNS } from '../types';

const services: ServicesNS = {
  screen_title: 'Services',
  subtitle:     'Select one or more services',
  continue_btn: 'Continue',
  summary_agents: '{{count}} agent',
  summary_agents_plural: '{{count}} agents',

  empty: {
    title:    'No services available',
    subtitle: 'Check back later.',
  },

  agent_config: { hide_detail: 'Hide details', configure_agents: 'Configure each agent', },
  available_title: 'AVAILABLE SERVICES',
  same_uniform_label: 'Same uniform for all:',
  add_btn: 'Add',
  clear_all: 'Clear all',
  uniforms_none: 'Not specified',
  agents_and_uniforms: 'Agents & uniforms',
  summary: '{{lines}} service · {{agents}} agent',

  uniforms: {
    STANDARD:     { label: 'Standard',  desc: 'Regulation black uniform',          emoji: 'ðŸ¦º' },
    CIVIL:        { label: 'Civil',      desc: 'Discreet civilian attire',          emoji: 'ðŸ‘”' },
    EVENEMENTIEL: { label: 'Evening',    desc: 'Suit / formal attire',              emoji: 'ðŸ¤µ' },
    SSIAP:        { label: 'SSIAP',      desc: 'Regulation fire-safety uniform',    emoji: 'ðŸ”¥' },
    CYNOPHILE:    { label: 'K9 Handler', desc: 'Dog handler uniform',               emoji: 'ðŸ•' },
  },
};

export default services;

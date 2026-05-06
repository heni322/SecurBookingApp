import type { DisputeNS } from '../types';

const dispute: DisputeNS = {
  screen_title:      'Open a dispute',
  done_title:        'Dispute opened',
  done_subtitle:     'Your request has been sent to our team. A manager will review the dispute within 48 business hours.',
  back_btn:          'Back to my missions',
  info_banner:       'Describe the facts precisely. Our team will review your dispute within 48 business hours and get back to you.',
  reason_label:      'Reason *',
  description_label: 'Description *',

  reasons: {
    agent_absent: {
      label: 'Agent absent',
      desc:  'The agent did not show up',
    },
    agent_late: {
      label: 'Agent late',
      desc:  'Significant delay without notice',
    },
    quality: {
      label: 'Insufficient quality',
      desc:  'Service not meeting expectations',
    },
    billing: {
      label: 'Billing issue',
      desc:  'Incorrect amount or double billing',
    },
    behavior: {
      label: 'Behaviour',
      desc:  'Inappropriate behaviour by the agent',
    },
    other: {
      label: 'Other reason',
      desc:  'Other dispute reason',
    },
  },

  form: {
    description_placeholder: 'Describe the facts precisely: date, time, what happened, the damages suffered…',
  },

  submit:     'Submit dispute',
  submitting: 'Sending…',

  errors: {
    reason_required_title: 'Reason required',
    reason_required_body:  'Select a dispute reason.',
    desc_too_short_title:  'Description too short',
    desc_too_short_body:   'Minimum 20 characters required.',
    generic:               'Unable to open dispute. Contact support.',
  },
};

export default dispute;

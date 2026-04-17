import type { RatingNS } from '../types';

const rating: RatingNS = {
  screen_title: 'Rate agent',

  steps: {
    rating:  'Rating',
    nps:     'Recommendation',
    comment: 'Comment',
  },

  // index 0 unused; 1=Poor … 5=Excellent
  star_labels: ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent!'],

  step_rating: {
    title:    'How did the mission go?',
    subtitle: 'Rate the overall quality of the service',
  },

  step_nps: {
    title:      'Would you recommend SecurBook?',
    subtitle:   'From 0 (not at all) to 10 (definitely)',
    detractors: 'Detractors 0–6',
    passives:   'Passives 7–8',
    promoters:  'Promoters 9–10',
  },

  step_comment: {
    title:       'Any comments?',
    subtitle:    'Optional — helps future clients',
    placeholder: 'Share your experience…',
    char_count:  '{{count}} / 300',
    skip:        'Send without comment',
    tags: [
      'Punctual and professional',
      'Excellent work',
      'Perfect communication',
      'I recommend',
      'Very responsive',
      'Thorough work',
    ],
  },

  // index 0-10 — empty string = no label shown at that position
  nps_scale: [
    'Extremely unlikely', '', '', '', '', '',
    'Unlikely', '', 'Likely', 'Very likely', 'Extremely likely',
  ],

  nps_categories: {
    promoter:  'Promoter',
    passive:   'Passive',
    detractor: 'Detractor',
  },

  done: {
    title:    'Thank you for your rating!',
    back_btn: 'Back to my missions',
  },

  nav: {
    back:     'Back',
    continue: 'Continue',
    submit:   'Send rating',
    sending:  'Sending…',
  },

  errors: {
    score_required_title: 'Rating required',
    score_required_body:  'Select a rating between 1 and 5.',
    nps_required_title:   'NPS required',
    nps_required_body:    'Select your recommendation probability.',
    generic:              'Unable to send rating.',
  },
};

export default rating;

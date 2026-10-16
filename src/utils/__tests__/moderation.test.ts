import { moderationMessages, moderationOutcome } from '../moderation';
import { toServiceTasksPayload } from '@components/domain/ServiceTasksPicker';

const axiosError = (status: number, data: unknown) => ({ response: { status, data } });
const findings = [
  { field: 'mission.notes', ruleCode: 'OOS_WASTE', severity: 'WARN', excerpt: 'poubell', messageFr: 'Hors mission.', messageEn: 'Out of scope.' },
  { field: 'mission.notes', ruleCode: 'OOS_WASTE', severity: 'WARN', excerpt: 'poubell', messageFr: 'Hors mission.', messageEn: 'Out of scope.' },
];

describe('moderationOutcome', () => {
  it('recognises a confirmation request', () => {
    const out = moderationOutcome(axiosError(422, { key: 'moderation.errors.confirmation_required', args: { findings } }));
    expect(out?.kind).toBe('confirm');
    expect(out?.findings).toHaveLength(2);
  });

  it('recognises a refusal', () => {
    expect(moderationOutcome(axiosError(400, { key: 'moderation.errors.blocked', args: { findings } }))?.kind).toBe('blocked');
  });

  it('ignores other errors', () => {
    expect(moderationOutcome(axiosError(400, { key: 'missions.errors.not_found' }))).toBeNull();
    expect(moderationOutcome(new Error('Network Error'))).toBeNull();
  });
});

describe('moderationMessages', () => {
  it('dedupes by rule and picks the language', () => {
    const out = moderationOutcome(axiosError(422, { key: 'moderation.errors.confirmation_required', args: { findings } }))!;
    expect(moderationMessages(out, 'fr')).toEqual(['« poubell » — Hors mission.']);
    expect(moderationMessages(out, 'en-GB')).toEqual(['« poubell » — Out of scope.']);
  });
});

describe('toServiceTasksPayload', () => {
  it('keeps only services still in the order, without duplicates or empty lists', () => {
    expect(
      toServiceTasksPayload({ ads: ['ADS_ROUNDS', 'ADS_ROUNDS'], ssiap: ['SSIAP1_FIRE_ROUNDS'], apr: [] }, ['ads', 'apr']),
    ).toEqual([{ serviceTypeId: 'ads', taskCodes: ['ADS_ROUNDS'] }]);
  });
});

/**
 * Réponses de la modération des textes libres (API : modules/moderation).
 *
 *  - 400 `moderation.errors.blocked`              : demande illégale, à modifier ;
 *  - 422 `moderation.errors.confirmation_required` : hors mission ; le client
 *    corrige, ou maintient son texte (relu par Provalk avant transmission).
 */

export interface ModerationFinding {
  field:     string;
  ruleCode:  string;
  severity:  string;
  excerpt:   string;
  messageFr: string;
  messageEn: string;
}

export interface ModerationOutcome {
  kind:     'blocked' | 'confirm';
  findings: ModerationFinding[];
}

export const MODERATION_BLOCKED = 'moderation.errors.blocked';
export const MODERATION_CONFIRM = 'moderation.errors.confirmation_required';

/** Reconnaît une réponse de modération dans une erreur axios. */
export function moderationOutcome(err: unknown): ModerationOutcome | null {
  const data = (err as { response?: { data?: { key?: string; args?: { findings?: unknown } } } })
    ?.response?.data;
  const kind =
    data?.key === MODERATION_BLOCKED ? 'blocked'
    : data?.key === MODERATION_CONFIRM ? 'confirm'
    : null;
  if (!kind) return null;
  const findings = Array.isArray(data?.args?.findings)
    ? (data!.args!.findings as ModerationFinding[])
    : [];
  return { kind, findings };
}

/** Messages lisibles, sans doublon, dans la langue de l'utilisateur. */
export function moderationMessages(outcome: ModerationOutcome, lang: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of outcome.findings) {
    const msg = lang.startsWith('en') ? f.messageEn || f.messageFr : f.messageFr;
    const line = f.excerpt ? `« ${f.excerpt} » — ${msg}` : msg;
    if (!seen.has(f.ruleCode)) {
      seen.add(f.ruleCode);
      out.push(line);
    }
  }
  return out;
}

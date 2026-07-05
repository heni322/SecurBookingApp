/**
 * useWizardSteps — generic step-state machine for multi-step forms.
 *
 * Replaces the identical step / activeSteps / stepIndex / goNext / goBack
 * blocks that were duplicated in AddDocumentScreen and PartnerAddDocumentScreen.
 *
 * Design notes:
 *   • `steps` is the COMPUTED ordered list of active step keys. Callers pass
 *     a memoised array — this hook treats it as a value, not an array literal.
 *   • All callbacks returned (setStep / goNext / goBack) are stable across
 *     re-renders, so they can be safely listed (or omitted) in callers'
 *     useCallback dependency arrays without exhaustive-deps complaints.
 *   • `initial` defaults to the first step. If `initial` changes mid-flow,
 *     this hook does NOT reset — the user-visible step is the source of truth.
 *   • Out-of-bounds navigation (next at the last step, back at the first) is
 *     a no-op, never throws. This matches the original screen behaviour.
 */
import { useCallback, useMemo, useRef, useState } from 'react';

export interface WizardState<Step extends string> {
  /** The currently visible step key. */
  step:       Step;
  /** Imperatively jump to a specific step. Stable across renders. */
  setStep:    (s: Step) => void;
  /** Zero-based index of `step` inside `steps`. -1 if not found. */
  stepIndex:  number;
  /** Total number of active steps. */
  totalSteps: number;
  /** `stepIndex / (totalSteps - 1)` clamped to [0,1]. Useful for progress bars. */
  progress:   number;
  /** Is `step` the first one? Hides the Back button when true. */
  isFirst:    boolean;
  /** Is `step` the last one? Switches the primary CTA from "Continuer" to "Envoyer". */
  isLast:     boolean;
  /** Advance to the next step. No-op at the last step. Stable across renders. */
  goNext:     () => void;
  /** Return to the previous step. No-op at the first step. Stable across renders. */
  goBack:     () => void;
}

export function useWizardSteps<Step extends string>(
  steps: readonly Step[],
  initial?: Step,
): WizardState<Step> {
  const [step, setStepInternal] = useState<Step>(initial ?? steps[0]);

  // Keep a ref to the latest `steps` so the stable callbacks below always
  // see the current list without needing it in their dependency array.
  // This is the "stale closure" guard: the user might pick a doc type that
  // changes the active steps, and we need goNext/goBack to use the NEW list.
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const stepIndex  = useMemo(() => steps.indexOf(step), [steps, step]);
  const totalSteps = steps.length;
  const progress   = useMemo(() => {
    if (totalSteps <= 1) return 0;
    const raw = stepIndex / (totalSteps - 1);
    return Math.min(1, Math.max(0, raw));
  }, [stepIndex, totalSteps]);

  // Stable setters — empty deps array is safe because we read state via the
  // functional updater form and pull `steps` from the ref above.
  const setStep = useCallback((s: Step) => setStepInternal(s), []);

  const goNext = useCallback(() => {
    setStepInternal(prev => {
      const list = stepsRef.current;
      const i = list.indexOf(prev);
      return (i >= 0 && i < list.length - 1) ? list[i + 1] : prev;
    });
  }, []);

  const goBack = useCallback(() => {
    setStepInternal(prev => {
      const list = stepsRef.current;
      const i = list.indexOf(prev);
      return (i > 0) ? list[i - 1] : prev;
    });
  }, []);

  return {
    step, setStep, stepIndex, totalSteps, progress,
    isFirst: stepIndex <= 0,
    isLast:  stepIndex === totalSteps - 1,
    goNext, goBack,
  };
}

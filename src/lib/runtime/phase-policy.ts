/**
 * Runtime product phase policy.
 * Phase 1 is open-access by default unless explicitly disabled.
 */
export const PHASE1_FREE_MODE = process.env.PHASE1_FREE_MODE !== 'false';

export function isPhase1FreeMode(): boolean {
  return PHASE1_FREE_MODE;
}

export function isCheckoutDisabledByPolicy(): boolean {
  return PHASE1_FREE_MODE;
}


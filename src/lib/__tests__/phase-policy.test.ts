/**
 * Unit Tests — runtime/phase-policy.ts (env-driven open access)
 *
 * - PHASE1_FREE_MODE: env unset / explicit "false" / true
 * - isPhase1FreeMode / isCheckoutDisabledByPolicy delegate
 *
 * NOT: PHASE1_FREE_MODE module-level const olarak değerlendirilir;
 * import zamanında kalıcılaşır. Bu yüzden vi.stubEnv test sırasında
 * etkili olmaz; module re-import gerekir. Burada module-level const
 * davranışı + delegate identity test edilir.
 */

import { describe, it, expect } from 'vitest';
import {
  PHASE1_FREE_MODE,
  isPhase1FreeMode,
  isCheckoutDisabledByPolicy,
} from '../runtime/phase-policy';

describe('phase-policy', () => {
  it('PHASE1_FREE_MODE — module-level boolean export', () => {
    expect(typeof PHASE1_FREE_MODE).toBe('boolean');
  });

  it('isPhase1FreeMode — PHASE1_FREE_MODE değerini döner', () => {
    expect(isPhase1FreeMode()).toBe(PHASE1_FREE_MODE);
  });

  it('isCheckoutDisabledByPolicy — PHASE1_FREE_MODE değerini döner (delegate)', () => {
    expect(isCheckoutDisabledByPolicy()).toBe(PHASE1_FREE_MODE);
  });

  it('isPhase1FreeMode === isCheckoutDisabledByPolicy (semantic equivalence)', () => {
    expect(isPhase1FreeMode()).toBe(isCheckoutDisabledByPolicy());
  });

  it('default — env unset → true (open access)', () => {
    // Test env'de PHASE1_FREE_MODE === "false" değilse true olmalı
    if (process.env.PHASE1_FREE_MODE !== 'false') {
      expect(PHASE1_FREE_MODE).toBe(true);
    } else {
      expect(PHASE1_FREE_MODE).toBe(false);
    }
  });
});

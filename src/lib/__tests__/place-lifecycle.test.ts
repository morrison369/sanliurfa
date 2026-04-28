import { describe, expect, it } from 'vitest';
import { assertPlaceStatusTransition, canTransitionPlaceStatus } from '../place/lifecycle';

describe('place lifecycle', () => {
  it('allows user draft -> pending', () => {
    expect(canTransitionPlaceStatus('draft', 'pending', 'user')).toBe(true);
  });

  it('blocks user pending -> active', () => {
    expect(canTransitionPlaceStatus('pending', 'active', 'user')).toBe(false);
  });

  it('allows admin pending -> active', () => {
    expect(canTransitionPlaceStatus('pending', 'active', 'admin')).toBe(true);
  });

  it('returns explicit error for invalid transitions', () => {
    const result = assertPlaceStatusTransition('active', 'pending', 'admin');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Geçersiz durum geçişi');
    }
  });
});


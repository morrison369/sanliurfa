import { describe, expect, it } from 'vitest';
import { generateRequestId } from '../logging';

describe('logging', () => {
  it('generates non-empty request ids', () => {
    const id = generateRequestId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(8);
  });

  it('generates unique ids across calls', () => {
    const first = generateRequestId();
    const second = generateRequestId();
    expect(first).not.toBe(second);
  });
});

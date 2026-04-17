import { describe, expect, it } from 'vitest';

import {
  extractEnvelopeMessage,
  resolveEnvelopeData,
  resolveNestedEnvelopeData,
} from '../api-envelope';

describe('api-envelope helpers', () => {
  it('unwraps first level envelope data', () => {
    expect(resolveEnvelopeData({ data: { items: [1, 2] } })).toEqual({ items: [1, 2] });
  });

  it('unwraps nested envelope data', () => {
    expect(resolveNestedEnvelopeData({ data: { data: { items: [1, 2] } } })).toEqual({
      items: [1, 2],
    });
  });

  it('extracts message from envelope or error object', () => {
    expect(extractEnvelopeMessage({ data: { message: 'Tamam' } }, 'Yedek')).toBe('Tamam');
    expect(extractEnvelopeMessage({ error: { message: 'Hata' } }, 'Yedek')).toBe('Hata');
    expect(extractEnvelopeMessage({}, 'Yedek')).toBe('Yedek');
  });
});

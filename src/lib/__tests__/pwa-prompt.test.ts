import { describe, expect, it } from 'vitest';

import {
  buildPwaPromptClassName,
  extractVapidKey,
  shouldShowPwaPrompt,
} from '../pwa-prompt';

describe('pwa prompt helpers', () => {
  it('shows prompt only when prompt is ready and app is not installed', () => {
    expect(shouldShowPwaPrompt(true, false)).toBe(true);
    expect(shouldShowPwaPrompt(false, false)).toBe(false);
    expect(shouldShowPwaPrompt(true, true)).toBe(false);
  });

  it('builds visible and hidden classes', () => {
    expect(buildPwaPromptClassName(true)).not.toContain(' hidden ');
    expect(buildPwaPromptClassName(false)).toContain(' hidden ');
  });

  it('extracts vapid key from direct or envelope payload', () => {
    expect(extractVapidKey({ vapidKey: 'direct-key' })).toBe('direct-key');
    expect(extractVapidKey({ data: { vapidKey: 'wrapped-key' } })).toBe('wrapped-key');
    expect(extractVapidKey({ data: {} })).toBe('');
  });
});

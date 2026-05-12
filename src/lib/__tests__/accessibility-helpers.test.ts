/**
 * Unit Tests — accessibility/index.ts pure helpers
 *
 * - keyboardHelper.focusableSelectors (CSS selector array)
 * - keyboardHelper.isEnter (Enter key check)
 * - keyboardHelper.isSpace (Space / "Spacebar" legacy support)
 *
 * NOT: getFocusableElements/trapFocus/announce DOM-bağımlı (HTMLElement, document) — bu testte kapsam dışı.
 * Testler sadece pure helper'ları (key event check) doğrular.
 */

import { describe, it, expect } from 'vitest';
import keyboardHelper, { keyboardHelper as namedKeyboardHelper } from '../accessibility/index';

describe('focusableSelectors', () => {
  it('default export = named export (same singleton)', () => {
    expect(keyboardHelper).toBe(namedKeyboardHelper);
  });

  it('focusableSelectors — 6 a11y-uyumlu selector', () => {
    expect(keyboardHelper.focusableSelectors).toHaveLength(6);
    expect(keyboardHelper.focusableSelectors).toContain('button:not([disabled])');
    expect(keyboardHelper.focusableSelectors).toContain('a[href]');
    expect(keyboardHelper.focusableSelectors).toContain('[tabindex]:not([tabindex="-1"])');
  });
});

describe('isEnter', () => {
  it('Enter key → true', () => {
    expect(keyboardHelper.isEnter({ key: 'Enter' } as any)).toBe(true);
  });

  it('non-Enter key → false', () => {
    expect(keyboardHelper.isEnter({ key: 'Tab' } as any)).toBe(false);
    expect(keyboardHelper.isEnter({ key: 'a' } as any)).toBe(false);
  });
});

describe('isSpace', () => {
  it(' (space char) → true', () => {
    expect(keyboardHelper.isSpace({ key: ' ' } as any)).toBe(true);
  });

  it('"Spacebar" (legacy IE/Edge) → true', () => {
    expect(keyboardHelper.isSpace({ key: 'Spacebar' } as any)).toBe(true);
  });

  it('non-space key → false', () => {
    expect(keyboardHelper.isSpace({ key: 'Enter' } as any)).toBe(false);
    expect(keyboardHelper.isSpace({ key: 'space' } as any)).toBe(false); // case-sensitive
  });
});

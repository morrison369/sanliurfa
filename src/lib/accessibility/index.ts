/**
 * Accessibility Helpers
 * Stub module for keyboard navigation and a11y
 */

export interface A11yConfig {
  skipLinks?: boolean;
  focusIndicators?: boolean;
  announcements?: boolean;
}

export const keyboardHelper = {
  focusableSelectors: [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ],

  getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(this.focusableSelectors.join(', ')));
  },

  trapFocus(container: HTMLElement, event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const focusable = this.getFocusableElements(container);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  },

  isEnter(event: KeyboardEvent | React.KeyboardEvent): boolean {
    return event.key === 'Enter';
  },

  isSpace(event: KeyboardEvent | React.KeyboardEvent): boolean {
    return event.key === ' ' || event.key === 'Spacebar';
  }
};

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = message;
  document.body.appendChild(announcer);
  setTimeout(() => document.body.removeChild(announcer), 1000);
}

export default keyboardHelper;

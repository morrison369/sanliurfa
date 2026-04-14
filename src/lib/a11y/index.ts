/**
 * Accessibility Module (WCAG 2.1 AA)
 * ARIA helpers, focus management, and screen reader support
 */

// Framework-agnostic - can be used with any framework

// Focus management
/**
 * Trap focus within an element (for modals, dialogs)
 */
export function trapFocus(element: HTMLElement, enabled: boolean = true) {
  if (!enabled) return () => {};

  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  };

  element.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();

  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Skip link for keyboard navigation
 */
export function createSkipLink(targetId: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.className = 'skip-link';
  link.textContent = 'Ana içeriğe atla';
  
  // Add styles
  link.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px 16px;
    z-index: 10000;
    transition: top 0.3s;
    text-decoration: none;
  `;

  link.addEventListener('focus', () => {
    link.style.top = '0';
  });

  link.addEventListener('blur', () => {
    link.style.top = '-40px';
  });

  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });

  return link;
}

/**
 * Announce to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;

  document.body.appendChild(announcer);
  
  // Small delay to ensure announcement
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);

  // Cleanup
  setTimeout(() => {
    announcer.remove();
  }, 1000);
}

/**
 * ARIA helper for dynamic content updates
 */
export function createLiveRegion(id: string, priority: 'polite' | 'assertive' = 'polite'): HTMLDivElement {
  const region = document.createElement('div');
  region.id = id;
  region.setAttribute('aria-live', priority);
  region.setAttribute('aria-atomic', 'true');
  region.className = 'sr-only';
  region.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  
  return region;
}

/**
 * Manage page title for accessibility
 */
export function setPageTitle(title: string, siteName: string = 'Şanlıurfa.com') {
  document.title = title ? `${title} | ${siteName}` : siteName;
}

/**
 * Handle reduced motion preference
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Handle high contrast preference
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Handle color scheme preference
 */
export function getColorSchemePreference(): 'light' | 'dark' | 'no-preference' {
  if (typeof window === 'undefined') return 'no-preference';
  
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'no-preference';
}

// ARIA patterns
/**
 * Accordion pattern
 */
export function createAccordion(container: HTMLElement) {
  const buttons = container.querySelectorAll('[data-accordion-trigger]');
  const panels = container.querySelectorAll('[data-accordion-panel]');

  buttons.forEach((button, index) => {
    const panel = panels[index];
    if (!panel) return;

    const panelId = `accordion-panel-${index}`;
    const buttonId = `accordion-button-${index}`;

    button.setAttribute('id', buttonId);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', panelId);

    panel.setAttribute('id', panelId);
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', buttonId);
    panel.setAttribute('hidden', '');

    button.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      
      // Close others (if single expand mode)
      if (container.hasAttribute('data-single-expand')) {
        buttons.forEach((btn, i) => {
          if (i !== index) {
            btn.setAttribute('aria-expanded', 'false');
            panels[i]?.setAttribute('hidden', '');
          }
        });
      }

      button.setAttribute('aria-expanded', String(!isExpanded));
      if (isExpanded) {
        panel.setAttribute('hidden', '');
      } else {
        panel.removeAttribute('hidden');
      }
    });
  });
}

/**
 * Tabs pattern
 */
export function createTabs(container: HTMLElement) {
  const tabList = container.querySelector('[role="tablist"]');
  const tabs = container.querySelectorAll('[role="tab"]');
  const panels = container.querySelectorAll('[role="tabpanel"]');

  if (!tabList) return;

  tabs.forEach((tab, index) => {
    tab.setAttribute('tabindex', index === 0 ? '0' : '-1');

    tab.addEventListener('click', () => activateTab(index));
    
    tab.addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key;
      let newIndex = index;

      if (key === 'ArrowRight') {
        newIndex = (index + 1) % tabs.length;
      } else if (key === 'ArrowLeft') {
        newIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (key === 'Home') {
        newIndex = 0;
      } else if (key === 'End') {
        newIndex = tabs.length - 1;
      }

      if (newIndex !== index) {
        e.preventDefault();
        activateTab(newIndex);
        (tabs[newIndex] as HTMLElement).focus();
      }
    });
  });

  function activateTab(index: number) {
    tabs.forEach((tab, i) => {
      const isSelected = i === index;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    panels.forEach((panel, i) => {
      if (i === index) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    });
  }

  // Activate first tab
  activateTab(0);
}

/**
 * Modal/Dialog pattern
 */
export function createDialog(dialog: HTMLElement, trigger: HTMLElement) {
  const closeButton = dialog.querySelector('[data-dialog-close]');
  let previousActiveElement: Element | null = null;

  function open() {
    previousActiveElement = document.activeElement;
    dialog.removeAttribute('hidden');
    dialog.setAttribute('aria-modal', 'true');
    
    const cleanup = trapFocus(dialog);
    
    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    
    dialog.addEventListener('keydown', handleEscape);
    
    // Close on outside click
    const handleOutsideClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        close();
      }
    };
    
    dialog.addEventListener('click', handleOutsideClick);

    // Store cleanup
    (dialog as any)._cleanup = () => {
      cleanup();
      dialog.removeEventListener('keydown', handleEscape);
      dialog.removeEventListener('click', handleOutsideClick);
    };

    announce('Dialog açıldı');
  }

  function close() {
    if ((dialog as any)._cleanup) {
      (dialog as any)._cleanup();
    }
    
    dialog.setAttribute('hidden', '');
    dialog.removeAttribute('aria-modal');
    
    // Return focus
    if (previousActiveElement instanceof HTMLElement) {
      previousActiveElement.focus();
    }

    announce('Dialog kapandı');
  }

  trigger.addEventListener('click', open);
  closeButton?.addEventListener('click', close);

  return { open, close };
}

/**
 * Validate form accessibility
 */
export function validateFormAccessibility(form: HTMLFormElement): string[] {
  const issues: string[] = [];

  // Check for labels
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const id = input.id;
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    const hasLabel = id && form.querySelector(`label[for="${id}"]`);
    const hasPlaceholder = input.hasAttribute('placeholder');

    if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
      issues.push(`Input missing label: ${id || input.name || 'unnamed'}`);
    }

    if (hasPlaceholder && !hasLabel && !ariaLabel) {
      issues.push(`Input using placeholder as only label: ${id || input.name}`);
    }

    // Check for error association
    if (input.hasAttribute('aria-invalid') && !input.hasAttribute('aria-describedby')) {
      issues.push(`Invalid input missing error message: ${id || input.name}`);
    }
  });

  // Check for required indicators
  const requiredInputs = form.querySelectorAll('[required]');
  requiredInputs.forEach(input => {
    const label = form.querySelector(`label[for="${input.id}"]`);
    if (label && !label.textContent?.includes('*') && !input.hasAttribute('aria-required')) {
      // Not necessarily an issue, but good practice
    }
  });

  return issues;
}

/**
 * Keyboard navigation helper
 */
export function handleKeyboardNavigation(
  container: HTMLElement,
  options: {
    selector: string;
    onSelect: (element: HTMLElement) => void;
  }
) {
  const items = Array.from(container.querySelectorAll(options.selector));
  let currentIndex = -1;

  container.addEventListener('keydown', (e) => {
    const key = e.key;

    if (key === 'ArrowDown' || key === 'ArrowRight') {
      e.preventDefault();
      currentIndex = (currentIndex + 1) % items.length;
      (items[currentIndex] as HTMLElement).focus();
    } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
      e.preventDefault();
      currentIndex = (currentIndex - 1 + items.length) % items.length;
      (items[currentIndex] as HTMLElement).focus();
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      if (currentIndex >= 0) {
        options.onSelect(items[currentIndex] as HTMLElement);
      }
    } else if (key === 'Home') {
      e.preventDefault();
      currentIndex = 0;
      (items[0] as HTMLElement).focus();
    } else if (key === 'End') {
      e.preventDefault();
      currentIndex = items.length - 1;
      (items[currentIndex] as HTMLElement).focus();
    }
  });
}

// CSS class for screen reader only content
export const srOnlyStyles = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px 16px;
    z-index: 10000;
    transition: top 0.3s;
  }

  .skip-link:focus {
    top: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  @media (prefers-contrast: high) {
    :root {
      --color-border: #000;
      --color-text: #000;
      --color-bg: #fff;
    }
  }
`;

/**
 * Run accessibility audit on page
 */
export function runAccessibilityAudit(): { issues: string[]; score: number } {
  const issues: string[] = [];

  // Check for lang attribute
  if (!document.documentElement.lang) {
    issues.push('HTML element missing lang attribute');
  }

  // Check for viewport meta
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    issues.push('Missing viewport meta tag');
  }

  // Check for main landmark
  const main = document.querySelector('main, [role="main"]');
  if (!main) {
    issues.push('Missing main landmark');
  }

  // Check for heading hierarchy
  const h1s = document.querySelectorAll('h1');
  if (h1s.length === 0) {
    issues.push('Missing h1 heading');
  } else if (h1s.length > 1) {
    issues.push('Multiple h1 headings found');
  }

  // Check images for alt text
  const images = document.querySelectorAll('img:not([alt])');
  images.forEach((img, i) => {
    const src = (img as HTMLImageElement).src?.split('/').pop();
    issues.push(`Image missing alt text: ${src || `img-${i}`}`);
  });

  // Check for low contrast (simplified)
  const elements = document.querySelectorAll('p, span, a, button');
  elements.forEach(el => {
    const style = window.getComputedStyle(el);
    const color = style.color;
    const bgColor = style.backgroundColor;
    
    // Very basic check - in production use a proper contrast checker
    if (color === bgColor && color !== 'rgba(0, 0, 0, 0)') {
      issues.push(`Potential contrast issue: ${el.tagName.toLowerCase()}`);
    }
  });

  // Check for focusable elements without visible focus
  const focusable = document.querySelectorAll('a, button, input, select, textarea');
  focusable.forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.outline === 'none' && !el.classList.contains('focus-visible')) {
      // Could be an issue, but many sites use custom focus styles
    }
  });

  // Calculate score
  const maxIssues = 20;
  const score = Math.max(0, 100 - (issues.length / maxIssues) * 100);

  return { issues, score: Math.round(score) };
}

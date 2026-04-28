/**
 * Client-side XSS Protection
 * Loaded on all pages for runtime protection
 */

(function() {
  'use strict';

  // Sanitize HTML content
  function sanitizeHTML(dirty) {
    return escapeHTML(dirty);
  }

  // Escape HTML entities
  function escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Sanitize user inputs
  document.addEventListener('input', function(e) {
    const target = e.target;
    if (target.dataset.sanitize === 'html') {
      target.value = sanitizeHTML(target.value);
    }
  });

  // Sanitize form submissions
  document.addEventListener('submit', function(e) {
    const form = e.target;
    const inputs = form.querySelectorAll('[data-sanitize]');
    inputs.forEach(function(input) {
      if (input.dataset.sanitize === 'html') {
        input.value = sanitizeHTML(input.value);
      } else if (input.dataset.sanitize === 'text') {
        input.value = escapeHTML(input.value);
      }
    });
  });

  // Expose to global scope for manual sanitization
  window.XSSProtection = {
    sanitizeHTML: sanitizeHTML,
    escapeHTML: escapeHTML
  };
})();

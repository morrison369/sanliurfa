/**
 * Client-side XSS Protection
 * Loaded on all pages for runtime protection
 */

(function() {
  'use strict';

  // Sanitize HTML content
  function sanitizeHTML(dirty) {
    if (!dirty) return '';
    
    const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img'];
    const allowedAttrs = ['href', 'src', 'alt', 'title', 'class'];
    
    const temp = document.createElement('div');
    temp.innerHTML = dirty;
    
    // Remove script tags
    const scripts = temp.getElementsByTagName('script');
    while (scripts.length > 0) {
      scripts[0].parentNode.removeChild(scripts[0]);
    }
    
    // Sanitize remaining elements
    const allElements = temp.getElementsByTagName('*');
    for (let i = allElements.length - 1; i >= 0; i--) {
      const el = allElements[i];
      
      // Remove disallowed tags
      if (!allowedTags.includes(el.tagName.toLowerCase())) {
        const parent = el.parentNode;
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
        continue;
      }
      
      // Sanitize attributes
      for (let j = el.attributes.length - 1; j >= 0; j--) {
        const attr = el.attributes[j];
        if (!allowedAttrs.includes(attr.name.toLowerCase())) {
          el.removeAttribute(attr.name);
        }
        // Remove javascript: URLs
        if (attr.name.toLowerCase() === 'href' && attr.value.toLowerCase().startsWith('javascript:')) {
          el.removeAttribute(attr.name);
        }
      }
    }
    
    return temp.innerHTML;
  }

  // Escape HTML entities
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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

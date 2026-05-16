import { describe, expect, it } from 'vitest';
import {
  countInternalLinks,
  getInternalLinkSuggestions,
  linkifyContent,
} from '../seo/internal-linker';

describe('internal backlinking system', () => {
  it('links curated Turkish entities without linking protected zones', () => {
    const html = [
      '<p>Göbeklitepe ve Balıklıgöl Şanlıurfa gezi rehberi için önemlidir.</p>',
      '<a href="/x">Göbeklitepe</a>',
      '<code>Balıklıgöl</code>',
    ].join('');

    const linked = linkifyContent(html, '/blog/test');

    expect(linked).toContain('href="/tarihi-yerler/gobeklitepe"');
    expect(linked).toContain('href="/gezilecek-yerler/balikligol"');
    expect(linked).toContain('<a href="/x">Göbeklitepe</a>');
    expect(linked).toContain('<code>Balıklıgöl</code>');
    expect(countInternalLinks(linked)).toBe(4);
  });

  it('does not create self links and respects total link cap', () => {
    const linked = linkifyContent('Göbeklitepe Balıklıgöl Harran Halfeti Rumkale', {
      selfUrl: '/tarihi-yerler/gobeklitepe',
      maxTotalLinks: 2,
    });

    expect(linked).not.toContain('href="/tarihi-yerler/gobeklitepe"');
    expect(countInternalLinks(linked)).toBe(2);
  });

  it('returns scored contextual suggestions for sidebar backlinks', () => {
    const suggestions = getInternalLinkSuggestions({
      text: 'Urfa kebabı, çiğ köfte, sıra gecesi ve Balıklıgöl hakkında gezi notları.',
      category: 'Gastronomi',
      tags: ['Şanlıurfa yemek tarifleri'],
      limit: 8,
    });

    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    expect(suggestions.map((item) => item.href)).toContain('/yemek-tarifleri/urfa-kebabi');
    expect(suggestions.map((item) => item.href)).toContain('/yemek-tarifleri/sanliurfa-cig-koftesi');
    expect(suggestions.every((item) => item.href.startsWith('/'))).toBe(true);
  });
});

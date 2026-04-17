import { describe, expect, it } from 'vitest';

import { normalizeAdminManagerTab, renderAdminManager } from '../admin-manager';

describe('admin manager helpers', () => {
  it('normalizes invalid tabs to places', () => {
    expect(normalizeAdminManagerTab('reviews')).toBe('reviews');
    expect(normalizeAdminManagerTab('users')).toBe('users');
    expect(normalizeAdminManagerTab('invalid')).toBe('places');
  });

  it('renders users tab content', () => {
    const html = renderAdminManager('users');

    expect(html).toContain('Yönetim Paneli');
    expect(html).toContain('Kullanıcı ara...');
    expect(html).toContain('E-posta');
  });
});

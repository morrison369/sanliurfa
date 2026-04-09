import { describe, expect, it } from 'vitest';
import { isAdminRole, requireAdminRedirectPath } from '../admin-guard';

describe('admin-guard', () => {
  it('accepts admin and moderator roles', () => {
    expect(isAdminRole({ role: 'admin' })).toBe(true);
    expect(isAdminRole({ role: 'moderator' })).toBe(true);
  });

  it('redirects for non-admin roles', () => {
    expect(requireAdminRedirectPath({ role: 'user' })).toBe('/');
    expect(requireAdminRedirectPath(null)).toBe('/');
  });
});

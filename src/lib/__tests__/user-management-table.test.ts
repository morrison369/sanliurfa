import { describe, expect, it } from 'vitest';
import {
  renderUserManagementTable,
  type AdminUserDetailsPayload,
  type AdminUserListEntry,
} from '../user-management-table';

describe('user-management-table', () => {
  it('renders users and summary', () => {
    const users: AdminUserListEntry[] = [
      {
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'User One',
        role: 'admin',
        created_at: '2026-04-17T00:00:00.000Z',
        updated_at: '2026-04-17T00:00:00.000Z',
        last_login_at: null,
        last_activity_at: null,
        post_count: 0,
        review_count: 3,
        warning_count: 1,
        suspension_count: 0,
        active_flags: 2,
      },
    ];

    const html = renderUserManagementTable({
      users,
      error: null,
      search: 'user',
      summary: 'Gösterilen kullanıcı: 1.',
      details: null,
    });

    expect(html).toContain('User One');
    expect(html).toContain('Gösterilen kullanıcı: 1.');
    expect(html).toContain('2 bayrak');
    expect(html).toContain('Detay');
  });

  it('renders detail modal when details exist', () => {
    const details: AdminUserDetailsPayload = {
      user: {
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'User One',
        role: 'user',
        created_at: '2026-04-17T00:00:00.000Z',
        updated_at: '2026-04-17T00:00:00.000Z',
        last_login_at: null,
        last_activity_at: null,
        post_count: 0,
        review_count: 2,
        comment_count: 1,
        warning_count: 0,
        suspension_count: 0,
        flagged_count: 0,
      },
      activeFlags: [],
      recentModeration: [],
      auditLog: [],
    };

    const html = renderUserManagementTable({
      users: [],
      error: null,
      search: '',
      summary: 'Gösterilen kullanıcı: 0.',
      details,
    });

    expect(html).toContain('Kullanıcı Detayı');
    expect(html).toContain('user@example.com');
    expect(html).toContain('Aktif bayrak yok');
  });
});

import { describe, expect, it } from 'vitest';

import { getAuditSeverityClass, renderAuditLogViewer } from '../audit-log-viewer';

describe('audit log viewer helpers', () => {
  it('resolves severity classes', () => {
    expect(getAuditSeverityClass('delete_user')).toContain('bg-red-100');
    expect(getAuditSeverityClass('create_user')).toContain('bg-green-100');
    expect(getAuditSeverityClass('update_user')).toContain('bg-blue-100');
  });

  it('renders audit viewer content', () => {
    const html = renderAuditLogViewer({
      logs: [
        {
          timestamp: '2026-04-16T00:00:00.000Z',
          endpoint: '/api/admin/users',
          method: 'POST',
          mode: 'write',
          outcome: 'success',
          statusCode: 200,
          actorKey: 'admin-1',
        } as any,
      ],
      error: null,
      summary: 'Görünen kayıt: 1.',
    });

    expect(html).toContain('Audit Logları');
    expect(html).toContain('/api/admin/users');
    expect(html).toContain('Görünen kayıt: 1.');
  });
});

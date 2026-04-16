import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
};

function createElement(dataset: Record<string, string>): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  };
}

function createRoot() {
  const loading = createElement({});
  const content = createElement({});
  const root = createElement({});

  root.querySelector = (selector: string) => {
    if (selector === '[data-audit-log-loading]') return loading;
    if (selector === '[data-audit-log-content]') return content;
    return null;
  };

  content.querySelector = () => null;
  content.querySelectorAll = () => [];

  return { root, loading, content };
}

describe('audit log viewer script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders audit log entries', async () => {
    const { root, loading, content } = createRoot();

    vi.doMock('../../lib/admin-browser-client', () => ({
      fetchAdminAuditLogs: vi.fn().mockResolvedValue({
        logs: [
          {
            timestamp: '2026-04-16T00:00:00.000Z',
            endpoint: '/api/admin/users',
            method: 'POST',
            mode: 'write',
            outcome: 'success',
            statusCode: 200,
            actorKey: 'admin-1',
          },
        ],
        count: 1,
      }),
      buildAdminAuditLogsCsvUrl: vi.fn().mockReturnValue('/api/admin/audit-logs?format=csv'),
    }));

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };
    (globalThis as any).window = { location: { href: '' } };

    const { initAuditLogViewer } = await import('../audit-log-viewer');
    initAuditLogViewer();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('/api/admin/users');
    expect(content.innerHTML).toContain('Audit Logları');
    expect(loading.className).toBe('hidden');
  });
});

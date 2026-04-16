import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/admin-browser-client', () => ({
  buildAdminAccessCoverageReportUrl: (format: 'json' | 'markdown') => `/admin-access-coverage.${format}`,
  fetchAdminAccessCoverageReport: async () => ({
    data: {
      report: {
        coveragePercent: 98,
        driftCount: 1,
        routeFiles: 40,
        wrapperFiles: 39,
        generatedAt: '2026-04-16T10:00:00.000Z',
        driftedFiles: ['src/pages/api/admin/example.ts'],
      },
      artifact: { status: 'blocked' },
      artifactName: 'admin-access-coverage',
      reportFormats: ['json', 'markdown'],
    },
  }),
}));

vi.mock('../../lib/admin-ops-pages', () => ({
  buildCoverageTrend: () => 'coverage-trend',
  buildCoverageDelta: () => 'coverage-delta',
}));

vi.mock('../../lib/admin-access-coverage-page', () => ({
  buildCoverageAlertClass: () => ({
    className: 'alert-class',
    text: 'coverage-alert',
  }),
  buildCoverageSummaryText: () => 'coverage-summary',
  buildCoverageDriftFilesHtml: () => '<li>src/pages/api/admin/example.ts</li>',
}));

type FakeElement = {
  id: string;
  textContent: string;
  className: string;
  innerHTML: string;
  href: string;
  listeners: Record<string, Array<() => void>>;
  classList: { add: (...tokens: string[]) => void };
  addEventListener: (event: string, handler: () => void) => void;
};

function createFakeElement(id: string): FakeElement {
  const element: FakeElement = {
    id,
    textContent: '',
    className: '',
    innerHTML: '',
    href: '',
    listeners: {},
    classList: {
      add: (...tokens: string[]) => {
        const unique = new Set((element.className ? element.className.split(' ') : []).filter(Boolean));
        for (const token of tokens) unique.add(token);
        element.className = Array.from(unique).join(' ');
      },
    },
    addEventListener(event: string, handler: () => void) {
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
  };
  return element;
}

function setupFakeDom(ids: string[]) {
  const elements = new Map<string, FakeElement>();
  for (const id of ids) {
    elements.set(id, createFakeElement(id));
  }

  const localStorageStore = new Map<string, string>();
  const fakeWindow = {
    localStorage: {
      getItem: (key: string) => localStorageStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        localStorageStore.set(key, value);
      },
      clear: () => localStorageStore.clear(),
    },
    setInterval: vi.fn(() => 1),
  };

  (globalThis as any).document = {
    getElementById: (id: string) => elements.get(id) ?? null,
  };
  (globalThis as any).window = fakeWindow;

  return { elements, fakeWindow };
}

describe('admin access coverage page smoke', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders access coverage report data into fake DOM', async () => {
    const { elements } = setupFakeDom([
      'refresh-admin-access-coverage',
      'admin-access-coverage-summary',
      'admin-access-coverage-status',
      'admin-access-coverage-percent',
      'admin-access-coverage-routes',
      'admin-access-coverage-drift-count',
      'admin-access-coverage-generated-at',
      'admin-access-coverage-artifact',
      'admin-access-coverage-formats',
      'admin-access-coverage-artifact-status',
      'admin-access-coverage-last-refresh',
      'admin-access-coverage-alert',
      'admin-access-coverage-delta',
      'admin-access-coverage-trend',
      'admin-access-drift-files',
      'admin-access-coverage-download-json',
      'admin-access-coverage-download-md',
    ]);

    const { initAdminAccessCoveragePage } = await import('../admin-access-coverage-page');
    initAdminAccessCoveragePage();
    await Promise.resolve();
    await Promise.resolve();

    expect(elements.get('admin-access-coverage-summary')?.textContent).toBe('coverage-summary');
    expect(elements.get('admin-access-coverage-status')?.textContent).toBe('blocked');
    expect(elements.get('admin-access-coverage-percent')?.textContent).toBe('%98');
    expect(elements.get('admin-access-coverage-alert')?.textContent).toBe('coverage-alert');
    expect(elements.get('admin-access-coverage-alert')?.className).toBe('alert-class');
    expect(elements.get('admin-access-coverage-trend')?.textContent).toBe('coverage-trend');
    expect(elements.get('admin-access-coverage-delta')?.textContent).toBe('coverage-delta');
    expect(elements.get('admin-access-drift-files')?.innerHTML).toContain('example.ts');
    expect(elements.get('admin-access-coverage-download-json')?.href).toBe('/admin-access-coverage.json');
    expect(elements.get('admin-access-coverage-download-md')?.href).toBe('/admin-access-coverage.markdown');
  });
});

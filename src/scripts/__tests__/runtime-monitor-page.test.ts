import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/runtime-monitor', () => ({
  runtimeMonitorBadgeStyles: {
    healthy: 'healthy-class',
    degraded: 'degraded-class',
    blocked: 'blocked-class',
  },
  buildRuntimeMonitorSummaryTone: (status: string) => `tone-${status}`,
  applyRuntimeMonitorCoverageLinks: () => ({
    json: '/coverage.json',
    markdown: '/coverage.md',
  }),
  buildRuntimeMonitorEndpoints: () => [
    {
      key: 'health',
      outputId: 'health-output',
      badgeId: 'health-badge',
      load: async () => ({ data: { status: 'healthy' } }),
      pickStatus: () => 'healthy',
    },
    {
      key: 'admin-access-coverage',
      outputId: 'admin-access-coverage-output',
      badgeId: 'admin-access-coverage-badge',
      summaryId: 'admin-access-coverage-summary',
      load: async () => ({ data: { artifact: { status: 'degraded' } } }),
      pickStatus: () => 'degraded',
      summarize: () => 'Coverage %97 • Drift 1 • İlk dosya: src/pages/api/admin/example.ts',
    },
  ],
}));

vi.mock('../../lib/admin-ops-pages', () => ({
  buildRuntimeTrend: () => 'trend-line',
  buildRuntimeDelta: () => 'delta-line',
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
    const element = createFakeElement(id);
    elements.set(id, element);
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

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('runtime monitor page smoke', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders runtime monitor summaries and links', async () => {
    const { elements } = setupFakeDom([
      'refresh-runtime-monitor',
      'runtime-monitor-status',
      'runtime-monitor-trend',
      'runtime-monitor-last-refresh',
      'runtime-monitor-delta',
      'health-output',
      'health-badge',
      'admin-access-coverage-output',
      'admin-access-coverage-badge',
      'admin-access-coverage-summary',
      'runtime-admin-access-coverage-download-json',
      'runtime-admin-access-coverage-download-md',
    ]);

    const { initRuntimeMonitorPage } = await import('../runtime-monitor-page');
    initRuntimeMonitorPage();
    await flushAsyncWork();

    expect(elements.get('runtime-monitor-status')?.textContent).toContain('Genel durum');
    expect(elements.get('runtime-monitor-trend')?.textContent).toBe('trend-line');
    expect(elements.get('runtime-monitor-delta')?.textContent).toBe('delta-line');
    expect(elements.get('health-badge')?.textContent).toBe('healthy');
    expect(elements.get('admin-access-coverage-badge')?.textContent).toBe('degraded');
    expect(elements.get('admin-access-coverage-summary')?.textContent).toContain('Coverage %97');
    expect(elements.get('runtime-admin-access-coverage-download-json')?.href).toBe('/coverage.json');
    expect(elements.get('runtime-admin-access-coverage-download-md')?.href).toBe('/coverage.md');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAdminDashboardOverviewMock = vi.fn();

vi.mock('../../lib/admin-browser-client', () => ({
  fetchAdminDashboardOverview: fetchAdminDashboardOverviewMock,
}));

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
  click?: () => void;
};

function createElement(dataset: Record<string, string> = {}): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (_event: string, _handler: () => void) => {},
  };
}

function createRoot() {
  const loading = createElement();
  const content = createElement();
  const root = createElement();
  const buttons = new Map<string, FakeElement>();

  root.querySelector = (selector: string) => {
    if (selector === '[data-admin-dashboard-overview-loading]') return loading;
    if (selector === '[data-admin-dashboard-overview-content]') return content;
    return null;
  };

  content.querySelectorAll = (selector: string) => {
    if (selector !== '[data-admin-dashboard-period]') return [];
    const matches = [...content.innerHTML.matchAll(/data-admin-dashboard-period="(\d+)"/g)].map((match) => match[1]);
    return matches.map((value) => {
      if (buttons.has(value)) return buttons.get(value)!;
      let clickHandler: (() => void) | null = null;
      const button = createElement({ adminDashboardPeriod: value });
      button.addEventListener = (event: string, handler: () => void) => {
        if (event === 'click') clickHandler = handler;
      };
      button.click = () => clickHandler?.();
      buttons.set(value, button);
      return button;
    });
  };

  return { root, loading, content, buttons };
}

describe('admin-dashboard-overview script', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders dashboard overview', async () => {
    const { root, loading, content } = createRoot();
    fetchAdminDashboardOverviewMock.mockResolvedValue({
      success: true,
      data: {
        overview: {
          users: { total: 10, new: 2, active: 8 },
          content: { places: 5, reviews: 20, comments: 4, newReviews: 2 },
          flags: { pending: 3, resolved: 9, total: 12 },
          moderation: { totalActions: 7, warnings: 2, suspensions: 1, bans: 0 },
          period: 30,
        },
        integrations: {
          resend: { configured: true, source: 'env' },
          analytics: { configured: true, source: 'env' },
          summary: { configuredCount: 2, total: 2, fullyConfigured: true },
        },
        statusSummary: {
          integrations: 'healthy',
          regression: 'healthy',
          e2e: 'healthy',
          releaseGate: 'healthy',
          overall: 'healthy',
        },
      },
    });

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initAdminDashboardOverview } = await import('../admin-dashboard-overview');
    initAdminDashboardOverview();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchAdminDashboardOverviewMock).toHaveBeenCalledWith(30);
    expect(content.innerHTML).toContain('Ops Durumu');
    expect(content.innerHTML).toContain('Kullanıcılar');
    expect(loading.className).toBe('hidden');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  value?: string;
  listeners?: Record<string, Array<(event?: any) => void | Promise<void>>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: (event?: any) => void | Promise<void>) => void;
};

function createInteractiveElement(dataset: Record<string, string>, value = ''): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
    value,
    listeners: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(event: string, handler: (event?: any) => void | Promise<void>) {
      this.listeners ??= {};
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
  };
}

function createRoot() {
  let cachedHtml = '';
  let tabButtons: FakeElement[] = [];
  let filterButtons: FakeElement[] = [];
  let openButtons: FakeElement[] = [];
  let statusButtons: FakeElement[] = [];
  let form: FakeElement | null = null;
  let actionType: FakeElement | null = null;
  let actionReason: FakeElement | null = null;
  let closeAction: FakeElement | null = null;

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});

  function hydrate() {
    if (cachedHtml === content.innerHTML) return;
    cachedHtml = content.innerHTML;
    tabButtons = Array.from(content.innerHTML.matchAll(/data-moderation-tab="([^"]+)"/g)).map((m) => createInteractiveElement({ moderationTab: m[1] }));
    filterButtons = Array.from(content.innerHTML.matchAll(/data-moderation-filter="([^"]+)"/g)).map((m) => createInteractiveElement({ moderationFilter: m[1] }));
    openButtons = Array.from(content.innerHTML.matchAll(/data-moderation-open-action="([^"]+)"[^>]*data-moderation-target-user="([^"]*)"/g)).map((m) => createInteractiveElement({ moderationOpenAction: m[1], moderationTargetUser: m[2] }));
    statusButtons = Array.from(content.innerHTML.matchAll(/data-moderation-report-status="([^"]+)"/g)).map((m) => createInteractiveElement({ moderationReportStatus: m[1] }));
    form = content.innerHTML.includes('data-moderation-action-form') ? createInteractiveElement({}) : null;
    actionType = content.innerHTML.includes('data-moderation-action-type') ? createInteractiveElement({}, 'warning') : null;
    actionReason = content.innerHTML.includes('data-moderation-action-reason') ? createInteractiveElement({}, '') : null;
    closeAction = content.innerHTML.includes('data-moderation-close-action') ? createInteractiveElement({}) : null;
  }

  content.querySelectorAll = (selector: string) => {
    hydrate();
    if (selector === '[data-moderation-tab]') return tabButtons;
    if (selector === '[data-moderation-filter]') return filterButtons;
    if (selector === '[data-moderation-open-action]') return openButtons;
    if (selector === '[data-moderation-report-status]') return statusButtons;
    return [];
  };
  content.querySelector = (selector: string) => {
    hydrate();
    if (selector === '[data-moderation-action-form]') return form;
    if (selector === '[data-moderation-action-type]') return actionType;
    if (selector === '[data-moderation-action-reason]') return actionReason;
    if (selector === '[data-moderation-close-action]') return closeAction;
    return null;
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-moderation-dashboard-loading]') return loading;
    if (selector === '[data-moderation-dashboard-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('moderation dashboard script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders reports and handles action flow', async () => {
    const { root, loading, content } = createRoot();
    const fetchAdminModerationStats = vi.fn().mockResolvedValue({
      stats: {
        pending_reports: 3,
        in_review_reports: 2,
        resolved_reports: 5,
        active_bans: 1,
        total_warnings: 4,
        queue_items: 2,
      },
    });
    const fetchAdminModerationReports = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            id: 'rep-1',
            content_type: 'review',
            reason: 'Spam',
            description: 'Tekrarlayan icerik',
            status: 'pending',
            created_at: '2026-04-17T00:00:00.000Z',
            reported_user_id: 'user-2',
          },
        ],
      })
      .mockResolvedValue({
        data: [
          {
            id: 'rep-1',
            content_type: 'review',
            reason: 'Spam',
            description: 'Tekrarlayan icerik',
            status: 'pending',
            created_at: '2026-04-17T00:00:00.000Z',
            reported_user_id: 'user-2',
          },
        ],
      });
    const createAdminModerationAction = vi.fn().mockResolvedValue({ success: true });
    const updateAdminModerationReport = vi.fn().mockResolvedValue({ success: true });

    vi.doMock('../../lib/admin-browser-client', () => ({
      fetchAdminModerationStats,
      fetchAdminModerationReports,
      createAdminModerationAction,
      updateAdminModerationReport,
    }));

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initModerationDashboard } = await import('../moderation-dashboard');
    initModerationDashboard();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loading.className).toBe('hidden');

    const reportsTab = content.querySelectorAll('[data-moderation-tab]')[1];
    await reportsTab.listeners?.click?.[0]?.();
    expect(content.innerHTML).toContain('Spam');

    const openAction = content.querySelectorAll('[data-moderation-open-action]')[0];
    await openAction.listeners?.click?.[0]?.();
    expect(content.innerHTML).toContain('Moderasyon Islemi Al');

    const form = content.querySelector('[data-moderation-action-form]');
    await form?.listeners?.submit?.[0]?.({ preventDefault() {} });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(createAdminModerationAction).toHaveBeenCalled();

    const statusButton = content.querySelectorAll('[data-moderation-report-status]')[0];
    await statusButton.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(updateAdminModerationReport).toHaveBeenCalledWith('rep-1', {
      status: 'under_review',
      resolution_note: 'Yonetici tarafindan islendi',
    });
  });
});

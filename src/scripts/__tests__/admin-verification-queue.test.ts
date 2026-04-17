import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  value?: string;
  listeners?: Record<string, Array<() => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>, value?: string): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
    value,
    listeners: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(event: string, handler: () => void) {
      this.listeners ??= {};
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
  };
}

function createRoot() {
  let cachedHtml = '';
  let approveButtons: FakeElement[] = [];
  let toggleRejectButtons: FakeElement[] = [];
  let submitRejectButtons: FakeElement[] = [];
  let cancelRejectButtons: FakeElement[] = [];
  let reasonFields: FakeElement[] = [];

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      approveButtons = Array.from(content.innerHTML.matchAll(/data-admin-verification-approve="([^"]+)"/g)).map(
        (match) => createInteractiveElement({ adminVerificationApprove: match[1] }),
      );
      toggleRejectButtons = Array.from(content.innerHTML.matchAll(/data-admin-verification-toggle-reject="([^"]+)"/g)).map(
        (match) => createInteractiveElement({ adminVerificationToggleReject: match[1] }),
      );
      submitRejectButtons = Array.from(content.innerHTML.matchAll(/data-admin-verification-submit-reject="([^"]+)"/g)).map(
        (match) => createInteractiveElement({ adminVerificationSubmitReject: match[1] }),
      );
      cancelRejectButtons = Array.from(content.innerHTML.matchAll(/data-admin-verification-cancel-reject="([^"]+)"/g)).map(
        (match) => createInteractiveElement({ adminVerificationCancelReject: match[1] }),
      );
      reasonFields = Array.from(content.innerHTML.matchAll(/data-admin-verification-reason="([^"]+)"/g)).map(
        (match) => createInteractiveElement({ adminVerificationReason: match[1] }, ''),
      );
    }

    if (selector === '[data-admin-verification-approve]') return approveButtons;
    if (selector === '[data-admin-verification-toggle-reject]') return toggleRejectButtons;
    if (selector === '[data-admin-verification-submit-reject]') return submitRejectButtons;
    if (selector === '[data-admin-verification-cancel-reject]') return cancelRejectButtons;
    if (selector === '[data-admin-verification-reason]') return reasonFields;
    return [];
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-admin-verification-queue-loading]') return loading;
    if (selector === '[data-admin-verification-queue-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('admin verification queue script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders queue, toggles reject form and approves item', async () => {
    const { root, loading, content } = createRoot();

    const fetchAdminVerifications = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        verifications: [
          {
            id: 'ver-1',
            placeId: 'place-1',
            placeName: 'Göbeklitepe Cafe',
            category: 'Kafe',
            rating: 4.5,
            requestedAt: '2026-04-17T00:00:00.000Z',
            reason: 'Sahiplik doğrulaması gerekli',
          },
        ],
        count: 1,
      })
      .mockResolvedValueOnce({
        success: true,
        verifications: [],
        count: 0,
      });
    const approveAdminVerification = vi.fn().mockResolvedValue({ success: true, message: 'ok' });
    const rejectAdminVerification = vi.fn().mockResolvedValue({ success: true, message: 'ok' });

    vi.doMock('../../lib/admin-browser-client', () => ({
      fetchAdminVerifications,
      approveAdminVerification,
      rejectAdminVerification,
    }));

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initAdminVerificationQueue } = await import('../admin-verification-queue');
    initAdminVerificationQueue();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Göbeklitepe Cafe');
    expect(loading.className).toBe('hidden');

    const rejectToggle = content.querySelectorAll('[data-admin-verification-toggle-reject]')[0];
    rejectToggle.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(content.innerHTML).toContain('Reddetme Nedeni');

    const approveButton = content.querySelectorAll('[data-admin-verification-approve]')[0];
    approveButton.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(approveAdminVerification).toHaveBeenCalledWith('ver-1');
    expect(fetchAdminVerifications).toHaveBeenCalledTimes(2);
    expect(content.innerHTML).toContain('Bekleme listesinde doğrulama talebi yok.');
  });
});

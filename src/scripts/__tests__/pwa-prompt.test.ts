import { beforeEach, describe, expect, it, vi } from 'vitest';

const setupInstallPromptMock = vi.fn();
const isInstalledAppMock = vi.fn();
const requestNotificationPermissionMock = vi.fn();
const subscribeToPushMock = vi.fn();

vi.mock('../../lib/pwa', () => ({
  setupInstallPrompt: setupInstallPromptMock,
  isInstalledApp: isInstalledAppMock,
  requestNotificationPermission: requestNotificationPermissionMock,
  subscribeToPush: subscribeToPushMock,
}));

function createButton() {
  const handlers = new Map<string, () => void | Promise<void>>();

  return {
    handlers,
    addEventListener: (event: string, handler: () => void | Promise<void>) => {
      handlers.set(event, handler);
    },
  };
}

describe('pwa prompt script', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('shows prompt when install prompt is ready and hides after install', async () => {
    const installButton = createButton();
    const dismissButton = createButton();

    const root = {
      dataset: {},
      className: '',
      querySelector: (selector: string) => {
        if (selector === '[data-pwa-prompt-install]') return installButton as any;
        return null;
      },
      querySelectorAll: (selector: string) => {
        if (selector === '[data-pwa-prompt-dismiss]') return [dismissButton] as any;
        return [] as any;
      },
    };

    (globalThis as any).document = {
      querySelector: () => root,
    };

    (globalThis as any).window = {
      setTimeout: vi.fn((callback: () => void) => {
        callback();
        return 1;
      }),
    };

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { vapidKey: 'wrapped-vapid-key' } }),
    });

    isInstalledAppMock.mockReturnValue(false);
    requestNotificationPermissionMock.mockResolvedValue('granted');
    subscribeToPushMock.mockResolvedValue({ endpoint: 'x' });

    let onPromptReady: ((prompt: Event) => void) | undefined;
    setupInstallPromptMock.mockImplementation((ready) => {
      onPromptReady = ready;
    });

    const { initPwaPrompt } = await import('../pwa-prompt');
    initPwaPrompt();

    const promptEvent = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    } as any;

    onPromptReady?.(promptEvent);
    expect(root.className).not.toContain(' hidden ');

    await installButton.handlers.get('click')?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(promptEvent.prompt).toHaveBeenCalledOnce();
    expect(root.className).toContain(' hidden ');
    expect(subscribeToPushMock).toHaveBeenCalledWith('wrapped-vapid-key');

    dismissButton.handlers.get('click')?.();
    expect(root.className).toContain(' hidden ');
  });
});

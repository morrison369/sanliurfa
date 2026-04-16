import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  value?: string;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
  click?: () => void;
};

const fetchAdminUsersMock = vi.fn();
const fetchAdminUserDetailsMock = vi.fn();

vi.mock('../../lib/admin-browser-client', () => ({
  fetchAdminUsers: fetchAdminUsersMock,
  fetchAdminUserDetails: fetchAdminUserDetailsMock,
}));

function createElement(dataset: Record<string, string> = {}): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (_event: string, handler: () => void) => {
      handler;
    },
  };
}

function createRoot() {
  const loading = createElement();
  const content = createElement();
  const detailButton = createElement({ userManagementDetail: 'user-1' });
  let detailHandler: (() => void) | null = null;

  detailButton.addEventListener = (event: string, handler: () => void) => {
    if (event === 'click') {
      detailHandler = handler;
    }
  };
  detailButton.click = () => detailHandler?.();

  const root = createElement();
  root.querySelector = (selector: string) => {
    if (selector === '[data-user-management-loading]') return loading;
    if (selector === '[data-user-management-content]') return content;
    return null;
  };

  content.querySelector = (selector: string) => {
    if (selector === '[data-user-management-detail="user-1"]') {
      return content.innerHTML.includes('data-user-management-detail="user-1"') ? detailButton : null;
    }
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    if (selector === '[data-user-management-detail]') {
      return content.innerHTML.includes('data-user-management-detail="user-1"') ? [detailButton] : [];
    }
    return [];
  };

  return { root, loading, content, detailButton };
}

describe('user-management-table script', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders users after initialization', async () => {
    const { root, loading, content } = createRoot();

    fetchAdminUsersMock.mockResolvedValue({
      success: true,
      data: {
        users: [
          {
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
            warning_count: 0,
            suspension_count: 0,
            active_flags: 0,
          },
        ],
        count: 1,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    });

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };
    (globalThis as any).window = {
      setTimeout,
      clearTimeout,
    };

    const { initUserManagementTable } = await import('../user-management-table');
    initUserManagementTable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchAdminUsersMock).toHaveBeenCalledWith({ search: undefined, limit: 50 });
    expect(content.innerHTML).toContain('User One');
    expect(loading.className).toBe('hidden');
  });

  it('loads user details when detail button is clicked', async () => {
    const { root, content, detailButton } = createRoot();

    fetchAdminUsersMock.mockResolvedValue({
      success: true,
      data: {
        users: [
          {
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
            warning_count: 0,
            suspension_count: 0,
            active_flags: 0,
          },
        ],
        count: 1,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    });
    fetchAdminUserDetailsMock.mockResolvedValue({
      success: true,
      data: {
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
          comment_count: 0,
          warning_count: 0,
          suspension_count: 0,
          flagged_count: 0,
        },
        activeFlags: [],
        recentModeration: [],
        auditLog: [],
      },
    });

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };
    (globalThis as any).window = {
      setTimeout,
      clearTimeout,
    };

    const { initUserManagementTable } = await import('../user-management-table');
    initUserManagementTable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    detailButton.click?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchAdminUserDetailsMock).toHaveBeenCalledWith('user-1');
    expect(content.innerHTML).toContain('Kullanıcı Detayı');
  });
});

import { fetchAdminUserDetails, fetchAdminUsers } from '../lib/admin-browser-client';
import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  renderUserManagementTable,
  type AdminUserDetailsPayload,
  type AdminUserListEntry,
} from '../lib/user-management-table';

type UserManagementRoot = HTMLElement & { dataset: DOMStringMap };

function readUsers(root: UserManagementRoot): AdminUserListEntry[] {
  try {
    return JSON.parse(root.dataset.users ?? '[]') as AdminUserListEntry[];
  } catch {
    return [];
  }
}

function writeUsers(root: UserManagementRoot, users: AdminUserListEntry[]) {
  root.dataset.users = JSON.stringify(users);
}

function readDetails(root: UserManagementRoot): AdminUserDetailsPayload | null {
  try {
    return root.dataset.details
      ? (JSON.parse(root.dataset.details) as AdminUserDetailsPayload)
      : null;
  } catch {
    return null;
  }
}

function writeDetails(root: UserManagementRoot, details: AdminUserDetailsPayload | null) {
  if (details) {
    root.dataset.details = JSON.stringify(details);
    return;
  }

  delete root.dataset.details;
}

function setError(root: UserManagementRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

async function loadUsers(root: UserManagementRoot, search = '') {
  const payload = await fetchAdminUsers({ search: search || undefined, limit: 50 });
  writeUsers(root, payload.data.users ?? []);
  root.dataset.total = String(payload.data.count ?? payload.data.users?.length ?? 0);
  root.dataset.search = search;
  setError(root, null);
}

function buildSummary(root: UserManagementRoot): string {
  const users = readUsers(root);
  const flagged = users.filter((user) => (user.active_flags ?? 0) > 0).length;
  const warned = users.filter((user) => (user.warning_count ?? 0) > 0).length;
  return `Gösterilen kullanıcı: ${users.length}. Aktif bayraklı: ${flagged}. Uyarılı: ${warned}.`;
}

function bindInteractions(root: UserManagementRoot, content: HTMLElement) {
  const searchInput = content.querySelector<HTMLInputElement>('[data-user-management-search]');
  if (searchInput) {
    let timer: number | undefined;
    searchInput.addEventListener('input', () => {
      const nextSearch = searchInput.value.trim();
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        delete root.dataset.users;
        writeDetails(root, null);
        root.dataset.search = nextSearch;
        await renderRoot(root);
      }, 300);
    });
  }

  const refreshButton = content.querySelector<HTMLElement>('[data-user-management-refresh]');
  refreshButton?.addEventListener('click', async () => {
    delete root.dataset.users;
    await renderRoot(root);
  });

  const detailButtons = Array.from(
    content.querySelectorAll<HTMLElement>('[data-user-management-detail]'),
  );
  for (const button of detailButtons) {
    button.addEventListener('click', async () => {
      const id = button.dataset.userManagementDetail;
      if (!id) return;

      try {
        const payload = await fetchAdminUserDetails(id);
        writeDetails(root, payload.data);
        await renderRoot(root);
      } catch (error) {
        setError(root, error instanceof Error ? error.message : 'Kullanıcı detayı alınamadı');
        await renderRoot(root);
      }
    });
  }

  const closeButton = content.querySelector<HTMLElement>('[data-user-management-close]');
  closeButton?.addEventListener('click', async () => {
    writeDetails(root, null);
    await renderRoot(root);
  });
}

async function renderRoot(root: UserManagementRoot) {
  const loading = root.querySelector<HTMLElement>('[data-user-management-loading]');
  const content = root.querySelector<HTMLElement>('[data-user-management-content]');
  if (!loading || !content) return;

  try {
    if (!root.dataset.users) {
      await loadUsers(root, root.dataset.search ?? '');
    }

    setElementHtml(
      content,
      renderUserManagementTable({
        users: readUsers(root),
        error: root.dataset.error || null,
        search: root.dataset.search ?? '',
        summary: buildSummary(root),
        details: readDetails(root),
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Kullanıcılar alınamadı');
    setElementHtml(
      content,
      renderUserManagementTable({
        users: [],
        error: root.dataset.error || 'Kullanıcılar alınamadı',
        search: root.dataset.search ?? '',
        summary: 'Gösterilen kullanıcı: 0. Aktif bayraklı: 0. Uyarılı: 0.',
        details: null,
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initUserManagementTable() {
  const roots = Array.from(
    document.querySelectorAll<UserManagementRoot>('[data-user-management-table]'),
  );

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void renderRoot(root);
  }
}

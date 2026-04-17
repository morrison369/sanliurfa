import type { AdminUserDetailsData, AdminUsersListData } from '../types/admin-api';

export type AdminUserListEntry = AdminUsersListData['data']['users'][number];
export type AdminUserDetailsPayload = AdminUserDetailsData['data'];

function getRoleBadgeClass(role: string): string {
  if (role === 'admin') {
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
  }

  if (role === 'moderator') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  }

  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
}

function renderError(message: string | null): string {
  if (!message) return '';

  return `
    <div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
      ${message}
    </div>
  `;
}

function renderDetailModal(details: AdminUserDetailsPayload | null): string {
  if (!details?.user) {
    return '';
  }

  const activeFlags = details.activeFlags ?? [];
  const recentModeration = details.recentModeration ?? [];
  const auditLog = details.auditLog ?? [];

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-user-management-modal>
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Kullanıcı ayrıntısı</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">${details.user.full_name || 'Adı yok'} · ${details.user.email}</p>
          </div>
          <button
            type="button"
            data-user-management-close
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Kapat
          </button>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Profil</h4>
            <dl class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div class="flex justify-between gap-4"><dt>Rol</dt><dd>${details.user.role || '-'}</dd></div>
              <div class="flex justify-between gap-4"><dt>İnceleme</dt><dd>${details.user.review_count ?? 0}</dd></div>
              <div class="flex justify-between gap-4"><dt>Yorum</dt><dd>${details.user.comment_count ?? 0}</dd></div>
              <div class="flex justify-between gap-4"><dt>Uyarı</dt><dd>${details.user.warning_count ?? 0}</dd></div>
              <div class="flex justify-between gap-4"><dt>Askıya alma</dt><dd>${details.user.suspension_count ?? 0}</dd></div>
            </dl>
          </div>

          <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Aktif bayraklar</h4>
            ${
              activeFlags.length === 0
                ? '<p class="text-sm text-gray-500 dark:text-gray-400">Aktif bayrak yok</p>'
                : `<ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">${activeFlags
                    .map(
                      (flag) => `
                        <li class="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                          <div class="font-medium">${String(flag.flag_type ?? 'bayrak')}</div>
                          <div class="text-xs text-gray-600 dark:text-gray-400">${String(flag.reason ?? '')}</div>
                        </li>
                      `,
                    )
                    .join('')}</ul>`
            }
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Son moderasyon</h4>
            ${
              recentModeration.length === 0
                ? '<p class="text-sm text-gray-500 dark:text-gray-400">Moderasyon kaydı yok</p>'
                : `<ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">${recentModeration
                    .slice(0, 5)
                    .map(
                      (item) => `
                        <li class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/60">
                          <div class="font-medium">${String(item.action_type ?? 'işlem')}</div>
                          <div class="text-xs text-gray-600 dark:text-gray-400">${new Date(String(item.created_at ?? '')).toLocaleString('tr-TR')}</div>
                        </li>
                      `,
                    )
                    .join('')}</ul>`
            }
          </div>

          <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Denetim kayıtları</h4>
            ${
              auditLog.length === 0
                ? '<p class="text-sm text-gray-500 dark:text-gray-400">Denetim kaydı yok</p>'
                : `<ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">${auditLog
                    .slice(0, 5)
                    .map(
                      (item) => `
                        <li class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/60">
                          <div class="font-medium">${String(item.action_type ?? 'aksiyon')}</div>
                          <div class="text-xs text-gray-600 dark:text-gray-400">${new Date(String(item.created_at ?? '')).toLocaleString('tr-TR')}</div>
                        </li>
                      `,
                    )
                    .join('')}</ul>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRows(users: AdminUserListEntry[]): string {
  if (users.length === 0) {
    return `
      <tr>
        <td colspan="5" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Kullanıcı kaydı bulunamadı.
        </td>
      </tr>
    `;
  }

  return users
    .map(
      (user) => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40">
          <td class="px-4 py-3">
            <div class="font-medium text-gray-900 dark:text-white">${user.full_name || 'Adı yok'}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">${user.email}</div>
          </td>
          <td class="px-4 py-3">
            <span class="rounded-full px-2 py-1 text-xs font-medium ${getRoleBadgeClass(user.role || 'user')}">
              ${user.role === 'admin' ? 'Yönetici' : user.role === 'moderator' ? 'Moderatör' : 'Kullanıcı'}
            </span>
          </td>
          <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">${user.review_count ?? 0} inceleme</td>
          <td class="px-4 py-3">
            <div class="flex flex-wrap items-center gap-2">
              ${
                (user.active_flags ?? 0) > 0
                  ? `<span class="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">${user.active_flags ?? 0} bayrak</span>`
                  : ''
              }
              ${
                (user.warning_count ?? 0) > 0
                  ? `<span class="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">${user.warning_count ?? 0} uyarı</span>`
                  : '<span class="text-xs text-gray-400 dark:text-gray-500">Sorun yok</span>'
              }
            </div>
          </td>
          <td class="px-4 py-3">
            <button
              type="button"
              data-user-management-detail="${user.id}"
              class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Ayrıntıları gör
            </button>
          </td>
        </tr>
      `,
    )
    .join('');
}

export function renderUserManagementTable(options: {
  users: AdminUserListEntry[];
  error: string | null;
  search: string;
  summary: string;
  details: AdminUserDetailsPayload | null;
}): string {
  return `
    ${renderError(options.error)}

    <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="relative w-full md:max-w-md">
        <input
          type="text"
          value="${options.search}"
          data-user-management-search
          placeholder="E-posta ya da ad ile ara..."
          class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>
      <button
        type="button"
        data-user-management-refresh
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        Listeyi yenile
      </button>
    </div>

    <div class="mb-4 text-sm text-gray-500 dark:text-gray-400">${options.summary}</div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Kullanıcı</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Rol</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">İçerik</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Durum</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">İşlem</th>
          </tr>
        </thead>
        <tbody>
          ${renderRows(options.users)}
        </tbody>
      </table>
    </div>

    ${renderDetailModal(options.details)}
  `;
}

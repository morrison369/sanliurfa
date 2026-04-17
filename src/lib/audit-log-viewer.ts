import type { AdminAuditLogsData } from '../types/admin-api';

export type AuditLogEntry = AdminAuditLogsData['logs'][number];

export function getAuditSeverityClass(action: string): string {
  const normalized = action.toLowerCase();
  if (normalized.includes('delete') || normalized.includes('remove')) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
  if (normalized.includes('create') || normalized.includes('add')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  }
  if (normalized.includes('update') || normalized.includes('edit')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
}

function renderFilters(): string {
  return `
    <div class="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Uç nokta</label>
          <input
            data-audit-log-filter="endpoint"
            type="text"
            placeholder="/api/admin/..."
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Aktör</label>
          <input
            data-audit-log-filter="actor"
            type="text"
            placeholder="admin veya user id"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">İşlem Tipi</label>
          <select
            data-audit-log-filter="mode"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Tümü</option>
            <option value="read">Okuma</option>
            <option value="write">Yazma</option>
          </select>
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Sonuç</label>
          <select
            data-audit-log-filter="outcome"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Tümü</option>
            <option value="success">Başarılı</option>
            <option value="denied">Reddedildi</option>
            <option value="rate_limited">Hız sınırına takıldı</option>
          </select>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-audit-log-refresh
          class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Yenile
        </button>
        <button
          type="button"
          data-audit-log-export
          class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          CSV İndir
        </button>
      </div>
    </div>
  `;
}

function renderRows(entries: AuditLogEntry[]): string {
  if (entries.length === 0) {
    return `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-gray-600 dark:text-gray-400">Kayıt bulunamadı</td>
      </tr>
    `;
  }

  return entries
    .map((entry) => {
      const normalized = entry as Record<string, unknown>;
      const action = String(normalized.method ?? '');
      return `
        <tr class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
          <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">${new Date(
            String(normalized.timestamp ?? ''),
          ).toLocaleString('tr-TR')}</td>
          <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">${String(
            normalized.endpoint ?? '',
          )}</td>
          <td class="px-6 py-4 text-sm"><span class="rounded-full px-3 py-1 text-xs font-semibold ${getAuditSeverityClass(
            action,
          )}">${action}</span></td>
          <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">${String(
            normalized.mode ?? '',
          )}</td>
          <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">${String(
            normalized.outcome ?? '',
          )}</td>
          <td class="px-6 py-4 text-sm font-mono text-gray-900 dark:text-gray-100">${String(
            normalized.actorKey ?? '',
          )}</td>
          <td class="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">${String(
            normalized.statusCode ?? '',
          )}</td>
        </tr>
      `;
    })
    .join('');
}

function renderTable(entries: AuditLogEntry[], summary: string): string {
  return `
    <div class="rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
      <div class="border-b border-gray-200 px-6 py-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
        ${summary}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="border-b border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th class="px-6 py-3">Tarih/Saat</th>
              <th class="px-6 py-3">Uç nokta</th>
              <th class="px-6 py-3">İşlem</th>
              <th class="px-6 py-3">Mod</th>
              <th class="px-6 py-3">Sonuç</th>
              <th class="px-6 py-3">Aktör</th>
              <th class="px-6 py-3">Durum</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            ${renderRows(entries)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderAuditLogViewer(options: {
  logs: AuditLogEntry[];
  error: string | null;
  summary: string;
}): string {
  return `
    <div class="container-custom py-8">
      <div class="mb-8">
        <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Denetim kayıtları</h1>
        <p class="text-gray-600 dark:text-gray-400">Sistem etkinliğini ve değişiklikleri izleyin</p>
      </div>
      ${renderFilters()}
      ${options.error ? `<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">${options.error}</div>` : ''}
      ${renderTable(options.logs, options.summary)}
    </div>
  `;
}

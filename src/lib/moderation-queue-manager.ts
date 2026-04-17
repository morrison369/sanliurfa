import type { AdminModerationQueueListData, AdminModerationQueueMutationData } from '../types/admin-api';

type QueueItem = AdminModerationQueueListData['data']['items'][number];

export type ModerationQueueStatus = 'pending' | 'in_review' | 'resolved';

export function normalizeModerationQueueStatus(value: string | null | undefined): ModerationQueueStatus {
  return value === 'in_review' || value === 'resolved' ? value : 'pending';
}

export function getModerationQueueItems(payload: AdminModerationQueueListData | null | undefined): QueueItem[] {
  return payload?.success ? payload.data.items || [] : [];
}

export function isModerationMutationSuccessful(
  payload: AdminModerationQueueMutationData | null | undefined,
): boolean {
  return Boolean(payload?.success);
}

function renderStatusButton(status: ModerationQueueStatus, activeStatus: ModerationQueueStatus) {
  const label =
    status === 'pending' ? 'Beklemede' : status === 'in_review' ? 'İncelemede' : 'Çözüldü';
  const classes =
    activeStatus === status
      ? 'bg-blue-600 text-white'
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300';

  return `<button type="button" data-moderation-queue-status="${status}" class="rounded-lg px-4 py-2 text-sm font-medium transition-colors ${classes}">${label}</button>`;
}

function renderQueueItem(item: QueueItem, status: ModerationQueueStatus, actionInProgress: string | null): string {
  const priorityClass =
    item.priority === 'high'
      ? 'bg-red-100 text-red-700'
      : item.priority === 'medium'
        ? 'bg-orange-100 text-orange-700'
        : 'bg-gray-100 text-gray-700';
  const priorityLabel =
    item.priority === 'high' ? 'Yüksek' : item.priority === 'medium' ? 'Orta' : 'Düşük';
  const busy = actionInProgress === item.id;

  return `
    <div class="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4">
      <div class="flex-1">
        <div class="mb-2 flex items-center gap-2">
          <span class="text-sm font-medium text-gray-900">${item.queue_type}</span>
          <span class="rounded-full px-2 py-1 text-xs font-medium ${priorityClass}">${priorityLabel}</span>
        </div>
        <p class="mb-1 text-sm text-gray-600">${item.reason}</p>
        <div class="flex items-center gap-4 text-xs text-gray-500">
          <span>${item.submitted_count} bildirim</span>
          <span>${new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
        </div>
      </div>
      ${
        status === 'pending'
          ? `<div class="flex items-center gap-2">
              <button type="button" data-moderation-queue-assign="${item.id}" ${
                busy ? 'disabled' : ''
              } class="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50">${
                busy ? 'İşleniyor...' : 'Ata'
              }</button>
              <button type="button" data-moderation-queue-resolve="${item.id}" ${
                busy ? 'disabled' : ''
              } class="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50">${
                busy ? 'İşleniyor...' : 'Çöz'
              }</button>
            </div>`
          : ''
      }
    </div>
  `;
}

export function renderModerationQueueManager(options: {
  status: ModerationQueueStatus;
  items: QueueItem[];
  error: string | null;
  actionInProgress: string | null;
}): string {
  return `
    <div class="space-y-4">
      ${
        options.error
          ? `<div class="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <div>
                <h3 class="font-medium text-red-900">Hata</h3>
                <p class="text-sm text-red-700">${options.error}</p>
              </div>
            </div>`
          : ''
      }

      <div class="flex gap-2">
        ${(['pending', 'in_review', 'resolved'] as const)
          .map((status) => renderStatusButton(status, options.status))
          .join('')}
      </div>

      <div class="space-y-2">
        ${
          options.items.length === 0
            ? '<div class="py-8 text-center text-gray-500">Kuyruk boş</div>'
            : options.items
                .map((item) => renderQueueItem(item, options.status, options.actionInProgress))
                .join('')
        }
      </div>
    </div>
  `;
}

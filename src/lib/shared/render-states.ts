import { UI_COPY_TR } from './ui-copy';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderLoadingState(
  message = UI_COPY_TR.common.processing,
  className = 'py-8 text-center text-gray-500',
): string {
  return `<div class="${className}">${escapeHtml(message)}</div>`;
}

export function renderEmptyState(
  message: string,
  className = 'py-12 text-center text-gray-500',
): string {
  return `<div class="${className}">${escapeHtml(message)}</div>`;
}

export function renderErrorState(
  message: string,
  title = 'İşlem hatası',
): string {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <h3 class="font-medium text-red-900">${escapeHtml(title)}</h3>
      <p class="text-sm text-red-700">${escapeHtml(message)}</p>
    </div>
  `;
}

export function renderStatusBadge(
  label: string,
  tone: 'neutral' | 'success' | 'warning' | 'danger' = 'neutral',
): string {
  const classMap = {
    neutral: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
  } as const;

  return `<span class="rounded px-2 py-1 text-xs ${classMap[tone]}">${escapeHtml(label)}</span>`;
}

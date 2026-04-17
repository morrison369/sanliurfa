import { formatAdminDateTime } from './admin-format';

export interface ManagedWebhook {
  id: string;
  event: string;
  url: string;
  active: boolean;
  createdAt: string;
  lastTriggeredAt: string | null;
}

export interface WebhookManagerState {
  webhooks: ManagedWebhook[];
  loading: boolean;
  error: string | null;
  showForm: boolean;
  form: {
    event: string;
    url: string;
    secret: string;
  };
}

const EVENT_OPTIONS = [
  'place.created',
  'place.updated',
  'place.deleted',
  'review.created',
  'review.deleted',
  'user.registered',
  'user.blocked',
  'message.sent',
] as const;

function formatWebhookEventLabel(event: string): string {
  const labels: Record<string, string> = {
    'place.created': 'Mekan oluşturuldu',
    'place.updated': 'Mekan güncellendi',
    'place.deleted': 'Mekan silindi',
    'review.created': 'Değerlendirme oluşturuldu',
    'review.deleted': 'Değerlendirme silindi',
    'user.registered': 'Kullanıcı kaydoldu',
    'user.blocked': 'Kullanıcı engellendi',
    'message.sent': 'Mesaj gönderildi',
  };

  return labels[event] ?? event;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function createWebhookManagerState(): WebhookManagerState {
  return {
    webhooks: [],
    loading: true,
    error: null,
    showForm: false,
    form: {
      event: '',
      url: '',
      secret: '',
    },
  };
}

export function extractWebhookManagerData(payload: unknown): ManagedWebhook[] {
  const root = asRecord(payload);
  const list = asArray<Record<string, unknown>>(root?.data);

  return list.map((item) => ({
    id: asString(item.id),
    event: asString(item.event),
    url: asString(item.url),
    active: asBoolean(item.active),
    createdAt: asString(item.created_at || item.createdAt),
    lastTriggeredAt: asString(item.last_triggered_at || item.lastTriggeredAt) || null,
  })).filter((item) => item.id);
}

export function renderWebhookManager(state: WebhookManagerState): string {
  if (state.loading) {
    return '<div class="flex items-center justify-center py-12 text-sm text-slate-500">Webhook yönetimi yükleniyor...</div>';
  }

  const errorHtml = state.error
    ? `<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">${escapeHtml(state.error)}</div>`
    : '';

  const formHtml = state.showForm
    ? `
      <form data-webhook-form class="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700">Olay türü</label>
          <select data-webhook-event class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
            <option value="">Seçin...</option>
            ${EVENT_OPTIONS.map((event) => `<option value="${event}" ${state.form.event === event ? 'selected' : ''}>${formatWebhookEventLabel(event)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700">URL</label>
          <input data-webhook-url type="url" value="${escapeHtml(state.form.url)}" placeholder="https://ornek.com/webhook" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700">Gizli anahtar</label>
          <input data-webhook-secret type="password" value="${escapeHtml(state.form.secret)}" placeholder="İsteğe bağlı imza anahtarı" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        </div>
        <div class="flex gap-3">
          <button type="submit" class="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700">Webhook oluştur</button>
          <button type="button" data-webhook-cancel class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white">İptal et</button>
        </div>
      </form>
    `
    : '';

  const listHtml = state.webhooks.length
    ? state.webhooks.map((webhook) => `
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <h3 class="text-base font-semibold text-slate-900">${escapeHtml(formatWebhookEventLabel(webhook.event))}</h3>
              <p class="mt-2 break-all text-sm text-slate-600">${escapeHtml(webhook.url)}</p>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-semibold ${webhook.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}">${webhook.active ? 'Aktif' : 'Pasif'}</span>
          </div>
          <div class="mt-4 grid gap-3 md:grid-cols-2 text-sm text-slate-600">
            <div><span class="font-semibold text-slate-900">Oluşturulma tarihi:</span> ${escapeHtml(formatAdminDateTime(webhook.createdAt, '-'))}</div>
            <div><span class="font-semibold text-slate-900">Son çalıştırma:</span> ${escapeHtml(formatAdminDateTime(webhook.lastTriggeredAt, 'Henüz çalıştırılmadı'))}</div>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" data-webhook-test="${webhook.id}" class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100">Test et</button>
            <button type="button" data-webhook-copy="${webhook.id}" class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Webhook kimliğini kopyala</button>
            <button type="button" data-webhook-delete="${webhook.id}" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100">Kaldır</button>
          </div>
        </article>
      `).join('')
    : '<div class="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Henüz gösterilecek webhook bulunmuyor.</div>';

  return `
    <div class="space-y-6">
      ${errorHtml}
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Webhook yönetimi</h2>
          <p class="mt-1 text-sm text-slate-600">Gerçek zamanlı entegrasyon bağlantılarını buradan yönetin.</p>
        </div>
        <button type="button" data-webhook-toggle class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">${state.showForm ? 'Formu kapat' : 'Yeni webhook'}</button>
      </div>
      ${formHtml}
      <div class="space-y-4">${listHtml}</div>
    </div>
  `;
}

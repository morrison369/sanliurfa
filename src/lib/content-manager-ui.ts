export interface ContentManagerItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  visibility: string;
  view_count: number;
  like_count: number;
  published_at?: string;
  created_at: string;
}

export interface ContentManagerFormData {
  title: string;
  description: string;
  content: string;
  category: string;
  content_type: string;
}

export interface ContentManagerState {
  items: ContentManagerItem[];
  loading: boolean;
  showForm: boolean;
  saving: boolean;
  error: string | null;
  form: ContentManagerFormData;
}

export const defaultContentManagerForm = (): ContentManagerFormData => ({
  title: '',
  description: '',
  content: '',
  category: '',
  content_type: 'article',
});

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    const nestedData = 'data' in outerData ? (outerData as { data?: unknown }).data : undefined;
    if (Array.isArray(nestedData)) {
      return { data: nestedData };
    }
    if (nestedData && typeof nestedData === 'object') {
      return nestedData as Record<string, unknown>;
    }
    return outerData as Record<string, unknown>;
  }

  return payload as Record<string, unknown>;
}

export function extractContentManagerItems(payload: unknown): ContentManagerItem[] {
  const data = resolveEnvelopeData(payload);
  const items = Array.isArray(data.data)
    ? data.data
    : Array.isArray(data.items)
      ? data.items
      : [];

  return items as ContentManagerItem[];
}

export function extractContentManagerMessage(payload: unknown, fallback: string): string {
  const data = resolveEnvelopeData(payload);
  if (typeof data.message === 'string' && data.message.trim().length > 0) return data.message;

  if (payload && typeof payload === 'object') {
    const error = 'error' in payload ? (payload as { error?: unknown }).error : undefined;
    if (typeof error === 'string' && error.trim().length > 0) return error;
    if (error && typeof error === 'object') {
      const message = 'message' in error ? (error as { message?: unknown }).message : undefined;
      if (typeof message === 'string' && message.trim().length > 0) return message;
    }
  }

  return fallback;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR');
}

function renderError(message: string): string {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <p class="text-sm text-red-700">${message}</p>
    </div>
  `;
}

function renderCreateForm(state: ContentManagerState): string {
  return `
    <form data-content-manager-form class="rounded-lg bg-white p-6 shadow space-y-4">
      <input data-content-field="title" type="text" placeholder="Başlık" required value="${state.form.title}" class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <textarea data-content-field="description" placeholder="Açıklama" class="h-24 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">${state.form.description}</textarea>
      <textarea data-content-field="content" placeholder="İçerik" required class="h-40 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">${state.form.content}</textarea>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <input data-content-field="category" type="text" placeholder="Kategori" value="${state.form.category}" class="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select data-content-field="content_type" class="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="article" ${state.form.content_type === 'article' ? 'selected' : ''}>Makale</option>
          <option value="guide" ${state.form.content_type === 'guide' ? 'selected' : ''}>Rehber</option>
          <option value="news" ${state.form.content_type === 'news' ? 'selected' : ''}>Haber</option>
          <option value="review" ${state.form.content_type === 'review' ? 'selected' : ''}>İnceleme</option>
        </select>
      </div>
      <div class="flex gap-2">
        <button type="submit" ${state.saving ? 'disabled' : ''} class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          ${state.saving ? 'İşleniyor...' : 'Oluştur'}
        </button>
        <button type="button" data-content-manager-cancel class="rounded-lg bg-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-400">
          İptal
        </button>
      </div>
    </form>
  `;
}

function renderContentItem(item: ContentManagerItem): string {
  return `
    <div class="rounded-lg bg-white p-4 shadow">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="text-lg font-semibold">${item.title}</h3>
          <p class="mt-1 text-sm text-gray-600">${item.description ?? ''}</p>
          <div class="mt-3 flex gap-4 text-sm text-gray-500">
            <span>📅 ${formatDate(item.created_at)}</span>
            <span>👁️ ${item.view_count} görüntüleme</span>
            <span>❤️ ${item.like_count} beğeni</span>
          </div>
          <div class="mt-3 flex gap-2">
            <span class="rounded px-2 py-1 text-xs font-medium ${item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
              ${item.status === 'published' ? 'Yayınlandı' : 'Taslak'}
            </span>
            <span class="rounded px-2 py-1 text-xs font-medium ${item.visibility === 'public' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}">
              ${item.visibility === 'public' ? 'Açık' : 'Özel'}
            </span>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <a href="/content/${item.id}" class="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200">Düzenle</a>
          ${item.status !== 'published' ? `
            <button type="button" data-content-manager-publish="${item.id}" class="rounded bg-green-100 px-3 py-1 text-sm text-green-700 hover:bg-green-200">
              Yayınla
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

export function renderContentManager(state: ContentManagerState): string {
  const list = state.items.length === 0
    ? `
      <div class="py-12 text-center text-gray-500">
        <p class="text-lg">Henüz içerik oluşturulmadı.</p>
      </div>
    `
    : `<div class="space-y-3">${state.items.map(renderContentItem).join('')}</div>`;

  return `
    <div class="space-y-6">
      ${state.error ? renderError(state.error) : ''}
      ${!state.showForm ? `
        <button type="button" data-content-manager-open-form class="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700">
          + Yeni İçerik Oluştur
        </button>
      ` : renderCreateForm(state)}
      ${list}
    </div>
  `;
}

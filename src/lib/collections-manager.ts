export interface ManagedCollection {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  is_public: boolean;
  place_count: number;
  follower_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionsManagerState {
  collections: ManagedCollection[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  form: {
    name: string;
    description: string;
    icon: string;
    is_public: boolean;
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function extractCollections(payload: unknown): ManagedCollection[] {
  if (!payload || typeof payload !== 'object') return [];

  const root = payload as {
    success?: boolean;
    data?: unknown;
  };

  const nested = root.data;
  if (Array.isArray(nested)) return nested as ManagedCollection[];
  if (nested && typeof nested === 'object' && 'data' in nested && Array.isArray((nested as { data?: unknown }).data)) {
    return (nested as { data: ManagedCollection[] }).data;
  }

  return [];
}

export function extractCreatedCollection(payload: unknown): ManagedCollection | null {
  if (!payload || typeof payload !== 'object') return null;

  const root = payload as {
    data?: unknown;
  };

  const nested = root.data;
  if (nested && typeof nested === 'object' && 'id' in nested) {
    return nested as ManagedCollection;
  }
  if (nested && typeof nested === 'object' && 'data' in nested) {
    const inner = (nested as { data?: unknown }).data;
    if (inner && typeof inner === 'object' && 'id' in inner) {
      return inner as ManagedCollection;
    }
  }

  return null;
}

export function extractApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback;
  const root = payload as {
    error?: string | { message?: string };
    message?: string;
  };

  if (typeof root.message === 'string') return root.message;
  if (typeof root.error === 'string') return root.error;
  if (root.error && typeof root.error === 'object' && typeof root.error.message === 'string') {
    return root.error.message;
  }

  return fallback;
}

export function renderCollectionsManager(state: CollectionsManagerState) {
  const error = state.error
    ? `<p class="text-sm text-red-500">${escapeHtml(state.error)}</p>`
    : '';

  const form = `
    <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 class="mb-4 text-2xl font-bold">Yeni koleksiyon oluştur</h2>
      <form data-collections-create-form class="space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-sm font-medium">Adı *</label>
            <input
              type="text"
              name="name"
              value="${escapeHtml(state.form.name)}"
              placeholder="Örn: Favori restoranlar"
              class="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">İkon</label>
            <input
              type="text"
              name="icon"
              value="${escapeHtml(state.form.icon)}"
              placeholder="📍"
              maxlength="2"
              class="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium">Açıklama</label>
          <textarea
            name="description"
            rows="3"
            placeholder="Bu koleksiyon hakkında..."
            class="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
          >${escapeHtml(state.form.description)}</textarea>
        </div>
        <div>
          <label class="flex items-center gap-2">
            <input type="checkbox" name="is_public" ${state.form.is_public ? 'checked' : ''} class="h-4 w-4" />
            <span class="text-sm font-medium">Herkese açık yap</span>
          </label>
          <p class="mt-1 text-xs text-gray-500">Açık koleksiyonlar diğer kullanıcılar tarafından görülebilir ve takip edilebilir.</p>
        </div>
        ${error}
        <button
          type="submit"
          ${state.isCreating ? 'disabled' : ''}
          class="w-full rounded bg-blue-500 py-2 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          ${state.isCreating ? 'Oluşturuluyor...' : 'Koleksiyonu oluştur'}
        </button>
      </form>
    </div>
  `;

  const list = state.isLoading
    ? '<div class="py-12 text-center">Koleksiyonlar yükleniyor...</div>'
    : state.collections.length === 0
      ? '<div class="py-12 text-center text-gray-500">Henüz koleksiyon oluşturmadınız.</div>'
      : `
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          ${state.collections
            .map(
              (collection) => `
                <div class="rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <div class="mb-3 flex items-start justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-3xl">${escapeHtml(collection.icon || '📍')}</span>
                      <div>
                        <h3 class="text-lg font-bold">${escapeHtml(collection.name)}</h3>
                        ${collection.is_public ? '<span class="rounded bg-green-100 px-2 py-1 text-xs text-green-800">🌍 Herkese açık</span>' : ''}
                      </div>
                    </div>
                  </div>

                  ${
                    collection.description
                      ? `<p class="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">${escapeHtml(collection.description)}</p>`
                      : ''
                  }

                  <div class="mb-4 flex gap-4 border-b border-gray-200 pb-4 text-sm text-gray-500 dark:border-gray-700">
                    <span>📍 ${collection.place_count} mekan</span>
                    ${collection.follower_count !== undefined ? `<span>👥 ${collection.follower_count} takipçi</span>` : ''}
                  </div>

                  <div class="flex gap-2">
                    <a
                      href="/koleksiyonlar/${collection.id}"
                      class="flex-1 rounded bg-blue-100 px-3 py-2 text-center text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                    >
                      Görüntüle
                    </a>
                    <button
                      type="button"
                      data-collection-delete="${collection.id}"
                      data-collection-name="${escapeHtml(collection.name)}"
                      class="flex-1 rounded bg-red-100 px-3 py-2 text-center text-sm font-medium text-red-700 transition hover:bg-red-200"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              `
            )
            .join('')}
        </div>
      `;

  return `
    <div class="space-y-8">
      ${form}
      <div>
        <h2 class="mb-4 text-2xl font-bold">Koleksiyonlarım</h2>
        ${list}
      </div>
    </div>
  `;
}

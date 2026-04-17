export interface CollectionItem {
  id: string;
  place_id: string;
  place_name: string;
  place_image?: string;
  place_category?: string;
  place_rating?: number;
  note?: string;
  position: number;
  added_at: string;
}

export interface CollectionData {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  is_public: boolean;
  place_count: number;
  follower_count?: number;
  created_at: string;
  updated_at: string;
}

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    return outerData as Record<string, unknown>;
  }

  return payload as Record<string, unknown>;
}

export function extractCollectionDetail(payload: unknown): { collection: CollectionData; items: CollectionItem[] } | null {
  const data = resolveEnvelopeData(payload);
  const nested = data.data;
  const source = nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : data;

  const collection = source.collection;
  const items = source.items;

  if (!collection || typeof collection !== 'object' || !Array.isArray(items)) {
    return null;
  }

  return {
    collection: collection as CollectionData,
    items: items as CollectionItem[],
  };
}

export function extractCollectionMessage(payload: unknown, fallback: string): string {
  const data = resolveEnvelopeData(payload);

  if (typeof data.message === 'string' && data.message.trim().length > 0) {
    return data.message;
  }

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

function renderCollectionHeader(collection: CollectionData, options: { canFollow: boolean; isFollowing: boolean; isFollowingLoading: boolean; isOwner: boolean }): string {
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="mb-3 flex items-center gap-3">
            <span class="text-5xl">${collection.icon || '📚'}</span>
            <div>
              <h1 class="text-3xl font-bold">${collection.name}</h1>
              ${collection.is_public ? '<span class="inline-block rounded bg-green-100 px-2 py-1 text-sm text-green-800">🌍 Herkese açık</span>' : ''}
            </div>
          </div>

          ${collection.description ? `<p class="mb-4 text-gray-600 dark:text-gray-400">${collection.description}</p>` : ''}

          <div class="flex gap-6 text-sm text-gray-500">
            <span>📍 ${collection.place_count} mekan</span>
            <span>👥 ${collection.follower_count || 0} takipçi</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          ${
            options.canFollow
              ? `<button
                  type="button"
                  data-collection-follow
                  ${options.isFollowingLoading ? 'disabled' : ''}
                  class="whitespace-nowrap rounded px-4 py-2 font-medium text-white ${options.isFollowing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-500 hover:bg-blue-600'} disabled:opacity-50"
                >
                  ${options.isFollowingLoading ? 'İşleniyor...' : options.isFollowing ? 'Takipten çık' : 'Takip et'}
                </button>`
              : ''
          }

          ${
            options.isOwner
              ? `<a href="/koleksiyonlar" class="rounded bg-gray-500 px-4 py-2 text-center font-medium text-white hover:bg-gray-600">Düzenle</a>`
              : ''
          }
        </div>
      </div>
    </div>
  `;
}

function renderItemsGrid(items: CollectionItem[], isOwner: boolean): string {
  if (items.length === 0) {
    return '<div class="py-12 text-center text-gray-500">Bu koleksiyona henüz mekan eklenmemiş.</div>';
  }

  return `
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      ${items
        .map(
          (item) => `
            <div class="overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
              ${
                item.place_image
                  ? `<div class="aspect-video overflow-hidden bg-gray-200">
                      <img src="${item.place_image}" alt="${item.place_name}" class="h-full w-full object-cover" />
                    </div>`
                  : ''
              }

              <div class="p-4">
                <a href="/mekan/${item.place_id}" class="mb-2 block text-lg font-bold text-blue-600 hover:text-blue-700">${item.place_name}</a>

                <div class="mb-3 flex gap-3 text-sm text-gray-600 dark:text-gray-400">
                  ${item.place_category ? `<span>📁 ${item.place_category}</span>` : ''}
                  ${typeof item.place_rating === 'number' ? `<span>⭐ ${item.place_rating.toFixed(1)}</span>` : ''}
                </div>

                ${item.note ? `<p class="mb-3 rounded bg-gray-100 p-2 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400">"${item.note}"</p>` : ''}

                <div class="flex gap-2">
                  <a href="/mekan/${item.place_id}" class="flex-1 rounded bg-blue-100 px-3 py-2 text-center text-sm font-medium text-blue-700 transition hover:bg-blue-200">
                    Mekanı gör
                  </a>
                  ${
                    isOwner
                      ? `<button
                          type="button"
                          data-collection-remove-item="${item.place_id}"
                          class="flex-1 rounded bg-red-100 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200"
                        >
                          Kaldır
                        </button>`
                      : ''
                  }
                </div>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

export function renderCollectionDetail(options: {
  collection: CollectionData | null;
  items: CollectionItem[];
  error: string | null;
  currentUserId?: string;
  isFollowing: boolean;
  isFollowingLoading: boolean;
}): string {
  if (options.error) {
    return `<div class="rounded border border-red-300 bg-red-100 px-4 py-3 text-red-700">${options.error}</div>`;
  }

  if (!options.collection) {
    return '<div class="py-12 text-center text-gray-500">Koleksiyon bulunamadı.</div>';
  }

  const isOwner = Boolean(options.currentUserId && options.currentUserId === options.collection.user_id);
  const canFollow = Boolean(options.collection.is_public && options.currentUserId && !isOwner);

  return `
    <div class="space-y-6">
      ${renderCollectionHeader(options.collection, {
        canFollow,
        isFollowing: options.isFollowing,
        isFollowingLoading: options.isFollowingLoading,
        isOwner,
      })}

      <div>
        <h2 class="mb-4 text-2xl font-bold">Mekanlar</h2>
        ${renderItemsGrid(options.items, isOwner)}
      </div>
    </div>
  `;
}

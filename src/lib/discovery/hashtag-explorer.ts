export interface HashtagItem {
  id: string;
  tag_name: string;
  tag_slug: string;
  usage_count: number;
  trending_rank?: number;
  is_trending?: boolean;
}

export interface TaggedPlace {
  id: string;
  name: string;
  slug: string;
  category: string;
  rating_avg: number;
  address: string;
  tagged_at: string;
}

export interface TaggedReview {
  id: string;
  content: string;
  rating: number;
  created_at: string;
  user_name: string;
  username: string;
  place_name: string;
  place_slug: string;
  tagged_at: string;
}

export interface TaggedContent {
  hashtag: {
    id: string;
    tag_name: string;
    tag_slug: string;
    usage_count: number;
    is_trending: boolean;
    trending_rank?: number;
    created_at: string;
  };
  places: TaggedPlace[];
  reviews: TaggedReview[];
  places_count: number;
  reviews_count: number;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function extractHashtags(payload: unknown): HashtagItem[] {
  if (!payload || typeof payload !== 'object') return [];

  const root = payload as {
    data?: {
      data?: unknown;
    };
  };

  const hashtags = root.data?.data ?? [];
  return Array.isArray(hashtags) ? (hashtags as HashtagItem[]) : [];
}

export function extractTaggedContent(payload: unknown): TaggedContent | null {
  if (!payload || typeof payload !== 'object') return null;

  const root = payload as {
    data?: {
      hashtag?: TaggedContent['hashtag'];
      places?: TaggedPlace[];
      reviews?: TaggedReview[];
      places_count?: number;
      reviews_count?: number;
    };
  };

  const data = root.data;
  if (!data?.hashtag) return null;

  return {
    hashtag: data.hashtag,
    places: Array.isArray(data.places) ? data.places : [],
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
    places_count: typeof data.places_count === 'number' ? data.places_count : 0,
    reviews_count: typeof data.reviews_count === 'number' ? data.reviews_count : 0,
  };
}

export interface HashtagExplorerState {
  hashtags: HashtagItem[];
  selectedHashtag: string | null;
  taggedContent: TaggedContent | null;
  isLoadingHashtags: boolean;
  isLoadingContent: boolean;
  error: string | null;
}

function renderHashtagButtons(hashtags: HashtagItem[], selectedHashtag: string | null) {
  if (hashtags.length === 0) return '';

  return `
    <div class="mb-6">
      <h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Trend konular</h3>
      <div class="flex flex-wrap gap-2">
        ${hashtags
          .map(
            (tag) => `
              <button
                type="button"
                data-hashtag-select="${tag.tag_slug}"
                class="rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  selectedHashtag === tag.tag_slug
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                }"
              >
                #${escapeHtml(tag.tag_name)}
                <span class="ml-1 text-xs opacity-75">(${tag.usage_count})</span>
              </button>
            `
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderTaggedContent(content: TaggedContent) {
  if (content.places_count === 0 && content.reviews_count === 0) {
    return '<div class="py-8 text-center text-gray-600 dark:text-gray-400">Henüz gösterilecek içerik bulunmuyor.</div>';
  }

  return `
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      ${
        content.places_count > 0
          ? `
            <div class="space-y-3">
              <h4 class="mb-3 font-semibold text-gray-900 dark:text-white">
                İşaretlenen mekanlar (${content.places_count})
              </h4>
              <div class="space-y-2">
                ${content.places
                  .map(
                    (place) => `
                      <a
                        href="/mekan/${place.slug}"
                        class="block rounded border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div class="text-sm font-semibold text-gray-900 dark:text-white">${escapeHtml(place.name)}</div>
                        <div class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          ${escapeHtml(place.category)} • ⭐ ${Number(place.rating_avg || 0).toFixed(1)}
                        </div>
                      </a>
                    `
                  )
                  .join('')}
              </div>
            </div>
          `
          : ''
      }

      ${
        content.reviews_count > 0
          ? `
            <div class="space-y-3">
              <h4 class="mb-3 font-semibold text-gray-900 dark:text-white">
                İşaretlenen incelemeler (${content.reviews_count})
              </h4>
              <div class="space-y-2">
                ${content.reviews
                  .map(
                    (review) => `
                      <div class="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                        <div class="mb-1 flex items-start justify-between">
                          <div class="text-sm font-semibold text-gray-900 dark:text-white">${escapeHtml(review.user_name)}</div>
                          <div class="text-xs text-yellow-500">★ ${review.rating}</div>
                        </div>
                        <p class="mb-2 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                          ${escapeHtml(review.content)}
                        </p>
                        <a href="/mekan/${review.place_slug}" class="text-xs text-blue-600 hover:underline dark:text-blue-400">
                          ${escapeHtml(review.place_name)}
                        </a>
                      </div>
                    `
                  )
                  .join('')}
              </div>
            </div>
          `
          : ''
      }
    </div>
  `;
}

export function renderHashtagExplorer(state: HashtagExplorerState) {
  if (state.isLoadingHashtags) {
    return `
      <div class="space-y-6">
        <div class="h-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
        <div class="grid grid-cols-2 gap-4">
          <div class="h-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
          <div class="h-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
          <div class="h-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
          <div class="h-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>
    `;
  }

  return `
    <div class="space-y-6">
      ${
        state.error
          ? `<div class="rounded bg-red-50 p-3 text-red-600 dark:bg-red-900/20 dark:text-red-400">${escapeHtml(state.error)}</div>`
          : ''
      }

      ${renderHashtagButtons(state.hashtags, state.selectedHashtag)}

      ${
        state.selectedHashtag
          ? `
            <div class="space-y-4">
              ${
                state.isLoadingContent
                  ? `
                    <div class="space-y-3">
                      <div class="h-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                      <div class="h-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                      <div class="h-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                  `
                  : state.taggedContent
                    ? renderTaggedContent(state.taggedContent)
                    : '<div class="py-8 text-center text-gray-600 dark:text-gray-400">Henüz gösterilecek içerik bulunmuyor.</div>'
              }
            </div>
          `
          : state.hashtags.length === 0
            ? '<div class="py-8 text-center text-gray-600 dark:text-gray-400">Henüz gösterilecek trend konu bulunmuyor.</div>'
            : ''
      }
    </div>
  `;
}

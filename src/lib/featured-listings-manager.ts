export interface FeaturedListing {
  id: string;
  place_id: string;
  title: string;
  position_tier: string;
  start_date: string;
  end_date: string;
  status: string;
  views_count: number;
  clicks_count: number;
  conversions_count: number;
  cost_per_day: number;
  total_cost: number;
  description?: string;
}

export interface FeaturedListingFormData {
  place_id: string;
  title: string;
  position_tier: string;
  start_date: string;
  end_date: string;
  cost_per_day: number;
  description: string;
}

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    return outerData as Record<string, unknown>;
  }

  return payload as Record<string, unknown>;
}

export function extractFeaturedListings(payload: unknown): FeaturedListing[] {
  const data = resolveEnvelopeData(payload);
  const nested = data.data;

  if (Array.isArray(nested)) {
    return nested as FeaturedListing[];
  }

  if (Array.isArray(data.data)) {
    return data.data as FeaturedListing[];
  }

  return [];
}

export function extractFeaturedListingMessage(payload: unknown, fallback: string): string {
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );
}

function renderForm(form: FeaturedListingFormData): string {
  return `
    <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
      <h3 class="mb-4 text-lg font-semibold">Yeni yeminli liste oluştur</h3>
      <form data-featured-listing-form class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <input
            name="title"
            type="text"
            placeholder="Liste başlığı"
            value="${form.title}"
            class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
          <select
            name="position_tier"
            class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="standard" ${form.position_tier === 'standard' ? 'selected' : ''}>Standart</option>
            <option value="premium" ${form.position_tier === 'premium' ? 'selected' : ''}>Premium</option>
            <option value="featured" ${form.position_tier === 'featured' ? 'selected' : ''}>Öne çıkan</option>
          </select>
        </div>
        <textarea
          name="description"
          rows="3"
          placeholder="Liste açıklaması"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >${form.description}</textarea>
        <div class="grid grid-cols-3 gap-4">
          <input
            name="start_date"
            type="date"
            value="${form.start_date}"
            class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
          <input
            name="end_date"
            type="date"
            value="${form.end_date}"
            class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
          <input
            name="cost_per_day"
            type="number"
            step="0.01"
            min="0"
            value="${form.cost_per_day}"
            placeholder="Günlük maliyet"
            class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div class="flex gap-2">
          <button type="submit" class="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">Listeyi oluştur</button>
          <button type="button" data-featured-listings-cancel class="rounded-lg bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400">İptal et</button>
        </div>
      </form>
    </div>
  `;
}

function renderListings(listings: FeaturedListing[]): string {
  if (listings.length === 0) {
    return `
      <div class="py-8 text-center text-gray-500">
        Henüz yeminli liste bulunmuyor. Yeni bir kayıt oluşturmak için yukarıdaki düğmeyi kullanın.
      </div>
    `;
  }

  return `
    <div class="grid gap-4">
      ${listings
        .map(
          (listing) => `
            <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${listing.title}</h3>
                  <div class="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span class="rounded bg-gray-100 px-2 py-1 capitalize dark:bg-gray-700">
                      ${listing.position_tier === 'standard' ? 'Standart' : listing.position_tier === 'premium' ? 'Premium' : 'Öne çıkan'}
                    </span>
                    <span class="rounded bg-blue-100 px-2 py-1 capitalize text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      ${listing.status === 'active' ? 'Aktif' : listing.status === 'scheduled' ? 'Planlanmış' : 'Süresi Dolmuş'}
                    </span>
                  </div>
                  <div class="mt-3 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                    <div>${listing.views_count} görüntülenme</div>
                    <div>${listing.clicks_count} tıklama</div>
                    <div>${formatDate(listing.start_date)} - ${formatDate(listing.end_date)}</div>
                    <div class="font-semibold">₺${listing.total_cost.toFixed(2)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  data-featured-listing-delete="${listing.id}"
                  class="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Kaldır
                </button>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

export function createEmptyFeaturedListingFormData(placeId = ''): FeaturedListingFormData {
  return {
    place_id: placeId,
    title: '',
    position_tier: 'standard',
    start_date: '',
    end_date: '',
    cost_per_day: 0,
    description: '',
  };
}

export function renderFeaturedListingsManager(options: {
  listings: FeaturedListing[];
  loading: boolean;
  error: string | null;
  showForm: boolean;
  form: FeaturedListingFormData;
}): string {
  if (options.loading) {
    return '';
  }

  if (options.error) {
    return `<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">${options.error}</div>`;
  }

  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Yeminli listeler</h2>
        <button
          type="button"
          data-featured-listings-toggle
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          ${options.showForm ? 'Formu kapat' : 'Yeni liste'}
        </button>
      </div>
      ${options.showForm ? renderForm(options.form) : ''}
      ${renderListings(options.listings)}
    </div>
  `;
}

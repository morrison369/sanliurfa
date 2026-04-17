export interface Campaign {
  id: string;
  place_id: string;
  name: string;
  campaign_type: string;
  status: string;
  budget: number;
  spent: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  description?: string;
}

export interface CampaignFormData {
  place_id: string;
  name: string;
  description: string;
  campaign_type: string;
  budget: number;
  targeting: Record<string, unknown>;
  creative_content: Record<string, unknown>;
}

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    return outerData as Record<string, unknown>;
  }

  return payload as Record<string, unknown>;
}

export function extractMarketingCampaigns(payload: unknown): Campaign[] {
  const data = resolveEnvelopeData(payload);
  const nested = data.data;

  if (Array.isArray(nested)) {
    return nested as Campaign[];
  }

  return [];
}

export function extractMarketingCampaignMessage(payload: unknown, fallback: string): string {
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

function renderForm(form: CampaignFormData): string {
  return `
    <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
      <h3 class="mb-4 text-lg font-semibold">Yeni reklam kampanyası oluştur</h3>
      <form data-marketing-campaign-form class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <input
            name="name"
            type="text"
            placeholder="Kampanya adı"
            value="${form.name}"
            class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
          <select
            name="campaign_type"
            class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="promotion" ${form.campaign_type === 'promotion' ? 'selected' : ''}>Promosyon</option>
            <option value="awareness" ${form.campaign_type === 'awareness' ? 'selected' : ''}>Farkındalık</option>
            <option value="conversion" ${form.campaign_type === 'conversion' ? 'selected' : ''}>Dönüşüm</option>
            <option value="retention" ${form.campaign_type === 'retention' ? 'selected' : ''}>Müşteri tutma</option>
          </select>
        </div>
        <textarea
          name="description"
          rows="3"
          placeholder="Kampanya açıklaması"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >${form.description}</textarea>
        <input
          name="budget"
          type="number"
          step="0.01"
          min="0"
          value="${form.budget}"
          placeholder="Toplam bütçe"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          required
        />
        <div class="flex gap-2">
          <button type="submit" class="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">Kampanyayı oluştur</button>
          <button type="button" data-marketing-campaign-cancel class="rounded-lg bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400">İptal et</button>
        </div>
      </form>
    </div>
  `;
}

function renderCampaigns(campaigns: Campaign[]): string {
  if (campaigns.length === 0) {
    return `
      <div class="py-8 text-center text-gray-500">
        Henüz reklam kampanyası bulunmuyor. Yeni bir kampanya oluşturmak için yukarıdaki düğmeyi kullanın.
      </div>
    `;
  }

  return `
    <div class="grid gap-4">
      ${campaigns
        .map(
          (campaign) => `
            <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${campaign.name}</h3>
                  <div class="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span class="rounded bg-gray-100 px-2 py-1 capitalize dark:bg-gray-700">
                      ${campaign.campaign_type === 'promotion' ? 'Promosyon' : campaign.campaign_type === 'awareness' ? 'Farkındalık' : campaign.campaign_type === 'conversion' ? 'Dönüşüm' : 'Müşteri tutma'}
                    </span>
                    <span class="rounded px-2 py-1 capitalize ${campaign.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}">
                      ${campaign.status === 'published' ? 'Yayında' : campaign.status === 'paused' ? 'Duraklatıldı' : 'Taslak durumda'}
                    </span>
                  </div>
                  <div class="mt-3 flex flex-wrap items-center gap-6 text-sm">
                    <div><span class="text-gray-600 dark:text-gray-400">Toplam bütçe: </span><span class="font-semibold">₺${campaign.budget.toFixed(2)}</span></div>
                    <div><span class="text-gray-600 dark:text-gray-400">Harcanan tutar: </span><span class="font-semibold">₺${campaign.spent.toFixed(2)}</span></div>
                    <div><span class="text-gray-600 dark:text-gray-400">Oluşturulma tarihi: </span><span>${formatDate(campaign.created_at)}</span></div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  ${campaign.status === 'draft' ? `<button type="button" data-marketing-campaign-action="publish:${campaign.id}" class="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-900/20">Yayına al</button>` : ''}
                  ${campaign.status === 'published' ? `<button type="button" data-marketing-campaign-action="pause:${campaign.id}" class="rounded-lg p-2 text-yellow-600 transition-colors hover:bg-yellow-50 dark:hover:bg-yellow-900/20">Duraklat</button>` : ''}
                  ${campaign.status === 'draft' || campaign.status === 'paused' ? `<button type="button" data-marketing-campaign-delete="${campaign.id}" class="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">Kaldır</button>` : ''}
                </div>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

export function createEmptyCampaignFormData(placeId = ''): CampaignFormData {
  return {
    place_id: placeId,
    name: '',
    description: '',
    campaign_type: 'promotion',
    budget: 0,
    targeting: {},
    creative_content: {},
  };
}

export function renderMarketingCampaignBuilder(options: {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  showForm: boolean;
  form: CampaignFormData;
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
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Pazarlama kampanyaları</h2>
        <button
          type="button"
          data-marketing-campaign-toggle
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          ${options.showForm ? 'Formu kapat' : 'Yeni kampanya'}
        </button>
      </div>
      ${options.showForm ? renderForm(options.form) : ''}
      ${renderCampaigns(options.campaigns)}
    </div>
  `;
}

export interface ActivityLogItem {
  id: string | number;
  actionType: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};
  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    const nestedData = 'data' in outerData ? (outerData as { data?: unknown }).data : undefined;
    if (Array.isArray(nestedData)) {
      return { activity: nestedData };
    }
    return outerData as Record<string, unknown>;
  }
  return payload as Record<string, unknown>;
}

export function extractMyActivity(payload: unknown): ActivityLogItem[] {
  const data = resolveEnvelopeData(payload);
  const activity = Array.isArray(data.activity)
    ? data.activity
    : Array.isArray(data.data)
      ? data.data
      : [];
  return activity as ActivityLogItem[];
}

function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    review_created: '⭐',
    favorite_added: '❤️',
    comment_posted: '💬',
    collection_created: '📚',
    user_followed: '👥',
  };
  return icons[type] || '📌';
}

function getActivityText(type: string): string {
  const texts: Record<string, string> = {
    review_created: 'İnceleme yazdın',
    favorite_added: 'Favorilere ekledin',
    comment_posted: 'Yorum yaptın',
    collection_created: 'Koleksiyon oluşturdun',
    user_followed: 'Kullanıcı takip ettin',
  };
  return texts[type] || 'Aktivite';
}

function formatActivityDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderActivityItem(item: ActivityLogItem): string {
  const placeName = typeof item.metadata?.placeName === 'string' ? item.metadata.placeName : '';
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
      <div class="flex items-start gap-3">
        <span class="text-2xl">${getActivityIcon(item.actionType)}</span>
        <div class="flex-1">
          <p class="font-medium text-gray-900">${getActivityText(item.actionType)}</p>
          ${placeName ? `<p class="text-sm text-gray-600">${placeName}</p>` : ''}
          <p class="mt-2 text-xs text-gray-500">${formatActivityDate(item.createdAt)}</p>
        </div>
      </div>
    </div>
  `;
}

export function renderMyActivityLog(items: ActivityLogItem[], error: string | null): string {
  if (error) {
    return `
      <div class="rounded-lg border border-red-200 bg-red-50 p-4">
        <p class="text-red-700">${error}</p>
      </div>
    `;
  }

  if (items.length === 0) {
    return '<p class="py-8 text-center text-gray-600">Henüz aktivite yok</p>';
  }

  return `
    <div class="space-y-4">
      <h2 class="text-2xl font-bold text-gray-900">Benim Aktivitelerim</h2>
      <div class="space-y-2">
        ${items.map((item) => renderActivityItem(item)).join('')}
      </div>
    </div>
  `;
}

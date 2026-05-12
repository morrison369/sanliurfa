export const SERVICE_FRESHNESS_MINUTES: Record<string, number> = {
  'jobs.contentQuality.lastRun': 1440,
  'pharmacy.lastUpdated': 1440,
  'transport.lastUpdated': 60,
  'weather.lastUpdated': 30,
};

const FRESHNESS_FALLBACK_KEYS: Record<string, string[]> = {
  'pharmacy.lastUpdated': ['jobs.contentQuality.lastRun'],
};

function resolveFreshnessValue(key: string, freshnessMap: Record<string, string>): string {
  const candidates = [key, ...(FRESHNESS_FALLBACK_KEYS[key] || [])];
  for (const candidate of candidates) {
    const value = freshnessMap[candidate];
    if (value) {
      return value;
    }
  }
  return '';
}

export function formatFreshnessDate(value?: string | Date): string {
  if (!value) return 'Tarih bilgisi yok';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Tarih bilgisi yok';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(date);
}

export function isFreshnessStale(
  key: string,
  freshnessMap: Record<string, string>,
  now = Date.now(),
): boolean {
  const raw = resolveFreshnessValue(key, freshnessMap);
  const ttlMinutes = SERVICE_FRESHNESS_MINUTES[key];
  if (!raw || !ttlMinutes) return true;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return true;
  return now - parsed.getTime() > ttlMinutes * 60 * 1000;
}

export function buildFreshnessLabel(key: string, freshnessMap: Record<string, string>): string {
  const value = resolveFreshnessValue(key, freshnessMap);
  return value ? formatFreshnessDate(value) : 'henüz güncellenmedi';
}

export function buildFreshnessRuntimeText(updatedAt?: string | null, stale?: boolean | null): string {
  if (!updatedAt) return 'Son güncelleme bilgisi yok';
  return `Son güncelleme: ${new Date(updatedAt).toLocaleString('tr-TR')} (${stale ? 'eski veri' : 'güncel'})`;
}

export function buildFreshnessUiState(updatedAt?: string | null, stale?: boolean | null): {
  text: string;
  toneClass: string;
  statusLabel: string;
} {
  if (!updatedAt) {
    return {
      text: 'Veri durumu: Güncelleme bilgisi yok',
      toneClass: 'text-[#9A8470]',
      statusLabel: 'BİLGİ YOK',
    };
  }

  return {
    text: `Veri durumu: ${new Date(updatedAt).toLocaleString('tr-TR')}`,
    toneClass: stale ? 'text-amber-300' : 'text-emerald-300',
    statusLabel: stale ? 'SLA DIŞI' : 'GÜNCEL',
  };
}

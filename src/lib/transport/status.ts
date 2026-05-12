import { queryOne } from '../postgres';
import { isFreshnessStale } from '../city-service-freshness';
import { getCachedPublicRouteData } from '../public-route-cache';

export type TransportProviderSnapshot = {
  key: 'bus' | 'flight';
  label: string;
  ok: boolean;
  source: string;
  checkedAt: string;
  freshnessMinutes: number;
  route: string;
  note: string;
};

type SettingRow = {
  setting_value?: Record<string, unknown> | null;
};

type CountRow = {
  count?: number | string | null;
};

type NextBusRow = {
  route_no?: string | number | null;
  route_name?: string | null;
  departure?: string | null;
};

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toCount(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProviderSnapshots(
  value: Record<string, unknown> | null,
  checkedAt: string,
  busRoutesCount: number,
  busSchedulesCount: number,
): TransportProviderSnapshot[] {
  const providerMap = new Map<'bus' | 'flight', TransportProviderSnapshot>();
  const rawSnapshots = Array.isArray(value?.providerSnapshots)
    ? (value?.providerSnapshots as Array<Record<string, unknown>>)
    : [];

  for (const item of rawSnapshots) {
    const key = item?.key === 'flight' ? 'flight' : item?.key === 'bus' ? 'bus' : null;
    if (!key) continue;
    providerMap.set(key, {
      key,
      label: String(item.label || (key === 'bus' ? 'Şanlıurfa Otobüs Saatleri' : 'Şanlıurfa Uçak Saatleri')),
      ok: Boolean(item.ok),
      source: String(item.source || 'site_settings'),
      checkedAt: String(item.checkedAt || checkedAt),
      freshnessMinutes: Number(item.freshnessMinutes || value?.freshnessMinutes || 60),
      route: String(item.route || (key === 'bus' ? '/ulasim/otobus-saatleri' : '/ulasim/ucak-saatleri')),
      note: String(item.note || ''),
    });
  }

  providerMap.set('bus', {
    key: 'bus',
    label: 'Şanlıurfa Otobüs Saatleri',
    ok: busRoutesCount > 0 && busSchedulesCount > 0,
    source: 'bus_routes + bus_schedules',
    checkedAt,
    freshnessMinutes: 60,
    route: '/ulasim/otobus-saatleri',
    note:
      busRoutesCount > 0 && busSchedulesCount > 0
        ? `${busRoutesCount} aktif hat ve ${busSchedulesCount} sefer kaydı bulundu`
        : 'Aktif otobüs hattı veya saat tablosu eksik',
  });

  providerMap.set('flight', {
    key: 'flight',
    label: 'Şanlıurfa Uçak Saatleri',
    ok: false,
    source: 'editorial planning content',
    checkedAt,
    freshnessMinutes: 60,
    route: '/ulasim/ucak-saatleri',
    note: 'Anlık uçuş ingest hattı bağlı değil; yalnızca planlama rehberi yayında',
  });

  return [...providerMap.values()];
}

async function loadTransportStatusSnapshot() {
  const checkedAt = new Date().toISOString();
  const [settingRow, busRoutesRow, busSchedulesRow, nextBusRow] = await Promise.all([
    queryOne<SettingRow>(
      `SELECT setting_value
       FROM site_settings
       WHERE setting_key = 'transport.lastUpdated'
       LIMIT 1`,
    ),
    queryOne<CountRow>(
      `SELECT COUNT(*)::int AS count
       FROM bus_routes
       WHERE is_active = true`,
    ).catch(() => null),
    queryOne<CountRow>(
      `SELECT COUNT(*)::int AS count
       FROM bus_schedules`,
    ).catch(() => null),
    queryOne<NextBusRow>(
      `SELECT
         r.route_no,
         r.name AS route_name,
         s.departure_time::text AS departure
       FROM bus_schedules s
       JOIN bus_routes r ON r.id = s.route_id
       WHERE r.is_active = true
         AND s.direction = 'outbound'
       ORDER BY
         CASE WHEN s.departure_time > LOCALTIME THEN 0 ELSE 1 END,
         CASE WHEN s.departure_time > LOCALTIME THEN s.departure_time END ASC NULLS LAST,
         s.departure_time ASC
       LIMIT 1`,
    ).catch(() => null),
  ]);

  const settingValue = readRecord(settingRow?.setting_value) || null;
  const updatedAt = typeof settingValue?.updatedAt === 'string' ? settingValue.updatedAt : null;
  const freshnessMinutes = Number(settingValue?.freshnessMinutes || 60);
  const busRoutesCount = toCount(busRoutesRow?.count);
  const busSchedulesCount = toCount(busSchedulesRow?.count);
  const providerSnapshots = normalizeProviderSnapshots(
    settingValue,
    checkedAt,
    busRoutesCount,
    busSchedulesCount,
  );
  const healthyProviders = providerSnapshots.filter((item) => item.ok).length;
  const freshnessMap = updatedAt ? { 'transport.lastUpdated': updatedAt } : {};
  const stale = !updatedAt || isFreshnessStale('transport.lastUpdated', freshnessMap);

  return {
    updatedAt,
    freshnessMinutes,
    stale,
    healthyProviders,
    sources: ['bus', 'flight'],
    providerSnapshots,
    busRoutesCount,
    busSchedulesCount,
    nextBus: nextBusRow || null,
  };
}

export async function getTransportStatusSnapshot() {
  return getCachedPublicRouteData('transport-status-snapshot', loadTransportStatusSnapshot, 30_000);
}

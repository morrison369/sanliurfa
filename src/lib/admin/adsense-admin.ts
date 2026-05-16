import { getAdSenseClient, getAdSenseSlotsConfig, type AdSensePlacement } from '../adsense';
import { queryOne } from '../postgres';
import { getSiteSetting, upsertSiteSetting } from '../site-content';

type AdSenseRenderTarget = {
  label: string;
  href: string;
};

type AdSenseSmokeResult = {
  url: string | null;
  ok: boolean;
  placementDetected: boolean;
  slotDetected: boolean;
  statusCode: number | null;
  note: string;
};

type AdSenseSlotAdminRow = {
  placement: AdSensePlacement;
  settingKey: keyof AdSenseSlotsAdminConfig;
  label: string;
  description: string;
  slot: string;
  configured: boolean;
  source: 'db' | 'env' | 'none';
  renderTargets: AdSenseRenderTarget[];
  smoke: AdSenseSmokeResult;
};

export type AdSenseSlotsAdminConfig = {
  client?: string;
  autoAdsEnabled?: boolean;
  homepageBanner?: string;
  blogListSidebar?: string;
  blogDetailInline?: string;
  blogDetailSidebar?: string;
  classifiedDetail?: string;
};

export type AdSenseAdminSummary = {
  status: 'ready' | 'review' | 'blocked';
  tone: 'ok' | 'advisory' | 'blocked';
  client: string;
  autoAdsEnabled: boolean;
  manualSlotCount: number;
  totalSlotCount: number;
  emptySlotCount: number;
  dbSlotCount: number;
  envSlotCount: number;
  smokeGeneratedAt: string | null;
  rows: AdSenseSlotAdminRow[];
  recommendations: string[];
};

type AdSenseSmokeCache = {
  generatedAt?: string;
  rows?: Array<{
    placement: AdSensePlacement;
    url?: string | null;
    ok?: boolean;
    placementDetected?: boolean;
    slotDetected?: boolean;
    statusCode?: number | null;
    note?: string;
  }>;
};

const SLOT_DEFINITIONS: Array<{
  placement: AdSensePlacement;
  settingKey: keyof AdSenseSlotsAdminConfig;
  label: string;
  description: string;
  renderTargets: AdSenseRenderTarget[];
  envKeys: string[];
}> = [
  {
    placement: 'homepage-banner',
    settingKey: 'homepageBanner',
    label: 'Ana sayfa banner',
    description: 'Landing hero sonrası reklam alanı',
    renderTargets: [{ label: 'Ana sayfa', href: '/' }],
    envKeys: ['PUBLIC_ADSENSE_SLOT_HOMEPAGE_BANNER', 'ADSENSE_SLOT_HOMEPAGE_BANNER'],
  },
  {
    placement: 'blog-list-sidebar',
    settingKey: 'blogListSidebar',
    label: 'Blog liste sidebar',
    description: 'Blog listeleme sayfası yan sütun alanı',
    renderTargets: [{ label: 'Blog liste', href: '/blog' }],
    envKeys: ['PUBLIC_ADSENSE_SLOT_BLOG_LIST_SIDEBAR', 'ADSENSE_SLOT_BLOG_LIST_SIDEBAR'],
  },
  {
    placement: 'blog-detail-inline',
    settingKey: 'blogDetailInline',
    label: 'Blog detay inline',
    description: 'İçerik gövdesi içi sponsorlu reklam alanı',
    renderTargets: [{ label: 'Blog detay', href: '/blog/gobeklitepe-rehberi-ziyaret-bilgileri' }],
    envKeys: ['PUBLIC_ADSENSE_SLOT_BLOG_DETAIL_INLINE', 'ADSENSE_SLOT_BLOG_DETAIL_INLINE'],
  },
  {
    placement: 'blog-detail-sidebar',
    settingKey: 'blogDetailSidebar',
    label: 'Blog detay sidebar',
    description: 'Blog detay yan sütun reklam alanı',
    renderTargets: [{ label: 'Blog detay', href: '/blog/gobeklitepe-rehberi-ziyaret-bilgileri' }],
    envKeys: ['PUBLIC_ADSENSE_SLOT_BLOG_DETAIL_SIDEBAR', 'ADSENSE_SLOT_BLOG_DETAIL_SIDEBAR'],
  },
  {
    placement: 'classified-detail',
    settingKey: 'classifiedDetail',
    label: 'İlan detay',
    description: 'Ücretsiz ilan detay sponsorlu reklam alanı',
    renderTargets: [{ label: 'İlan detay', href: '/ilanlar' }],
    envKeys: ['PUBLIC_ADSENSE_SLOT_CLASSIFIED_DETAIL', 'ADSENSE_SLOT_CLASSIFIED_DETAIL'],
  },
];

function getPublicBaseUrl(): string {
  return (process.env.SITE_URL || process.env.PROD_BASE_URL || 'https://sanliurfa.com').replace(/\/+$/, '');
}

async function getLatestPublishedBlogSlug(): Promise<string | null> {
  const row = await queryOne<{ slug: string }>(
    `SELECT slug
     FROM blog_posts
     WHERE status = 'published'
     ORDER BY published_at DESC NULLS LAST, updated_at DESC, created_at DESC
     LIMIT 1`,
  );
  return row?.slug || null;
}

async function getLatestActiveClassifiedSlug(): Promise<string | null> {
  const row = await queryOne<{ slug: string }>(
    `SELECT slug
     FROM classified_listings
     WHERE status = 'active'
     ORDER BY published_at DESC NULLS LAST, updated_at DESC, created_at DESC
     LIMIT 1`,
  );
  return row?.slug || null;
}

async function resolveSmokeUrl(placement: AdSensePlacement): Promise<string | null> {
  const base = getPublicBaseUrl();
  if (placement === 'homepage-banner') return `${base}/`;
  if (placement === 'blog-list-sidebar') return `${base}/blog`;
  if (placement === 'blog-detail-inline' || placement === 'blog-detail-sidebar') {
    const slug = await getLatestPublishedBlogSlug();
    return slug ? `${base}/blog/${slug}` : null;
  }
  if (placement === 'classified-detail') {
    const slug = await getLatestActiveClassifiedSlug();
    return slug ? `${base}/ilanlar/${slug}` : null;
  }
  return null;
}

async function runPlacementSmokeCheck(placement: AdSensePlacement, slot: string): Promise<AdSenseSmokeResult> {
  const url = await resolveSmokeUrl(placement);
  if (!url) {
    return {
      url: null,
      ok: false,
      placementDetected: false,
      slotDetected: false,
      statusCode: null,
      note: 'Örnek public URL bulunamadı.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'SanliurfaAdsenseAdminSmoke/1.0' },
      signal: controller.signal,
    });
    const html = await response.text();
    const placementDetected = html.includes(`data-placement="${placement}"`);
    const slotDetected = Boolean(slot) && html.includes(`data-ad-slot="${slot}"`);
    const ok = response.ok && placementDetected && (!slot || slotDetected);
    return {
      url,
      ok,
      placementDetected,
      slotDetected,
      statusCode: response.status,
      note: !response.ok
        ? `Public yanıt ${response.status}`
        : !placementDetected
          ? 'Reklam bileşeni HTML içinde görünmedi.'
          : slot && !slotDetected
            ? 'Slot ID HTML içinde görünmedi.'
            : 'Public HTML içinde reklam bloğu doğrulandı.',
    };
  } catch {
    return {
      url,
      ok: false,
      placementDetected: false,
      slotDetected: false,
      statusCode: null,
      note: 'Public smoke isteği başarısız oldu.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getDefaultSmokeResult(): AdSenseSmokeResult {
  return {
    url: null,
    ok: false,
    placementDetected: false,
    slotDetected: false,
    statusCode: null,
    note: 'Henüz smoke cache yok. Manuel kontrol başlatın.',
  };
}

function buildSmokeMap(cache: AdSenseSmokeCache): Map<AdSensePlacement, AdSenseSmokeResult> {
  return new Map(
    (cache.rows || []).map((row) => [
      row.placement,
      {
        url: row.url ?? null,
        ok: Boolean(row.ok),
        placementDetected: Boolean(row.placementDetected),
        slotDetected: Boolean(row.slotDetected),
        statusCode: typeof row.statusCode === 'number' ? row.statusCode : null,
        note: row.note || 'Smoke sonucu bulunamadı.',
      },
    ]),
  );
}

async function saveSmokeCache(rows: AdSenseSlotAdminRow[]): Promise<string> {
  const generatedAt = new Date().toISOString();
  await upsertSiteSetting(
    'adsense.smokeCache',
    {
      generatedAt,
      rows: rows.map((row) => ({
        placement: row.placement,
        url: row.smoke.url,
        ok: row.smoke.ok,
        placementDetected: row.smoke.placementDetected,
        slotDetected: row.smoke.slotDetected,
        statusCode: row.smoke.statusCode,
        note: row.smoke.note,
      })),
    },
    'AdSense public smoke kontrol önbelleği',
    null,
  );
  return generatedAt;
}

export async function getAdSenseAdminSummary(options?: {
  refreshSmoke?: boolean;
}): Promise<AdSenseAdminSummary> {
  const [config, client, smokeCache] = await Promise.all([
    getAdSenseSlotsConfig(),
    getAdSenseClient(),
    getSiteSetting<AdSenseSmokeCache>('adsense.smokeCache', { generatedAt: '', rows: [] }),
  ]);
  const smokeMap = buildSmokeMap(smokeCache);

  let rows = await Promise.all(SLOT_DEFINITIONS.map(async (item) => {
    const rawValue = config[item.settingKey];
    const dbSlot = typeof rawValue === 'string' ? rawValue.trim() : '';
    const envSlot = item.envKeys
      .map((key) => (typeof process.env[key] === 'string' ? String(process.env[key]).trim() : ''))
      .find(Boolean) || '';
    const slot = dbSlot || envSlot;
    const source: AdSenseSlotAdminRow['source'] = dbSlot ? 'db' : envSlot ? 'env' : 'none';
    return {
      placement: item.placement,
      settingKey: item.settingKey,
      label: item.label,
      description: item.description,
      slot,
      configured: Boolean(slot),
      source,
      renderTargets: item.renderTargets,
      smoke: smokeMap.get(item.placement) || getDefaultSmokeResult(),
    };
  }));

  let smokeGeneratedAt =
    typeof smokeCache.generatedAt === 'string' && smokeCache.generatedAt.trim()
      ? smokeCache.generatedAt
      : null;

  if (options?.refreshSmoke) {
    rows = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        smoke: await runPlacementSmokeCheck(row.placement, row.slot),
      })),
    );
    smokeGeneratedAt = await saveSmokeCache(rows);
  }

  const manualSlotCount = rows.filter((row) => row.configured).length;
  const totalSlotCount = rows.length;
  const emptySlotCount = totalSlotCount - manualSlotCount;
  const dbSlotCount = rows.filter((row) => row.source === 'db').length;
  const envSlotCount = rows.filter((row) => row.source === 'env').length;
  const autoAdsEnabled = Boolean(config.autoAdsEnabled);
  const recommendations: string[] = [];

  let status: AdSenseAdminSummary['status'] = 'blocked';
  let tone: AdSenseAdminSummary['tone'] = 'blocked';

  if (client && (autoAdsEnabled || manualSlotCount > 0)) {
    if (manualSlotCount >= 2 || (autoAdsEnabled && manualSlotCount >= 1)) {
      status = 'ready';
      tone = 'ok';
    } else {
      status = 'review';
      tone = 'advisory';
    }
  }

  if (!client) {
    recommendations.push('AdSense client anahtarını tanımlayın.');
  }
  if (!autoAdsEnabled) {
    recommendations.push('Auto ads kapalıysa görünmesini istediğiniz alanlar için manuel slot girin.');
  }
  if (emptySlotCount > 0) {
    recommendations.push(`${emptySlotCount} slot boş; ilgili sayfalarda reklam alanı render edilmeyecek.`);
  }
  if (envSlotCount > 0) {
    recommendations.push(`${envSlotCount} slot halen env üzerinden geliyor; panelden DB yönetimine taşınabilir.`);
  }
  if (smokeGeneratedAt) {
    const failedSmokeCount = rows.filter((row) => !row.smoke.ok).length;
    if (failedSmokeCount > 0) {
      recommendations.push(`${failedSmokeCount} reklam yerleşimi public smoke doğrulamasında görünmedi; render yüzeylerini kontrol edin.`);
    }
  } else {
    recommendations.push('Public reklam yüzeyleri henüz manuel smoke kontrolünden geçmedi.');
  }

  return {
    status,
    tone,
    client,
    autoAdsEnabled,
    manualSlotCount,
    totalSlotCount,
    emptySlotCount,
    dbSlotCount,
    envSlotCount,
    smokeGeneratedAt,
    rows,
    recommendations,
  };
}

import { queryRead as query } from './postgres';
import {
  getMediaAsset,
  getSeoOverride,
  listActiveHomepageSections,
  listActiveSiteServiceEntries,
} from './site-platform';
import { logger } from './logging';

export interface HomeSectionStateInput {
  homepageSectionIds: string[];
  configuredSectionOrder: string[];
  platformHomepageSections: Array<{ section_key?: string; is_active?: boolean }>;
  homepageSettingVisibility: Record<string, boolean>;
}

export interface HomeSectionStateOutput {
  sectionOrderMap: Record<string, number>;
  sectionVisibilitySetting: Record<string, boolean>;
}

export interface HomepageCoreData {
  featuredPlaces: Array<Record<string, unknown>>;
  recentPlaces: Array<Record<string, unknown>>;
  recentPosts: Array<Record<string, unknown>>;
  mainCategories: Array<Record<string, unknown>>;
  districts: Array<Record<string, unknown>>;
  featuredSites: Array<Record<string, unknown>>;
  featuredRecipes: Array<Record<string, unknown>>;
  trendingSearches: Array<{ query: string; search_count?: number }>;
  categoryHeatmap: Array<Record<string, unknown>>;
  districtSpotlights: Array<Record<string, unknown>>;
  recentReviewHighlights: Array<Record<string, unknown>>;
  upcomingEventsCount: number;
  pharmacyCount: number;
  busRouteCount: number;
  totalPlaceCount: number;
  serviceFreshness: Record<string, string>;
}

export interface HomepageDailyPickRecord {
  id?: string | number;
  name?: string;
  title?: string;
  slug?: string;
  short_description?: string;
  image_url?: string;
  cover_image?: string;
  rating?: string | number;
  review_count?: string | number;
  event_date?: string;
  [key: string]: unknown;
}

export interface HomepageDailyPicks {
  dailyPlace: HomepageDailyPickRecord;
  dailySite: HomepageDailyPickRecord;
  dailyEvent: HomepageDailyPickRecord;
}

export interface HomepagePlatformData {
  platformHeroAssetUrl: string;
  platformHomepageSeoPayload: Record<string, unknown> | null;
  platformHomepageCanonical: string;
  platformCityServices: Array<Record<string, unknown>>;
  platformHomepageSections: Array<Record<string, unknown>>;
}

const HOMEPAGE_DATA_CACHE_TTL_MS = Math.max(
  0,
  Number(process.env.HOMEPAGE_DATA_CACHE_TTL_MS || 30_000),
);

let homepageCoreDataCache: { expiresAt: number; data: HomepageCoreData } | null = null;
let homepageCoreDataInflight: Promise<HomepageCoreData> | null = null;
let homepageDailyPicksCache: { expiresAt: number; data: HomepageDailyPicks } | null = null;
let homepageDailyPicksInflight: Promise<HomepageDailyPicks> | null = null;

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readCache<T>(cache: { expiresAt: number; data: T } | null): T | null {
  if (!cache || cache.expiresAt <= Date.now()) return null;
  return cache.data;
}

function dayHash(slot: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const seed = `${today}:${slot}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickByDay<T>(rows: T[], slot: string): T | null {
  if (rows.length === 0) return null;
  return rows[dayHash(slot) % rows.length] || null;
}

export const createHomeSectionState = (
  input: HomeSectionStateInput,
): HomeSectionStateOutput => {
  const { homepageSectionIds, configuredSectionOrder, platformHomepageSections, homepageSettingVisibility } = input;
  const platformHomepageSectionMap = new Map(
    platformHomepageSections.map((section) => [String(section.section_key || '').trim(), section]),
  );

  const sectionOrderList = [
    ...configuredSectionOrder.filter((id) => homepageSectionIds.includes(id)),
    ...homepageSectionIds.filter((id) => !configuredSectionOrder.includes(id)),
  ];

  const sectionOrderMap = Object.fromEntries(sectionOrderList.map((id, index) => [id, index + 1]));
  const sectionVisibilitySetting =
    platformHomepageSections.length > 0
      ? Object.fromEntries(
          homepageSectionIds.map((id) => [
            id,
            platformHomepageSectionMap.has(id)
              ? platformHomepageSectionMap.get(id)?.is_active !== false
              : homepageSettingVisibility[id],
          ]),
        )
      : homepageSettingVisibility;

  return { sectionOrderMap, sectionVisibilitySetting };
};

async function loadHomepageCoreDataFresh(): Promise<HomepageCoreData> {
  const fallback: HomepageCoreData = {
    featuredPlaces: [],
    recentPlaces: [],
    recentPosts: [],
    mainCategories: [],
    districts: [],
    featuredSites: [],
    featuredRecipes: [],
    trendingSearches: [],
    categoryHeatmap: [],
    districtSpotlights: [],
    recentReviewHighlights: [],
    upcomingEventsCount: 0,
    pharmacyCount: 0,
    busRouteCount: 0,
    totalPlaceCount: 0,
    serviceFreshness: {},
  };

  try {
    const [
      featuredResult,
      recentResult,
      postsResult,
      catResult,
      distResult,
      sitesResult,
      eventCountResult,
      pharmacyCountResult,
      busRouteCountResult,
      totalPlaceCountResult,
      recipeResult,
      trendingResult,
      categoryHeatmapResult,
      districtSpotlightsResult,
      recentReviewHighlightsResult,
      settingsFreshnessResult,
    ] = await Promise.all([
      query(
        `SELECT
           p.id,
           p.name,
           p.slug,
           COALESCE(NULLIF(p.short_description, ''), NULLIF(p.description, ''), 'Şanlıurfa mekân rehberi kaydı.') AS description,
           p.image_url,
           COALESCE(c.name, 'Mekân') AS category,
           p.rating,
           p.review_count,
           p.price_range,
           p.address
         FROM places p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.status = 'active' AND p.is_featured = true
         ORDER BY p.rating DESC NULLS LAST, p.review_count DESC NULLS LAST, p.created_at DESC
         LIMIT 6`,
      ),
      query(
        `SELECT
           p.id,
           p.name,
           p.slug,
           COALESCE(NULLIF(p.short_description, ''), NULLIF(p.description, ''), 'Şanlıurfa mekân rehberi kaydı.') AS description,
           p.image_url,
           COALESCE(c.name, 'Mekân') AS category,
           p.rating,
           p.review_count,
           p.price_range,
           p.address,
           p.created_at,
           p.updated_at
         FROM places p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.status = 'active'
         ORDER BY p.created_at DESC
         LIMIT 8`,
      ),
      query(
        `SELECT
           id,
           title,
           slug,
           excerpt,
           cover_image AS image_url,
           published_at,
           category
         FROM blog_posts
         WHERE status = 'published'
         ORDER BY published_at DESC NULLS LAST, created_at DESC
         LIMIT 3`,
      ),
      query("SELECT * FROM categories WHERE parent_id IS NULL AND is_active = true ORDER BY sort_order LIMIT 12"),
      query(
        `SELECT
           d.*,
           (
             SELECT COUNT(*)
             FROM places p
             WHERE p.district_id = d.id AND p.status = 'active'
           ) AS place_count
         FROM districts d
         ORDER BY COALESCE(d.sort_order, 9999), d.name`,
      ),
      query(
        `SELECT
           id,
           name,
           slug,
           COALESCE(NULLIF(short_description, ''), NULLIF(description, ''), 'Şanlıurfa tarihi gezi noktası.') AS description,
           COALESCE(cover_image, images[1], images[2], images[3], images[4], images[5]) AS image_url
         FROM historical_sites
         WHERE status = 'active' AND is_featured = true
         ORDER BY created_at
         LIMIT 3`,
      ),
      query("SELECT COUNT(*)::int AS count FROM events WHERE status = 'published'"),
      query("SELECT COUNT(*)::int AS count FROM pharmacies WHERE is_on_duty = true"),
      query("SELECT COUNT(*)::int AS count FROM bus_routes WHERE is_active = true"),
      query("SELECT COUNT(*)::int AS count FROM places WHERE status = 'active'"),
      query(
        `SELECT
           id,
           slug,
           name AS title,
           cover_image AS image_url,
           cook_time,
           difficulty AS category
         FROM recipes
         WHERE status = 'published'
         ORDER BY is_featured DESC, rating DESC NULLS LAST, created_at DESC
         LIMIT 6`,
      ),
      query(
        `SELECT query, search_count, last_searched_at
         FROM trending_searches
         ORDER BY search_count DESC NULLS LAST, last_searched_at DESC NULLS LAST
         LIMIT 10`,
      ),
      query(
        `SELECT c.slug, c.name, COUNT(*)::int AS place_count
         FROM places p
         JOIN categories c ON c.id = p.category_id
         WHERE p.status = 'active' AND c.is_active = true
         GROUP BY c.slug, c.name
         ORDER BY COUNT(*) DESC
         LIMIT 12`,
      ),
      query(
        `SELECT *
         FROM (
           SELECT
             d.name AS district_name,
             d.slug AS district_slug,
             p.name AS place_name,
             p.slug AS place_slug,
             p.rating,
             COALESCE(p.review_count, 0) AS review_count,
             ROW_NUMBER() OVER (
               PARTITION BY d.id
               ORDER BY COALESCE(p.rating, 0) DESC, COALESCE(p.review_count, 0) DESC, p.created_at DESC
             ) AS rank_no
           FROM districts d
           JOIN places p ON p.district_id = d.id
           WHERE d.is_central = true
             AND p.status = 'active'
         ) ranked
         WHERE rank_no = 1
         ORDER BY COALESCE(rating, 0) DESC, review_count DESC
         LIMIT 6`,
      ),
      query(
        `SELECT
           r.id,
           r.content,
           r.rating,
           r.created_at,
           p.name AS place_name,
           p.slug AS place_slug,
           COALESCE(u.full_name, u.name, split_part(u.email, '@', 1), 'Ziyaretçi') AS author_name
         FROM reviews r
         JOIN places p ON p.id = r.place_id
         LEFT JOIN users u ON u.id = r.user_id
         WHERE p.status = 'active'
           AND r.status = 'active'
         ORDER BY r.created_at DESC
         LIMIT 6`,
      ),
      query(
        `SELECT setting_key, setting_value
         FROM site_settings
         WHERE setting_key IN ('transport.lastUpdated','weather.lastUpdated','pharmacy.lastUpdated','jobs.contentQuality.lastRun')`,
      ),
    ]);

    return {
      featuredPlaces: featuredResult.rows || [],
      recentPlaces: recentResult.rows || [],
      recentPosts: postsResult.rows || [],
      mainCategories: catResult.rows || [],
      districts: distResult.rows || [],
      featuredSites: sitesResult.rows || [],
      featuredRecipes: recipeResult.rows || [],
      trendingSearches: (trendingResult.rows || []) as Array<{ query: string; search_count?: number }>,
      categoryHeatmap: categoryHeatmapResult.rows || [],
      districtSpotlights: districtSpotlightsResult.rows || [],
      recentReviewHighlights: recentReviewHighlightsResult.rows || [],
      upcomingEventsCount: Number(eventCountResult.rows[0]?.count || 0),
      pharmacyCount: Number(pharmacyCountResult.rows[0]?.count || 0),
      busRouteCount: Number(busRouteCountResult.rows[0]?.count || 0),
      totalPlaceCount: Number(totalPlaceCountResult.rows[0]?.count || 0),
      serviceFreshness: Object.fromEntries(
        (settingsFreshnessResult.rows || []).map((row: Record<string, unknown>) => {
          const settingValue = readRecord(row.setting_value);
          return [
            String(row.setting_key || ''),
            String(settingValue?.at || settingValue?.updatedAt || settingValue?.lastUpdated || ''),
          ];
        }),
      ),
    };
  } catch (error) {
    logger.error(
      'Error loading homepage core data',
      error instanceof Error ? error : new Error(String(error)),
    );
    return fallback;
  }
}

export async function loadHomepageCoreData(): Promise<HomepageCoreData> {
  const cached = readCache(homepageCoreDataCache);
  if (cached) return cached;
  if (homepageCoreDataInflight) return homepageCoreDataInflight;

  homepageCoreDataInflight = loadHomepageCoreDataFresh()
    .then((data) => {
      homepageCoreDataCache = {
        expiresAt: Date.now() + HOMEPAGE_DATA_CACHE_TTL_MS,
        data,
      };
      return data;
    })
    .finally(() => {
      homepageCoreDataInflight = null;
    });

  return homepageCoreDataInflight;
}

async function loadHomepageDailyPicksFresh(): Promise<HomepageDailyPicks> {
  const fallback: HomepageDailyPicks = {
    dailyPlace: {
      name: 'Halil İbrahim Sofrası',
      slug: 'halil-ibrahim-sofrasi',
      short_description: 'Şanlıurfa kebap kültürünün simgesi.',
      image_url: '/images/blog/sanliurfa-lezzetler-2026.webp',
      rating: 4.8,
      review_count: 312,
    },
    dailySite: {
      name: 'Göbeklitepe',
      slug: 'gobeklitepe',
      short_description: 'İnsanlık tarihinin bilinen en eski tapınağı.',
      cover_image: '/images/blog/gobeklitepe.jpg',
    },
    dailyEvent: {
      title: 'Şanlıurfa Kültür Festivali',
      slug: 'sanliurfa-kultur-festivali',
      short_description: 'Şehrin kültür takviminde öne çıkan etkinliklerden biri.',
      image_url: '/images/etkinlikler/sanliurfa-kultur-festivali.jpg',
      event_date: '2026-06-15',
    },
  };

  try {
    const [placeRes, sitesRes, eventRes] = await Promise.all([
      query(`
        SELECT id, name, slug, short_description, image_url, rating, review_count
        FROM places
        WHERE status = 'active' AND review_count > 0
        ORDER BY rating DESC NULLS LAST, review_count DESC NULLS LAST
        LIMIT 50
      `),
      query(`
        SELECT id, name, slug, short_description, cover_image
        FROM historical_sites
        ORDER BY id
        LIMIT 30
      `).catch(() => ({ rows: [] })),
      query(`
        SELECT id, title, slug, description AS short_description, image_url, start_date::text AS event_date
        FROM events
        WHERE status = 'published' AND start_date >= CURRENT_DATE
        ORDER BY start_date ASC
        LIMIT 20
      `).catch(() => ({ rows: [] })),
    ]);

    return {
      dailyPlace: pickByDay(placeRes.rows || [], 'place') || fallback.dailyPlace,
      dailySite: pickByDay(sitesRes.rows || [], 'site') || fallback.dailySite,
      dailyEvent: pickByDay(eventRes.rows || [], 'event') || fallback.dailyEvent,
    };
  } catch (error) {
    logger.error(
      'Error loading homepage daily picks',
      error instanceof Error ? error : new Error(String(error)),
    );
    return fallback;
  }
}

export async function loadHomepageDailyPicks(): Promise<HomepageDailyPicks> {
  const cached = readCache(homepageDailyPicksCache);
  if (cached) return cached;
  if (homepageDailyPicksInflight) return homepageDailyPicksInflight;

  homepageDailyPicksInflight = loadHomepageDailyPicksFresh()
    .then((data) => {
      homepageDailyPicksCache = {
        expiresAt: Date.now() + HOMEPAGE_DATA_CACHE_TTL_MS,
        data,
      };
      return data;
    })
    .finally(() => {
      homepageDailyPicksInflight = null;
    });

  return homepageDailyPicksInflight;
}

export function clearHomepageDataCacheForTests(): void {
  homepageCoreDataCache = null;
  homepageCoreDataInflight = null;
  homepageDailyPicksCache = null;
  homepageDailyPicksInflight = null;
}

export async function loadHomepagePlatformData(): Promise<HomepagePlatformData> {
  const fallback: HomepagePlatformData = {
    platformHeroAssetUrl: '',
    platformHomepageSeoPayload: null,
    platformHomepageCanonical: '',
    platformCityServices: [],
    platformHomepageSections: [],
  };

  try {
    const [heroAsset, homepageSeoOverride, cityServices, homepageSections] = await Promise.all([
      getMediaAsset('homepage.hero.background'),
      getSeoOverride('homepage', 'home'),
      listActiveSiteServiceEntries('city-services'),
      listActiveHomepageSections(),
    ]);

    return {
      platformHeroAssetUrl: String(heroAsset?.url || '').trim(),
      platformHomepageSeoPayload: homepageSeoOverride?.seo_payload || null,
      platformHomepageCanonical: String(homepageSeoOverride?.canonical_path || '').trim(),
      platformCityServices: cityServices || [],
      platformHomepageSections: homepageSections || [],
    };
  } catch (error) {
    logger.error(
      'Error loading homepage platform data',
      error instanceof Error ? error : new Error(String(error)),
    );
    return fallback;
  }
}

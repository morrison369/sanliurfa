import { query } from '../postgres';
import { ensureClassifiedSchemaAndCategories } from '../classifieds';
import { ADMIN_CRM_BOTS, ADMIN_CRM_MODULES, type AdminCrmBot, type AdminCrmModule } from '../../data/admin-city-crm';

type CountMap = Record<string, number>;

async function safeCount(sql: string): Promise<number> {
  try {
    const result = await query<{ count: number }>(sql);
    return Number(result.rows[0]?.count || 0);
  } catch {
    return 0;
  }
}

export async function getAdminCrmCounts(): Promise<CountMap> {
  const count = async (key: string, sql: string): Promise<[string, number]> => [key, await safeCount(sql)];
  const entries = await Promise.all([
    count('placesTotal', 'SELECT COUNT(*)::int AS count FROM places'),
    count('placesActive', "SELECT COUNT(*)::int AS count FROM places WHERE status IN ('active','published')"),
    count('placesPending', "SELECT COUNT(*)::int AS count FROM places WHERE status IN ('pending','draft')"),
    count('placesSeoMissing', "SELECT COUNT(*)::int AS count FROM places WHERE COALESCE(meta_description, '') = '' OR COALESCE(slug, '') = ''"),
    count('placesImageMissing', "SELECT COUNT(*)::int AS count FROM places WHERE thumbnail_url IS NULL AND (images IS NULL OR array_length(images, 1) IS NULL)"),
    count('placesLocationMissing', 'SELECT COUNT(*)::int AS count FROM places WHERE latitude IS NULL OR longitude IS NULL'),
    count('users', 'SELECT COUNT(*)::int AS count FROM users'),
    count('matchProfiles', 'SELECT COUNT(*)::int AS count FROM user_match_profiles'),
    count('reviews', 'SELECT COUNT(*)::int AS count FROM reviews'),
    count('pendingReviews', "SELECT COUNT(*)::int AS count FROM reviews WHERE COALESCE(is_approved, true) = false OR COALESCE(status, '') IN ('pending','reported')"),
    count('eventsActive', "SELECT COUNT(*)::int AS count FROM events WHERE status IN ('active','published')"),
    count('blogPublished', "SELECT COUNT(*)::int AS count FROM blog_posts WHERE status = 'published'"),
    count('categories', 'SELECT COUNT(*)::int AS count FROM categories'),
    count('districts', 'SELECT COUNT(*)::int AS count FROM districts'),
    count('neighborhoods', 'SELECT COUNT(*)::int AS count FROM neighborhoods'),
    count('pharmaciesDuty', 'SELECT COUNT(*)::int AS count FROM pharmacies WHERE is_on_duty = true'),
    count('adsActive', "SELECT COUNT(*)::int AS count FROM advertisements WHERE status IN ('active','published')"),
    count('classifiedsTotal', 'SELECT COUNT(*)::int AS count FROM classified_listings'),
    count('classifiedsPending', "SELECT COUNT(*)::int AS count FROM classified_listings WHERE status = 'pending'"),
    count('classifiedsActive', "SELECT COUNT(*)::int AS count FROM classified_listings WHERE status = 'active'"),
    count('submissionsPending', "SELECT COUNT(*)::int AS count FROM place_claims WHERE status = 'pending'"),
    count('reportsOpen', "SELECT COUNT(*)::int AS count FROM content_reports WHERE status IN ('pending','open','review')"),
    count('siteSettings', 'SELECT COUNT(*)::int AS count FROM site_settings'),
    count('recipesTotal', 'SELECT COUNT(*)::int AS count FROM recipes'),
    count('historicalSitesTotal', "SELECT COUNT(*)::int AS count FROM historical_sites WHERE status IN ('active','published')"),
  ]);

  return Object.fromEntries(entries) as CountMap;
}

export async function getAdminCrmPreview(module: AdminCrmModule): Promise<Array<Record<string, unknown>>> {
  try {
    if (module.slug === 'businesses') {
      const result = await query(`
        SELECT id, name, slug, category, status, is_featured, is_verified, rating, review_count, updated_at
        FROM places
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 8
      `);
      return result.rows;
    }
    if (module.slug === 'submissions') {
      const result = await query(`
        SELECT
          pc.id,
          COALESCE(p.name, pc.contact_name, 'İşletme başvurusu') AS business_name,
          pc.status,
          pc.contact_name,
          pc.contact_email,
          pc.contact_phone,
          pc.created_at
        FROM place_claims pc
        LEFT JOIN places p ON p.id = pc.place_id
        LEFT JOIN users u ON u.id = pc.user_id
        ORDER BY pc.created_at DESC
        LIMIT 8
      `);
      return result.rows;
    }
    if (module.slug === 'classifieds') {
      await ensureClassifiedSchemaAndCategories();
      const result = await query(`
        SELECT cl.id, cl.title, cl.status, cl.district, cl.price, cc.name AS category, cl.created_at
        FROM classified_listings cl
        LEFT JOIN classified_categories cc ON cc.id = cl.category_id
        ORDER BY cl.created_at DESC
        LIMIT 8
      `);
      return result.rows;
    }
    if (module.slug === 'locations/districts') {
      const result = await query(`
        SELECT d.id, d.name, d.slug, d.is_active, COUNT(p.id)::int AS place_count
        FROM districts d
        LEFT JOIN places p ON p.district_id = d.id
        GROUP BY d.id
        ORDER BY d.name
        LIMIT 13
      `);
      return result.rows;
    }
    if (module.slug === 'locations/neighborhoods') {
      const result = await query(`
        SELECT n.id, n.name, n.slug, d.name AS district, COUNT(p.id)::int AS place_count
        FROM neighborhoods n
        LEFT JOIN districts d ON d.id = n.district_id
        LEFT JOIN places p ON p.neighborhood_id = n.id
        GROUP BY n.id, d.name
        ORDER BY d.name, n.name
        LIMIT 12
      `);
      return result.rows;
    }
    if (module.slug === 'community/users') {
      const result = await query(`
        SELECT id, email, full_name, role, created_at, last_login
        FROM users
        ORDER BY created_at DESC
        LIMIT 8
      `);
      return result.rows;
    }
    if (module.slug === 'community/profiles') {
      const result = await query(`
        SELECT id, user_id, preferred_district, is_discoverable, updated_at
        FROM user_match_profiles
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 8
      `);
      return result.rows;
    }
    if (module.slug === 'ads') {
      const result = await query(`
        SELECT id, title, status, starts_at, ends_at, place_id
        FROM advertisements
        ORDER BY ends_at DESC NULLS LAST
        LIMIT 8
      `);
      return result.rows;
    }
    if (module.slug === 'seo' || module.slug === 'settings') {
      const result = await query(`
        SELECT setting_key, status, updated_at, description
        FROM site_settings
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 10
      `);
      return result.rows;
    }
    if (module.slug === 'audit-log') {
      const result = await query(`
        SELECT action, entity_type, entity_id, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 10
      `);
      return result.rows;
    }
  } catch {
    return [];
  }
  return [];
}

export function getBotCards(keys: string[]): AdminCrmBot[] {
  if (keys.length === 0) return [];
  return ADMIN_CRM_BOTS.filter((bot) => keys.includes(bot.key));
}

export function buildBotFindings(counts: CountMap, bot: AdminCrmBot): { issues: number; suggestions: number; status: string } {
  const byBot: Record<string, number> = {
    seo: counts.placesSeoMissing || 0,
    content: Math.max(0, (counts.blogPublished || 0) < 20 ? 20 - (counts.blogPublished || 0) : 0),
    'business-data': (counts.placesImageMissing || 0) + (counts.placesLocationMissing || 0),
    'submission-check': counts.submissionsPending || 0,
    'classifieds-check': counts.classifiedsPending || 0,
    'pharmacy-check': counts.pharmaciesDuty > 0 ? 0 : 1,
    'transport-check': 0,
    'map-check': counts.placesLocationMissing || 0,
    'image-alt': counts.placesImageMissing || 0,
    moderation: (counts.pendingReviews || 0) + (counts.reportsOpen || 0),
    'ads-check': counts.adsActive > 0 ? 0 : 1,
    'duplicate-data': 0,
    'internal-link': counts.placesSeoMissing || 0,
  };
  const issues = byBot[bot.key] || 0;
  return {
    issues,
    suggestions: issues > 0 ? Math.min(issues, 25) : 0,
    status: issues > 0 ? 'İnceleme gerekli' : 'Temiz',
  };
}

export { ADMIN_CRM_BOTS, ADMIN_CRM_MODULES };

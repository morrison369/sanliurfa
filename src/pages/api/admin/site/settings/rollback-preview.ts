import type { APIRoute } from 'astro';
import { apiResponse, safeErrorDetail } from '../../../../../lib/api';
import { queryOne } from '../../../../../lib/postgres';

function json(data: unknown, status = 200) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

type JsonObject = Record<string, any>;

function flatten(obj: JsonObject, prefix = '', out: Record<string, string> = {}) {
  for (const key of Object.keys(obj || {})) {
    const value = obj[key];
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, next, out);
    } else {
      out[next] = JSON.stringify(value);
    }
  }
  return out;
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  const key = String(url.searchParams.get('key') || '').trim();
  const targetVersion = Number(url.searchParams.get('version'));
  if (!key) return json({ error: 'key zorunlu' }, 400);
  if (!Number.isInteger(targetVersion) || targetVersion < 1) return json({ error: 'version geçersiz' }, 400);

  try {
    const current = await queryOne<{ setting_value: JsonObject }>(
      `SELECT setting_value FROM site_settings WHERE setting_key = $1`,
      [key],
    );
    const target = await queryOne<{ setting_value: JsonObject }>(
      `SELECT setting_value FROM site_setting_versions WHERE setting_key = $1 AND version_no = $2`,
      [key, targetVersion],
    );

    if (!current?.setting_value) return json({ error: 'Mevcut ayar bulunamadı' }, 404);
    if (!target?.setting_value) return json({ error: 'Hedef sürüm bulunamadı' }, 404);

    const a = flatten(current.setting_value);
    const b = flatten(target.setting_value);
    const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
    const changed = keys
      .filter((k) => a[k] !== b[k])
      .map((k) => ({ path: k, current: a[k] ?? null, rollbackTo: b[k] ?? null }));

    const seoPaths = changed.filter((x) => /title|description|meta|seo/i.test(x.path));
    const routeMap: Record<string, string[]> = {
      'homepage.hero': ['/'],
      'homepage.mainCta': ['/'],
      'homepage.primaryActions': ['/'],
      'homepage.featuredGuides': ['/', '/mekanlar', '/blog'],
      'homepage.faq': ['/'],
      'header.utilityLinks': ['/*'],
      'footer.links': ['/*'],
    };
    const affectedPages = routeMap[key] || ['/*'];

    return json({
      success: true,
      key,
      targetVersion,
      dryRun: true,
      summary: { changed: changed.length },
      changed: changed.slice(0, 200),
      impact: {
        affectedPages,
        seoTouchedFields: seoPaths.length,
        seoRisk: seoPaths.length > 0 ? 'medium' : 'low',
      },
    });
  } catch (error) {
    return json({ success: false, error: safeErrorDetail(error, 'rollback preview failed') }, 500);
  }
};

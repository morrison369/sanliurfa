import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { deleteCachePattern } from '../../../../lib/cache';
import { logger } from '../../../../lib/logging';

/**
 * Admin: Marketing & Tracking ayarları kaydet.
 *
 * Site_settings tablosuna upsert:
 *   - integrations.verification.gsc / bing
 *   - integrations.clarity.clarity_id
 *   - integrations.yandex.metrica_id
 *
 * Cache pattern invalidate edilir; Layout.astro bir sonraki SSR'de yeni değerleri okur.
 */

async function upsertSetting(key: string, value: object): Promise<void> {
 await query(
  `INSERT INTO site_settings (key, value, updated_at)
   VALUES ($1, $2::jsonb, NOW())
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
  [key, JSON.stringify(value)],
 );
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
 if (!locals.user || locals.user.role !== 'admin') {
  return new Response('Forbidden', { status: 403 });
 }

 try {
  const form = await request.formData();
  const gsc = String(form.get('gsc') || '').trim();
  const bing = String(form.get('bing') || '').trim();
  const clarityId = String(form.get('clarity_id') || '').trim();
  const metricaId = String(form.get('metrica_id') || '').trim();

  await upsertSetting('integrations.verification', { gsc, bing });
  await upsertSetting('integrations.clarity', { clarity_id: clarityId });
  await upsertSetting('integrations.yandex', { metrica_id: metricaId });

  // Layout.astro getSiteSetting cache'ini invalidate et
  await deleteCachePattern('site_setting:integrations.*').catch(() => null);

  logger.info('Marketing settings updated', { admin: locals.user.id });

  return redirect('/admin/settings/marketing?saved=1');
 } catch (err) {
  logger.error('Marketing settings save failed', err instanceof Error ? err : new Error(String(err)));
  return new Response('Internal error', { status: 500 });
 }
};

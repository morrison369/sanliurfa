import type { APIRoute } from 'astro';
import { apiResponse } from '../../../../../lib/api';
import { SITE_SETTING_SCHEMAS } from '../../../../../lib/site-settings-schema';

function json(data: unknown, status = 200) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);
  return json({ success: true, schemas: SITE_SETTING_SCHEMAS });
};

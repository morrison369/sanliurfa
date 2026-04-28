import type { APIRoute } from 'astro';
import { apiResponse, safeErrorDetail } from '../../../../../lib/api';
import { auditSiteChange, publishSiteSetting, saveSiteSettingDraft } from '../../../../../lib/site-content';
import { findSitePresetById, SITE_CONTENT_PRESETS } from '../../../../../lib/site-content-presets';
import { validateSiteSetting } from '../../../../../lib/site-settings-schema';
import { validateSiteSettingWithZod } from '../../../../../lib/site-settings-zod';

function json(data: unknown, status = 200) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);
  return json({
    success: true,
    presets: SITE_CONTENT_PRESETS.map((preset) => ({
      id: preset.id,
      label: preset.label,
      description: preset.description,
      tags: preset.tags,
      keys: Object.keys(preset.settings),
    })),
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Gecersiz JSON' }, 400);
  }

  const presetId = String(body?.presetId || '').trim();
  const mode = body?.mode === 'draft' ? 'draft' : 'publish';
  const note = body?.note ? String(body.note) : `Preset apply: ${presetId}`;
  if (!presetId) return json({ error: 'presetId zorunludur' }, 400);

  const preset = findSitePresetById(presetId);
  if (!preset) return json({ error: 'Preset bulunamadi' }, 404);

  for (const [key, value] of Object.entries(preset.settings)) {
    const validation = validateSiteSetting(key, value);
    if (!validation.ok) {
      return json(
        {
          error: `Preset validasyonu basarisiz (${key}): ${
            'error' in validation ? validation.error : 'validation_failed'
          }`,
        },
        400,
      );
    }
    const zodValidation = validateSiteSettingWithZod(key, value);
    if (!zodValidation.ok) {
      return json(
        {
          error: `Preset zod validasyonu basarisiz (${key}): ${
            'error' in zodValidation ? zodValidation.error : 'zod_validation_failed'
          }`,
        },
        400,
      );
    }
  }

  const ctx = {
    userId: locals?.user?.id ? String(locals.user.id) : null,
    actorEmail: locals?.user?.email ? String(locals.user.email) : null,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    userAgent: request.headers.get('user-agent') || null,
  };

  try {
    for (const [key, value] of Object.entries(preset.settings)) {
      if (mode === 'draft') {
        await saveSiteSettingDraft(key, value, note, ctx.userId || null);
        await auditSiteChange(key, 'draft_save', ctx, { presetId, note, bulk: true });
      } else {
        await publishSiteSetting(key, value, `Preset ${preset.label}`, note, ctx);
      }
    }
    return json({
      success: true,
      presetId,
      mode,
      appliedKeys: Object.keys(preset.settings),
    });
  } catch (error) {
    return json(
      {
        success: false,
        error: safeErrorDetail(error, 'preset apply failed'),
      },
      500,
    );
  }
};

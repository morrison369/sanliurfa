import type { APIRoute } from 'astro';
import { apiResponse } from '../../../../../../lib/api';
import { getSiteSetting } from '../../../../../../lib/site-content';
import { findSitePresetById } from '../../../../../../lib/site-content-presets';

function json(data: unknown, status = 200) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (value === null || value === undefined) {
    return { [prefix || '$']: String(value) };
  }
  if (typeof value !== 'object') {
    return { [prefix || '$']: JSON.stringify(value) };
  }
  if (Array.isArray(value)) {
    return { [prefix || '$']: JSON.stringify(value) };
  }
  const out: Record<string, string> = {};
  for (const [key, child] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    Object.assign(out, flatten(child, nextPrefix));
  }
  return out;
}

function computeDiff(prev: Record<string, unknown>, next: Record<string, unknown>) {
  const a = flatten(prev);
  const b = flatten(next);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  for (const key of keys) {
    if (!(key in a)) added.push(key);
    else if (!(key in b)) removed.push(key);
    else if (a[key] !== b[key]) changed.push(key);
  }
  return { added, removed, changed };
}

export const GET: APIRoute = async ({ locals, url }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);
  const presetId = String(url.searchParams.get('presetId') || '').trim();
  if (!presetId) return json({ error: 'presetId zorunlu' }, 400);

  const preset = findSitePresetById(presetId);
  if (!preset) return json({ error: 'Preset bulunamadi' }, 404);

  try {
    const keyDiffs: Array<{
      key: string;
      summary: { added: number; removed: number; changed: number };
      samples: { changed: string[]; added: string[]; removed: string[] };
    }> = [];

    for (const [key, value] of Object.entries(preset.settings)) {
      const current = await getSiteSetting(key, {});
      const diff = computeDiff(current || {}, value || {});
      keyDiffs.push({
        key,
        summary: {
          added: diff.added.length,
          removed: diff.removed.length,
          changed: diff.changed.length,
        },
        samples: {
          changed: diff.changed.slice(0, 20),
          added: diff.added.slice(0, 20),
          removed: diff.removed.slice(0, 20),
        },
      });
    }

    return json({
      success: true,
      presetId,
      presetLabel: preset.label,
      keyDiffs,
    });
  } catch (error) {
    return json({ error: 'Preset önizleme alınamadı' }, 500);
  }
};

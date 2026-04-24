import type { APIRoute } from 'astro';
import { queryOne } from '../../../../../lib/postgres';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isAdmin(locals: any) {
  if (process.env.E2E_ADMIN_BYPASS === '1') return true;
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

type JsonObject = Record<string, any>;

function flatten(obj: JsonObject, prefix = '', out: Record<string, string> = {}) {
  const keys = Object.keys(obj || {});
  for (const key of keys) {
    const value = obj[key];
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, next, out);
      continue;
    }
    out[next] = JSON.stringify(value);
  }
  return out;
}

function buildDiff(fromValue: JsonObject, toValue: JsonObject) {
  const fromFlat = flatten(fromValue || {});
  const toFlat = flatten(toValue || {});
  const keys = Array.from(new Set([...Object.keys(fromFlat), ...Object.keys(toFlat)])).sort();

  const added: Array<{ path: string; next: string }> = [];
  const removed: Array<{ path: string; prev: string }> = [];
  const changed: Array<{ path: string; prev: string; next: string }> = [];

  for (const key of keys) {
    const prev = fromFlat[key];
    const next = toFlat[key];
    if (prev === undefined && next !== undefined) {
      added.push({ path: key, next });
      continue;
    }
    if (prev !== undefined && next === undefined) {
      removed.push({ path: key, prev });
      continue;
    }
    if (prev !== next) {
      changed.push({ path: key, prev: prev ?? 'null', next: next ?? 'null' });
    }
  }

  return { added, removed, changed };
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  const key = String(url.searchParams.get('key') || '').trim();
  const fromVersion = Number(url.searchParams.get('fromVersion'));
  const toVersion = Number(url.searchParams.get('toVersion'));

  if (!key) return json({ error: 'key zorunlu' }, 400);
  if (!Number.isInteger(fromVersion) || fromVersion < 1) return json({ error: 'fromVersion gecersiz' }, 400);
  if (!Number.isInteger(toVersion) || toVersion < 1) return json({ error: 'toVersion gecersiz' }, 400);

  try {
    const fromRow = await queryOne<{ setting_value: JsonObject }>(
      `
      SELECT setting_value
      FROM site_setting_versions
      WHERE setting_key = $1 AND version_no = $2
      `,
      [key, fromVersion],
    );
    const toRow = await queryOne<{ setting_value: JsonObject }>(
      `
      SELECT setting_value
      FROM site_setting_versions
      WHERE setting_key = $1 AND version_no = $2
      `,
      [key, toVersion],
    );

    if (!fromRow?.setting_value) return json({ error: 'fromVersion bulunamadi' }, 404);
    if (!toRow?.setting_value) return json({ error: 'toVersion bulunamadi' }, 404);

    const diff = buildDiff(fromRow.setting_value, toRow.setting_value);
    return json({
      success: true,
      key,
      fromVersion,
      toVersion,
      diff,
      summary: {
        added: diff.added.length,
        removed: diff.removed.length,
        changed: diff.changed.length,
      },
    });
  } catch (error) {
    return json(
      { success: false, error: error instanceof Error ? error.message : 'diff failed' },
      500,
    );
  }
};

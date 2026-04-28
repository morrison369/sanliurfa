import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { apiResponse } from '../../../../lib/api';

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

async function readJson(rel: string) {
  const full = path.join(process.cwd(), rel);
  if (!existsSync(full)) return null;
  try {
    return JSON.parse(await readFile(full, 'utf8'));
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return apiResponse({ error: 'Unauthorized' }, 401);
  return apiResponse({
    success: true,
    releaseStatus: await readJson('docs/release-status.json'),
    localGate: await readJson('docs/local-gate-summary.json'),
    releaseEvidence: await readJson('docs/release-evidence.json'),
    envDoctor: await readJson('docs/env-doctor-report.json'),
    opsLastRun: await readJson('docs/ops-last-run.json'),
    siteDoctor: await readJson('docs/site-doctor-report.json'),
    criticalPages: await readJson('docs/critical-pages-quality-report.json'),
  });
};

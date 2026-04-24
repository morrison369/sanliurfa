import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

function walkApiFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkApiFiles(full));
      continue;
    }
    if (!/\.(ts|js|mjs)$/.test(entry.name)) continue;
    if (full.endsWith(path.join('docs', 'openapi.json.ts'))) continue;
    files.push(full);
  }

  return files;
}

function filePathToApiRoute(filePath: string): string {
  const apiRoot = path.join(process.cwd(), 'src', 'pages', 'api');
  const rel = path.relative(apiRoot, filePath).replace(/\\/g, '/');
  let route = `/${rel.replace(/\.(ts|js|mjs)$/, '')}`;
  route = route.replace(/\/index$/, '');
  route = route.replace(/\[\.\.\.([^\]]+)\]/g, '{$1}');
  route = route.replace(/\[([^\]]+)\]/g, '{$1}');
  return route === '' ? '/' : route;
}

function normalizeDynamicSegments(route: string): string {
  return route.replace(/\{[^}]+\}/g, '{}').replace(/\/+$/, '');
}

describe('openapi path sync', () => {
  it('maps every documented OpenAPI path to a real api route file', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);

    const spec = await response.json();
    const specPaths = Object.keys(spec?.paths ?? {});
    expect(specPaths.length).toBeGreaterThan(0);

    const apiRoot = path.join(process.cwd(), 'src', 'pages', 'api');
    const fileRoutes = walkApiFiles(apiRoot).map(filePathToApiRoute);
    const normalizedFileRoutes = new Set(fileRoutes.map(normalizeDynamicSegments));

    const missing = specPaths.filter((specPath) => {
      return !normalizedFileRoutes.has(normalizeDynamicSegments(specPath));
    });

    expect(missing, `OpenAPI'de dosyası olmayan path(ler): ${missing.join(', ')}`).toEqual([]);
  });
});

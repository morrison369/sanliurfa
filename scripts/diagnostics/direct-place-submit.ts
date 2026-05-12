import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !process.env[key]) process.env[key] = value;
  }
}

const projectRoot = process.cwd();
for (const file of ['.env', '.env.local', '.env.production']) {
  loadEnvFile(path.join(projectRoot, file));
}

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const { submitPlaceApplication } = await import('../../src/lib/places/place-application');

try {
  const result = await submitPlaceApplication({
    name: 'Smoke Test Mekan',
    category: 'kafe',
    address: 'Test Mahallesi No:1',
    phone: '05000000000',
    shortDescription: 'Smoke test mekan onerisi',
    ownerName: 'Smoke Tester',
    ownerEmail: 'smoke@sanliurfa.com',
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        placeId: result.place.id,
        slug: result.place.slug,
        status: result.place.status,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error('DIRECT_PLACE_SUBMIT_ERROR');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
}

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fetchOfficialPharmacyDutyEntries, getLatestPharmacyDutyDate } from '../../src/lib/health/pharmacy-duty-source';

type DistrictRow = {
  id: number;
  name: string;
  slug: string;
};

function normalizeAscii(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugifyTr(value: string): string {
  return normalizeAscii(value);
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadRuntimeEnv() {
  const root = process.cwd();
  const candidates = [
    path.join(root, '.env.production'),
    path.join(root, '.env.local'),
    path.join(root, '.env'),
  ];
  for (const candidate of candidates) loadEnvFile(candidate);
}

function inferDistrictSlug(
  districtLabel: string | null,
  address: string,
  districtMap: Map<string, DistrictRow>,
): string | null {
  const normalizedLabel = normalizeAscii(districtLabel || '');
  if (normalizedLabel && districtMap.has(normalizedLabel)) {
    return normalizedLabel;
  }

  const normalizedAddress = normalizeAscii(address);
  for (const district of districtMap.values()) {
    if (normalizedAddress.includes(normalizeAscii(district.name)) || normalizedAddress.includes(district.slug)) {
      return district.slug;
    }
  }

  if (normalizedLabel === 'sanliurfa-merkez') {
    if (normalizedAddress.includes('haliliye')) return 'haliliye';
    if (normalizedAddress.includes('eyyubiye')) return 'eyyubiye';
    if (normalizedAddress.includes('karakopru')) return 'karakopru';
  }

  return null;
}

async function upsertSetting(
  query: <T = any>(text: string, params?: any[]) => Promise<T>,
  key: string,
  value: Record<string, unknown>,
  description: string,
) {
  await query(
    `
    INSERT INTO site_settings (setting_key, setting_value, description, updated_at)
    VALUES ($1, $2::jsonb, $3, NOW())
    ON CONFLICT (setting_key)
    DO UPDATE SET
      setting_value = EXCLUDED.setting_value,
      description = EXCLUDED.description,
      updated_at = NOW()
    `,
    [key, JSON.stringify(value), description],
  );
}

async function main() {
  loadRuntimeEnv();

  const { pool, query, transaction } = await import('../../src/lib/postgres');

  const today = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const entries = await fetchOfficialPharmacyDutyEntries();
  const latestDutyDate = getLatestPharmacyDutyDate(entries) || today;
  const hasExplicitDutyDates = entries.some((entry) => Boolean(entry.dutyDate));
  const districtRows = await query<DistrictRow>(
    `SELECT id, name, slug FROM districts ORDER BY is_central DESC, sort_order ASC, name ASC`,
  );
  const districtMap = new Map(
    districtRows.rows.map((row) => [normalizeAscii(row.slug || row.name), row]),
  );

  const uniqueEntries = new Map<string, (typeof entries)[number]>();
  for (const entry of entries) {
    const key = `${entry.name.toLocaleLowerCase('tr-TR')}|${entry.address.toLocaleLowerCase('tr-TR')}`;
    if (!uniqueEntries.has(key)) {
      uniqueEntries.set(key, entry);
    }
  }

  let onDutyCount = 0;

  await transaction(async (client) => {
    await client.query(`UPDATE pharmacies SET is_on_duty = false WHERE is_on_duty = true`);

    for (const entry of uniqueEntries.values()) {
      const districtSlug = inferDistrictSlug(entry.districtLabel, entry.address, districtMap);
      const districtId = districtSlug ? districtMap.get(districtSlug)?.id || null : null;
      const dutyDate = entry.dutyDate || latestDutyDate;
      const isOnDuty = hasExplicitDutyDates ? dutyDate === latestDutyDate : true;

      if (isOnDuty) {
        onDutyCount += 1;
      }

      const existing = await client.query<{ id: number }>(
        `SELECT id
         FROM pharmacies
         WHERE LOWER(name) = LOWER($1)
           AND LOWER(address) = LOWER($2)
         LIMIT 1`,
        [entry.name, entry.address],
      );

      const params = [
        entry.name,
        slugifyTr(entry.name),
        entry.address,
        entry.phone || null,
        districtId,
        entry.latitude,
        entry.longitude,
        dutyDate,
        isOnDuty,
      ];

      if (existing.rows[0]?.id) {
        await client.query(
          `UPDATE pharmacies
           SET name = $1,
               slug = $2,
               address = $3,
               phone = $4,
               district_id = $5,
               latitude = $6,
               longitude = $7,
               duty_date = $8,
               is_on_duty = $9,
               updated_at = NOW()
           WHERE id = $10`,
          [...params, existing.rows[0].id],
        );
      } else {
        await client.query(
          `INSERT INTO pharmacies (
             name,
             slug,
             address,
             phone,
             district_id,
             latitude,
             longitude,
             duty_date,
             is_on_duty,
             created_at,
             updated_at
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
          params,
        );
      }
    }
  });

  const staleDays = Math.max(
    0,
    Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${latestDutyDate}T00:00:00Z`)) / 86400000),
  );
  const sourceStale = latestDutyDate !== today;

  await upsertSetting(
    query,
    'pharmacy.lastUpdated',
    {
      updatedAt: latestDutyDate,
      fetchedAt,
      latestDutyDate,
      sourceStale,
      staleDays,
      parsedCount: uniqueEntries.size,
      onDutyCount,
      source: 'sanliurfa-eczaci-odasi',
    },
    'Şanlıurfa nöbetçi eczane ingest metadatası',
  );

  console.log(
    `pharmacy refresh completed: parsed=${uniqueEntries.size} latest=${latestDutyDate} onDuty=${onDutyCount} stale=${sourceStale ? '1' : '0'}`,
  );
}

main()
  .catch((error) => {
    console.error(`pharmacy refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  })
  .finally(async () => {
    const { pool } = await import('../../src/lib/postgres');
    await pool.end();
  });

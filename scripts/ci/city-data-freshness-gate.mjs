#!/usr/bin/env node
import process from 'node:process';

const PROD_BASE_URL = process.env.PROD_BASE_URL || process.env.SITE_URL || 'https://sanliurfa.com';
const mode = process.argv.includes('--prod')
  ? 'prod'
  : process.argv.includes('--pages')
    ? 'local-pages'
    : process.env.CITY_DATA_FRESHNESS_MODE || 'local-db';
const LOCAL_BASE_URL = process.env.CITY_DATA_BASE_URL || 'http://127.0.0.1:4321';
const maxAgeHours = Math.max(1, Number(process.env.CITY_DATA_MAX_AGE_HOURS || '36'));

const requiredSettings = [
  {
    key: 'weather.lastUpdated',
    dateFields: ['updatedAt'],
    minCountField: null,
    label: 'hava durumu',
  },
  {
    key: 'transport.lastUpdated',
    dateFields: ['updatedAt'],
    minCountField: null,
    label: 'ulaşım',
  },
  {
    key: 'pharmacy.lastUpdated',
    dateFields: ['fetchedAt', 'updatedAt', 'latestDutyDate'],
    minCountField: 'onDutyCount',
    label: 'nöbetçi eczane',
  },
];

function fail(message, details = []) {
  console.error(`[city-data-freshness-gate] ${message}`);
  for (const detail of details) console.error(`- ${detail}`);
  process.exit(1);
}

function getDateValue(value, fields) {
  if (!value || typeof value !== 'object') return null;
  for (const field of fields) {
    const candidate = value[field];
    if (!candidate) continue;
    const parsed = new Date(String(candidate));
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  return null;
}

function validateRows(rows) {
  const byKey = new Map(rows.map((row) => [row.setting_key, row.setting_value]));
  const errors = [];

  for (const item of requiredSettings) {
    const value = byKey.get(item.key);
    if (!value) {
      errors.push(`${item.label}: ${item.key} kaydı yok`);
      continue;
    }

    const date = getDateValue(value, item.dateFields);
    if (!date) {
      errors.push(`${item.label}: geçerli tarih alanı yok (${item.dateFields.join(', ')})`);
      continue;
    }

    const ageHours = (Date.now() - date.getTime()) / 36e5;
    if (ageHours > maxAgeHours) {
      errors.push(`${item.label}: stale (${ageHours.toFixed(1)} saat, limit ${maxAgeHours} saat)`);
    }

    if (item.minCountField) {
      const count = Number(value[item.minCountField] || 0);
      if (count <= 0) {
        errors.push(`${item.label}: ${item.minCountField} boş veya sıfır`);
      }
    }
  }

  if (errors.length > 0) fail('şehir verisi freshness kontrolü başarısız', errors);
}

async function loadFromLocalDb() {
  const { query, pool } = await import('../../src/lib/postgres.ts');
  try {
    const result = await query(
      `SELECT setting_key, setting_value
       FROM site_settings
       WHERE setting_key = ANY($1::text[])`,
      [requiredSettings.map((item) => item.key)],
    );
    return result.rows;
  } finally {
    await pool.end();
  }
}

async function loadFromPages(baseUrl) {
  const probes = [
    { route: '/saglik/nobetci-eczaneler', label: 'nöbetçi eczane', pattern: /eczane|nöbetçi|nobetci/i },
    { route: '/ulasim/otobus-saatleri', label: 'otobüs saatleri', pattern: /otobüs|otobus|hat|saat/i },
    { route: '/ulasim/ucak-saatleri', label: 'uçak saatleri', pattern: /uçak|ucak|hava|saat/i },
  ];
  const errors = [];
  for (const probe of probes) {
    const url = new URL(probe.route, baseUrl);
    const response = await fetch(url, {
      headers: { Accept: 'text/html', 'Cache-Control': 'no-cache' },
    });
    const body = await response.text();
    if (response.status < 200 || response.status >= 400) {
      errors.push(`${probe.label}: HTTP ${response.status}`);
    } else if (!probe.pattern.test(body)) {
      errors.push(`${probe.label}: beklenen içerik izi bulunamadı`);
    }
  }
  if (errors.length > 0) fail('prod şehir veri sayfaları başarısız', errors);
  return [];
}

async function main() {
  if (mode === 'prod') {
    await loadFromPages(PROD_BASE_URL);
    console.log(`city-data-freshness-gate: PASS (${mode}, ${PROD_BASE_URL})`);
    return;
  }

  if (mode === 'local-pages') {
    await loadFromPages(LOCAL_BASE_URL);
    console.log(`city-data-freshness-gate: PASS (${mode}, ${LOCAL_BASE_URL})`);
    return;
  }

  const rows = await loadFromLocalDb();
  validateRows(rows);
  console.log(`city-data-freshness-gate: PASS (${mode}, maxAgeHours=${maxAgeHours})`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});

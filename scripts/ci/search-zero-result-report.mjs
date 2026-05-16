#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import {
  buildResolvablePlaceKeys,
  getAutoResolvedZeroResultRows,
} from './search-zero-result-report-helpers.mjs';

const { Pool } = pg;
const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'search-zero-result-report.json');
const outMd = path.join(docsDir, 'search-zero-result-report.md');

const DATABASE_URL = process.env.DATABASE_URL
  || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'sanliurfa'}`;

function writeReport(report) {
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [
    '# Search Zero Result Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
  ];

  if (report.status !== 'ok') {
    lines.push(`- Detail: ${report.detail}`);
    lines.push('');
    fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');
    return;
  }

  lines.push(`- Unresolved query count: ${report.summary.unresolvedCount}`);
  lines.push(`- Total unresolved occurrences: ${report.summary.unresolvedOccurrences}`);
  lines.push(`- Resolved query count: ${report.summary.resolvedCount}`);
  lines.push(`- Auto-resolved this run: ${report.summary.autoResolvedThisRun}`);
  lines.push('');
  lines.push('## Top Unresolved Queries');
  lines.push('');
  lines.push('| Query | Type | Occurrences | Resolved |');
  lines.push('|---|---|---:|---|');
  if (report.topUnresolved.length > 0) {
    lines.push(...report.topUnresolved.map((row) => `| ${row.searchQuery} | ${row.searchType} | ${row.occurrenceCount} | ${row.isResolved} |`));
  } else {
    lines.push('| - | - | 0 | - |');
  }
  lines.push('');
  lines.push('## Unresolved by Type');
  lines.push('');
  lines.push('| Type | Query Count | Total Occurrences |');
  lines.push('|---|---:|---:|');
  if (report.byType.length > 0) {
    lines.push(...report.byType.map((row) => `| ${row.searchType} | ${row.queryCount} | ${row.totalOccurrences} |`));
  } else {
    lines.push('| - | 0 | 0 |');
  }
  lines.push('');

  fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');
}

function getContentPlaceSlugs() {
  const contentDir = path.join(root, 'src', 'content', 'places');
  if (!fs.existsSync(contentDir)) {
    return [];
  }

  return fs
    .readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(md|mdx)$/i.test(entry.name))
    .map((entry) => path.parse(entry.name).name);
}

async function getPlaceRows(pool) {
  try {
    const result = await pool.query(`
      SELECT slug, name
      FROM places
      WHERE COALESCE(slug, '') <> '' OR COALESCE(name, '') <> ''
    `);
    return result.rows;
  } catch {
    return [];
  }
}

async function reconcileResolvedQueries(pool) {
  const unresolvedRows = await pool.query(`
    SELECT id, search_query, COALESCE(search_type, 'places') AS search_type
    FROM zero_result_searches
    WHERE COALESCE(is_resolved, false) = false
  `);

  if (unresolvedRows.rows.length === 0) {
    return 0;
  }

  const [placeRows, contentPlaceSlugs] = await Promise.all([
    getPlaceRows(pool),
    Promise.resolve(getContentPlaceSlugs()),
  ]);
  const resolvablePlaceKeys = buildResolvablePlaceKeys({ placeRows, contentPlaceSlugs });
  const autoResolvedRows = getAutoResolvedZeroResultRows(unresolvedRows.rows, resolvablePlaceKeys);

  if (autoResolvedRows.length === 0) {
    return 0;
  }

  await pool.query(
    `
      UPDATE zero_result_searches
      SET
        is_resolved = true,
        resolution_notes = CASE
          WHEN COALESCE(NULLIF(resolution_notes, ''), '') = '' THEN $2
          ELSE resolution_notes
        END,
        updated_at = NOW()
      WHERE id = ANY($1::uuid[])
    `,
    [
      autoResolvedRows.map((row) => row.id),
      'auto-resolved by search corpus match',
    ],
  );

  return autoResolvedRows.length;
}

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    status: 'unavailable',
    detail: '',
    summary: {
      unresolvedCount: 0,
      unresolvedOccurrences: 0,
      resolvedCount: 0,
      autoResolvedThisRun: 0,
    },
    topUnresolved: [],
    byType: [],
  };

  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  });

  try {
    report.summary.autoResolvedThisRun = await reconcileResolvedQueries(pool);

    const [summaryResult, unresolvedResult, byTypeResult] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(DISTINCT LOWER(BTRIM(search_query)) || '::' || COALESCE(search_type, 'places'))
            FILTER (WHERE COALESCE(is_resolved, false) = false)::int AS unresolved_count,
          COALESCE(SUM(occurrence_count) FILTER (WHERE COALESCE(is_resolved, false) = false), 0)::int AS unresolved_occurrences,
          COUNT(DISTINCT LOWER(BTRIM(search_query)) || '::' || COALESCE(search_type, 'places'))
            FILTER (WHERE COALESCE(is_resolved, false) = true)::int AS resolved_count
        FROM zero_result_searches
      `),
      pool.query(`
        SELECT
          LOWER(BTRIM(search_query)) AS search_query,
          COALESCE(search_type, 'places') AS search_type,
          COALESCE(SUM(occurrence_count), 0)::int AS occurrence_count,
          false AS is_resolved
        FROM zero_result_searches
        WHERE COALESCE(is_resolved, false) = false
        GROUP BY LOWER(BTRIM(search_query)), COALESCE(search_type, 'places')
        ORDER BY occurrence_count DESC, search_query ASC
        LIMIT 25
      `),
      pool.query(`
        SELECT
          COALESCE(search_type, 'places') AS search_type,
          COUNT(DISTINCT LOWER(BTRIM(search_query)))::int AS query_count,
          COALESCE(SUM(occurrence_count), 0)::int AS total_occurrences
        FROM zero_result_searches
        WHERE COALESCE(is_resolved, false) = false
        GROUP BY COALESCE(search_type, 'places')
        ORDER BY total_occurrences DESC, search_type ASC
      `),
    ]);

    report.status = 'ok';
    report.summary = {
      unresolvedCount: Number(summaryResult.rows[0]?.unresolved_count || 0),
      unresolvedOccurrences: Number(summaryResult.rows[0]?.unresolved_occurrences || 0),
      resolvedCount: Number(summaryResult.rows[0]?.resolved_count || 0),
      autoResolvedThisRun: report.summary.autoResolvedThisRun,
    };
    report.topUnresolved = unresolvedResult.rows.map((row) => ({
      searchQuery: row.search_query,
      searchType: row.search_type,
      occurrenceCount: Number(row.occurrence_count || 0),
      isResolved: Boolean(row.is_resolved),
    }));
    report.byType = byTypeResult.rows.map((row) => ({
      searchType: row.search_type,
      queryCount: Number(row.query_count || 0),
      totalOccurrences: Number(row.total_occurrences || 0),
    }));
  } catch (error) {
    report.status = 'unavailable';
    report.detail = error instanceof Error ? error.message : String(error);
  } finally {
    await pool.end().catch(() => null);
  }

  writeReport(report);
  console.log(`search-zero-result-report: ${report.status.toUpperCase()}`);
}

main().catch((error) => {
  writeReport({
    generatedAt: new Date().toISOString(),
    status: 'unavailable',
    detail: error instanceof Error ? error.message : String(error),
    summary: {
      unresolvedCount: 0,
      unresolvedOccurrences: 0,
      resolvedCount: 0,
      autoResolvedThisRun: 0,
    },
    topUnresolved: [],
    byType: [],
  });
  console.log('search-zero-result-report: UNAVAILABLE');
});

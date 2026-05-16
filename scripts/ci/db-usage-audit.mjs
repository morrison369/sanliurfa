#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'db-usage-audit.json');
const outMd = path.join(docsDir, 'db-usage-audit.md');
const envFiles = ['.env', '.env.local', '.env.production', path.join('scripts', '.env.scripts')];

const coreSurfacePatterns = [
  /^advertisements$/,
  /^activity_/,
  /^alert_/,
  /^bonus_/,
  /^bus_/,
  /^categories$/,
  /^category_/,
  /^users?$/,
  /^places$/,
  /^place_/,
  /^reviews?$/,
  /^review_/,
  /^events$/,
  /^event_/,
  /^blog_/,
  /^blocked_/,
  /^billing_/,
  /^business_/,
  /^campaigns$/,
  /^chat_/,
  /^city_content_/,
  /^claims?$/,
  /^cohort_/,
  /^collaboration_/,
  /^comment_/,
  /^content_/,
  /^contact_/,
  /^conversation/,
  /^coupons$/,
  /^daily_stats$/,
  /^dashboards$/,
  /^direct_messages$/,
  /^discount_codes$/,
  /^discovery_/,
  /^districts$/,
  /^earning_/,
  /^edit_/,
  /^email_/,
  /^engagement_/,
  /^fact_/,
  /^feature_/,
  /^featured_listing/,
  /^follow_requests$/,
  /^foods$/,
  /^recipes$/,
  /^historical_sites$/,
  /^homepage_/,
  /^image_/,
  /^interactions$/,
  /^invoices$/,
  /^leaderboard/,
  /^marketing_/,
  /^media_/,
  /^memberships$/,
  /^mention_/,
  /^message_/,
  /^moderation/,
  /^neighborhoods$/,
  /^muted_/,
  /^notifications?$/,
  /^notification_/,
  /^payment_/,
  /^payments$/,
  /^phone_/,
  /^photo_/,
  /^place_claims$/,
  /^points_/,
  /^popular_places$/,
  /^popular_search_/,
  /^privacy_/,
  /^promotion_/,
  /^promotional_offers$/,
  /^promotions$/,
  /^push_/,
  /^refund_/,
  /^report/,
  /^response_/,
  /^reward_/,
  /^rewards/,
  /^roles$/,
  /^role_/,
  /^s3_/,
  /^saved_/,
  /^search_/,
  /^security_/,
  /^segment_/,
  /^seo_/,
  /^share_/,
  /^shares$/,
  /^site_settings$/,
  /^site_/,
  /^social_/,
  /^stripe_/,
  /^support_/,
  /^subscription_/,
  /^tenants$/,
  /^ticket_/,
  /^tier_/,
  /^tracked_/,
  /^trusted_/,
  /^two_/,
  /^vendor_/,
  /^video_/,
  /^comments?$/,
  /^favorites$/,
  /^user_/,
  /^community_/,
  /^collection_/,
  /^collections$/,
  /^followers$/,
  /^follows$/,
  /^loyalty_/,
  /^messages?$/,
  /^match/,
  /^reservation/,
  /^transport_/,
  /^weather_/,
  /^pharm/,
  /^webhooks?/,
  /^subscriptions?$/,
];

const opsRuntimePatterns = [
  /^admin_/,
  /^api_/,
  /^audit_/,
  /^audit_logs$/,
  /^backup_/,
  /^bulk_/,
  /^client_errors$/,
  /^schema_migrations$/,
  /^migration_tracking$/,
  /^client_performance_metrics$/,
  /^cron_/,
  /^csp_/,
  /^dashboard_/,
  /^data_deletion_/,
  /^ddos_/,
  /^encrypted_/,
  /^encryption_/,
  /^error_/,
  /^export_/,
  /^file_/,
  /^health_/,
  /^ip_/,
  /^job_/,
  /^login_/,
  /^metric_/,
  /^migrations$/,
  /^oauth_/,
  /^performance_/,
  /^permissions$/,
  /^rate_limit_/,
  /^request_/,
  /^scheduled_/,
  /^smoke_/,
  /^sms_/,
  /^ssr_perf_metrics$/,
  /^system_/,
  /^tenant_/,
  /^zero_result_searches$/,
  /^autocomplete_index$/,
  /^search_suggestions$/,
  /^ops_/,
  /^ux_/,
  /^webhook_/,
];

const speculativeOrLegacyPatterns = [
  /^ab_test_/,
  /^account_deletions$/,
  /^account_flags$/,
  /^achievement_/,
  /^achievements$/,
  /^action_suggestions$/,
  /^active_alerts$/,
  /^ai_/,
  /^analytics_/,
  /^anomalies$/,
  /^archived_/,
  /^attribution_/,
  /^automation_/,
  /^badges?$/,
  /^badge_/,
  /^campaign_/,
  /^cdn_/,
  /^competitor_/,
  /^conversion/,
  /^content_intelligence_/,
  /^data_segments$/,
  /^dim_/,
  /^drip_/,
  /^funnel_/,
  /^hashtag/,
  /^heatmap_/,
  /^journey_/,
  /^keyword_/,
  /^kpi_/,
  /^newsletter_/,
  /^olap_/,
  /^onboarding_/,
  /^owner_/,
  /^page_views$/,
  /^personalized_/,
  /^predictive_/,
  /^publishing_/,
  /^ranking_/,
  /^recommendation_/,
  /^retention_/,
  /^satisfaction_/,
  /^seasonality_/,
  /^template_/,
  /^transcoding_/,
  /^trend/,
  /^visitor_/,
  /^warehouse_/,
  /^workflow_/,
  /^payout_/,
  /^supplier_/,
  /^vendor_analytics/,
  /^revenue_intelligence_/,
];

function stripSchema(tableName) {
  return String(tableName || '').replace(/^[^.]+\./, '');
}

function hasObservedActivity(table) {
  return (
    table.liveRows > 0 ||
    table.seqScan > 0 ||
    table.idxScan > 0 ||
    table.inserts > 0 ||
    table.updates > 0 ||
    table.deletes > 0
  );
}

function matchAny(name, patterns) {
  return patterns.some((pattern) => pattern.test(name));
}

function classifyTable(table) {
  const bareName = stripSchema(table.table);

  if (matchAny(bareName, speculativeOrLegacyPatterns)) {
    return 'speculative_or_legacy';
  }
  if (matchAny(bareName, opsRuntimePatterns)) {
    return 'ops_runtime';
  }
  if (matchAny(bareName, coreSurfacePatterns)) {
    return 'core_surface';
  }

  return 'unclassified';
}

function loadEnvFiles() {
  for (const relPath of envFiles) {
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    for (const rawLine of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) {
        continue;
      }

      const [key, ...valueParts] = line.split('=');
      const name = key.trim();
      if (!name || process.env[name] !== undefined) {
        continue;
      }

      let value = valueParts.join('=').trim();
      value = value.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
      process.env[name] = value;
    }
  }
}

function connectionInfo(connectionString, source) {
  try {
    const url = new URL(connectionString);
    return {
      source,
      host: url.hostname || 'unknown',
      port: url.port || '5432',
      database: url.pathname.replace(/^\//, '') || 'unknown',
    };
  } catch {
    return {
      source,
      host: 'unparseable',
      port: 'unknown',
      database: 'unknown',
    };
  }
}

loadEnvFiles();

const configuredDatabaseUrl = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL;
const configuredDatabaseSource = process.env.DATABASE_URL
  ? 'DATABASE_URL'
  : process.env.PROD_DATABASE_URL
    ? 'PROD_DATABASE_URL'
    : 'local-default';
const DATABASE_URL = configuredDatabaseUrl
  || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'sanliurfa'}`;

function writeReport(report) {
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [
    '# DB Usage Audit',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
  ];

  if (report.status !== 'ok') {
    if (report.database) {
      lines.push(`- Database source: ${report.database.source}`);
      lines.push(`- Database target: ${report.database.host}:${report.database.port}/${report.database.database}`);
    }
    lines.push(`- Detail: ${report.detail}`);
    lines.push('');
    fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');
    return;
  }

  lines.push(`- Database source: ${report.database.source}`);
  lines.push(`- Database target: ${report.database.host}:${report.database.port}/${report.database.database}`);
  lines.push(`- Table count: ${report.summary.tableCount}`);
  lines.push(`- Index count: ${report.summary.indexCount}`);
  lines.push(`- Active tables: ${report.summary.activeTableCount}`);
  lines.push(`- Zero-row tables: ${report.summary.zeroRowTableCount}`);
  lines.push(`- Zero-row no-activity tables: ${report.summary.zeroRowNoActivityCount}`);
  lines.push(`- Cold tables: ${report.summary.coldTableCount}`);
  lines.push(`- Zero-scan indexes: ${report.summary.zeroScanIndexCount}`);
  lines.push(`- Protected zero-scan indexes: ${report.summary.protectedZeroScanIndexCount}`);
  lines.push(`- Reviewable unused index candidates: ${report.summary.unusedIndexCount}`);
  lines.push(`- Speculative/legacy zero-row candidates: ${report.summary.speculativeCandidateCount}`);
  lines.push(`- Unclassified zero-row review sample: ${report.summary.unclassifiedZeroRowCount}`);
  lines.push('');
  lines.push('## Classification Summary');
  lines.push('');
  lines.push('| Bucket | Table Count |');
  lines.push('|---|---:|');
  lines.push(`| core_surface | ${report.classification.coreSurfaceCount} |`);
  lines.push(`| ops_runtime | ${report.classification.opsRuntimeCount} |`);
  lines.push(`| speculative_or_legacy | ${report.classification.speculativeOrLegacyCount} |`);
  lines.push(`| unclassified | ${report.classification.unclassifiedCount} |`);
  lines.push('');
  lines.push('## Largest Tables');
  lines.push('');
  lines.push('| Table | Estimated Rows | Seq Scan | Idx Scan |');
  lines.push('|---|---:|---:|---:|');
  lines.push(...report.largestTables.map((table) => `| ${table.table} | ${table.liveRows} | ${table.seqScan} | ${table.idxScan} |`));
  lines.push('');
  lines.push('## Active Core Tables');
  lines.push('');
  lines.push('| Table | Estimated Rows | Inserts | Updates |');
  lines.push('|---|---:|---:|---:|');
  lines.push(...report.activeCoreTables.map((table) => `| ${table.table} | ${table.liveRows} | ${table.inserts} | ${table.updates} |`));
  lines.push('');
  lines.push('## Cold Non-Empty Tables');
  lines.push('');
  lines.push('| Table | Estimated Rows | Inserts | Updates | Deletes |');
  lines.push('|---|---:|---:|---:|---:|');
  lines.push(...report.coldTables.map((table) => `| ${table.table} | ${table.liveRows} | ${table.inserts} | ${table.updates} | ${table.deletes} |`));
  lines.push('');
  lines.push('## Speculative / Legacy Zero-Row Candidates');
  lines.push('');
  lines.push('| Table | Bucket |');
  lines.push('|---|---|');
  lines.push(...report.speculativeCandidates.map((table) => `| ${table.table} | ${table.bucket} |`));
  lines.push('');
  lines.push('## Retirement Plan');
  lines.push('');
  lines.push('- Drop islemi otomatik yapilmaz; production once en az 14 gun usage gozlemi gerekir.');
  lines.push('- P0: speculative_or_legacy bucket + zero row + no activity tablolar.');
  lines.push('- P1: unclassified zero-row no-activity tablolar; once kod referansi ve migration sahipligi dogrulanir.');
  lines.push('- P2: unique/constraint olmayan zero-scan index adaylari; query plan ve 14 gun production gozlemi olmadan drop yapilmaz.');
  lines.push('');
  lines.push('| Priority | Count | Action |');
  lines.push('|---|---:|---|');
  lines.push(`| P0 | ${report.retirementPlan.p0DropCandidateCount} | quarantine/drop migration adayi |`);
  lines.push(`| P1 | ${report.retirementPlan.p1ReviewCandidateCount} | ownership ve code-reference review |`);
  lines.push(`| P2 | ${report.retirementPlan.p2UnusedIndexCandidateCount} | index usage gozlem ve EXPLAIN review |`);
  lines.push('');
  lines.push('### P0 Drop Candidate Sample');
  lines.push('');
  lines.push('| Table | Reason |');
  lines.push('|---|---|');
  lines.push(...report.retirementPlan.p0DropCandidates.map((table) => `| ${table.table} | ${table.reason} |`));
  lines.push('');
  lines.push('## Unclassified Zero-Row Review Sample');
  lines.push('');
  lines.push('| Table | Bucket |');
  lines.push('|---|---|');
  lines.push(...report.unclassifiedZeroRowSample.map((table) => `| ${table.table} | ${table.bucket} |`));
  lines.push('');
  lines.push('## Reviewable Unused Index Candidates');
  lines.push('');
  lines.push('| Index | Table | Size MB | idx_scan | Protected |');
  lines.push('|---|---|---:|---:|---|');
  lines.push(...report.unusedIndexes.map((index) => `| ${index.index} | ${index.table} | ${index.sizeMb} | ${index.idxScan} | ${index.protected ? 'yes' : 'no'} |`));
  lines.push('');
  lines.push('## Protected Zero-Scan Index Sample');
  lines.push('');
  lines.push('| Index | Table | Size MB | Protection |');
  lines.push('|---|---|---:|---|');
  lines.push(...report.protectedZeroScanIndexes.map((index) => `| ${index.index} | ${index.table} | ${index.sizeMb} | ${index.protection} |`));
  lines.push('');

  fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    status: 'unavailable',
    detail: '',
    database: connectionInfo(DATABASE_URL, configuredDatabaseSource),
    summary: {
      tableCount: 0,
      indexCount: 0,
      activeTableCount: 0,
      zeroRowTableCount: 0,
      zeroRowNoActivityCount: 0,
      coldTableCount: 0,
      zeroScanIndexCount: 0,
      protectedZeroScanIndexCount: 0,
      unusedIndexCount: 0,
      speculativeCandidateCount: 0,
      unclassifiedZeroRowCount: 0,
    },
    classification: {
      coreSurfaceCount: 0,
      opsRuntimeCount: 0,
      speculativeOrLegacyCount: 0,
      unclassifiedCount: 0,
    },
    largestTables: [],
    activeCoreTables: [],
    coldTables: [],
    speculativeCandidates: [],
    unclassifiedZeroRowSample: [],
    unusedIndexes: [],
    unusedIndexInventory: [],
    protectedZeroScanIndexes: [],
    protectedZeroScanIndexInventory: [],
    retirementPlan: {
      p0DropCandidateCount: 0,
      p1ReviewCandidateCount: 0,
      p2UnusedIndexCandidateCount: 0,
      p0DropCandidates: [],
      p1ReviewCandidates: [],
      p2UnusedIndexCandidates: [],
    },
  };

  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  });

  try {
    const [tableStats, indexStats] = await Promise.all([
      pool.query(`
        SELECT
          schemaname,
          relname AS table_name,
          n_live_tup::bigint AS live_rows,
          seq_scan::bigint AS seq_scan,
          idx_scan::bigint AS idx_scan,
          n_tup_ins::bigint AS inserts,
          n_tup_upd::bigint AS updates,
          n_tup_del::bigint AS deletes
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC, relname ASC
      `),
      pool.query(`
        SELECT
          s.relname AS table_name,
          s.indexrelname AS index_name,
          s.idx_scan::bigint AS idx_scan,
          pg_relation_size(s.indexrelid)::bigint AS bytes,
          i.indisunique AS is_unique,
          c.contype AS constraint_type,
          c.conname AS constraint_name
        FROM pg_stat_user_indexes s
        JOIN pg_index i ON i.indexrelid = s.indexrelid
        LEFT JOIN pg_constraint c ON c.conindid = s.indexrelid
        WHERE NOT i.indisprimary
        ORDER BY s.idx_scan ASC, bytes DESC, s.indexrelname ASC
      `),
    ]);

    const tables = tableStats.rows.map((row) => ({
      table: `${row.schemaname}.${row.table_name}`,
      liveRows: Number(row.live_rows || 0),
      seqScan: Number(row.seq_scan || 0),
      idxScan: Number(row.idx_scan || 0),
      inserts: Number(row.inserts || 0),
      updates: Number(row.updates || 0),
      deletes: Number(row.deletes || 0),
      bucket: 'unclassified',
    })).map((table) => ({
      ...table,
      bucket: classifyTable(table),
    }));
    const indexes = indexStats.rows.map((row) => ({
      table: row.table_name,
      index: row.index_name,
      idxScan: Number(row.idx_scan || 0),
      bytes: Number(row.bytes || 0),
      sizeMb: Number((Number(row.bytes || 0) / 1024 / 1024).toFixed(2)),
      isUnique: row.is_unique === true,
      constraintType: row.constraint_type || null,
      constraintName: row.constraint_name || null,
      protected: row.is_unique === true || Boolean(row.constraint_type),
      protection: row.constraint_type
        ? `constraint:${row.constraint_type}`
        : row.is_unique === true
          ? 'unique'
          : 'none',
    }));

    report.status = 'ok';
    report.summary.tableCount = tables.length;
    report.summary.indexCount = indexes.length;
    report.summary.activeTableCount = tables.filter(hasObservedActivity).length;
    report.summary.zeroRowTableCount = tables.filter((table) => table.liveRows === 0).length;
    report.summary.zeroRowNoActivityCount = tables.filter(
      (table) => table.liveRows === 0 && !hasObservedActivity(table),
    ).length;
    const coldTables = tables.filter(
      (table) => table.liveRows > 0 && table.seqScan === 0 && table.idxScan === 0,
    );
    report.coldTables = coldTables.slice(0, 20);
    report.summary.coldTableCount = coldTables.length;
    const zeroScanIndexes = indexes.filter((index) => index.idxScan === 0);
    const protectedZeroScanIndexes = zeroScanIndexes.filter((index) => index.protected);
    const unusedIndexes = zeroScanIndexes.filter((index) => !index.protected);
    report.unusedIndexes = unusedIndexes.slice(0, 25);
    report.unusedIndexInventory = unusedIndexes;
    report.protectedZeroScanIndexes = protectedZeroScanIndexes.slice(0, 25);
    report.protectedZeroScanIndexInventory = protectedZeroScanIndexes;
    report.summary.zeroScanIndexCount = zeroScanIndexes.length;
    report.summary.protectedZeroScanIndexCount = protectedZeroScanIndexes.length;
    report.summary.unusedIndexCount = unusedIndexes.length;
    report.classification.coreSurfaceCount = tables.filter((table) => table.bucket === 'core_surface').length;
    report.classification.opsRuntimeCount = tables.filter((table) => table.bucket === 'ops_runtime').length;
    report.classification.speculativeOrLegacyCount = tables.filter((table) => table.bucket === 'speculative_or_legacy').length;
    report.classification.unclassifiedCount = tables.filter((table) => table.bucket === 'unclassified').length;
    report.activeCoreTables = tables
      .filter((table) => table.bucket === 'core_surface' && hasObservedActivity(table))
      .slice(0, 25);
    const speculativeCandidates = tables.filter(
      (table) => table.bucket === 'speculative_or_legacy' && table.liveRows === 0 && !hasObservedActivity(table),
    );
    report.speculativeCandidates = speculativeCandidates.slice(0, 30);
    report.summary.speculativeCandidateCount = speculativeCandidates.length;
    const unclassifiedZeroRow = tables.filter(
      (table) => table.bucket === 'unclassified' && table.liveRows === 0 && !hasObservedActivity(table),
    );
    report.unclassifiedZeroRowSample = unclassifiedZeroRow.slice(0, 30);
    report.summary.unclassifiedZeroRowCount = unclassifiedZeroRow.length;
    report.retirementPlan = {
      p0DropCandidateCount: speculativeCandidates.length,
      p1ReviewCandidateCount: unclassifiedZeroRow.length,
      p2UnusedIndexCandidateCount: unusedIndexes.length,
      p0DropCandidates: speculativeCandidates.slice(0, 20).map((table) => ({
        table: table.table,
        reason: 'speculative_or_legacy + zero rows + no observed activity',
      })),
      p1ReviewCandidates: unclassifiedZeroRow.slice(0, 20).map((table) => ({
        table: table.table,
        reason: 'unclassified + zero rows + no observed activity',
      })),
      p2UnusedIndexCandidates: unusedIndexes.slice(0, 20).map((index) => ({
        table: index.table,
        index: index.index,
        reason: 'idx_scan=0 and not unique/constraint protected in current stats',
      })),
    };
    report.largestTables = tables.slice(0, 20);
  } catch (error) {
    report.status = 'unavailable';
    report.detail = error instanceof Error ? error.message : String(error);
  } finally {
    await pool.end().catch(() => null);
  }

  writeReport(report);
  console.log(`db-usage-audit: ${report.status.toUpperCase()}`);
}

main().catch((error) => {
  const report = {
    generatedAt: new Date().toISOString(),
    status: 'unavailable',
    detail: error instanceof Error ? error.message : String(error),
    database: connectionInfo(DATABASE_URL, configuredDatabaseSource),
    summary: {
      tableCount: 0,
      indexCount: 0,
      activeTableCount: 0,
      zeroRowTableCount: 0,
      zeroRowNoActivityCount: 0,
      coldTableCount: 0,
      zeroScanIndexCount: 0,
      protectedZeroScanIndexCount: 0,
      unusedIndexCount: 0,
      speculativeCandidateCount: 0,
      unclassifiedZeroRowCount: 0,
    },
    classification: {
      coreSurfaceCount: 0,
      opsRuntimeCount: 0,
      speculativeOrLegacyCount: 0,
      unclassifiedCount: 0,
    },
    largestTables: [],
    activeCoreTables: [],
    coldTables: [],
    speculativeCandidates: [],
    unclassifiedZeroRowSample: [],
    unusedIndexes: [],
    unusedIndexInventory: [],
    protectedZeroScanIndexes: [],
    protectedZeroScanIndexInventory: [],
    retirementPlan: {
      p0DropCandidateCount: 0,
      p1ReviewCandidateCount: 0,
      p2UnusedIndexCandidateCount: 0,
      p0DropCandidates: [],
      p1ReviewCandidates: [],
      p2UnusedIndexCandidates: [],
    },
  };
  writeReport(report);
  console.log('db-usage-audit: UNAVAILABLE');
});

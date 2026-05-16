import fs from 'node:fs';
import path from 'node:path';

type GateIssue = {
  code: string;
  message: string;
  severity?: 'warning' | 'error';
  details?: Record<string, any>;
};

type QueryFn = <T = any>(text: string, params?: any[]) => Promise<{ rows: T[] }>;

let queryFn: QueryFn | null = null;
let poolRef: { end: () => Promise<void> } | null = null;

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

for (const file of ['.env', '.env.local', '.env.production']) {
  loadEnvFile(path.join(process.cwd(), file));
}

async function ensureDb() {
  if (queryFn && poolRef) return { queryFn, poolRef };
  const mod = await import('../../src/lib/postgres');
  queryFn = mod.query as QueryFn;
  poolRef = mod.pool as { end: () => Promise<void> };
  return { queryFn, poolRef };
}

const REQUIRED_ROUTES = [
  '/saglik/nobetci-eczaneler',
  '/ulasim/otobus-saatleri',
  '/ulasim/ucak-saatleri',
  '/mekanlar',
];

const REQUIRED_PAGE_FILES = [
  'src/pages/saglik/nobetci-eczaneler.astro',
  'src/pages/ulasim/otobus-saatleri.astro',
  'src/pages/ulasim/ucak-saatleri.astro',
  'src/pages/mekanlar/index.astro',
];

const REQUIRED_SCHEMA_HINTS: Record<string, string[]> = {
  'src/pages/saglik/nobetci-eczaneler.astro': ['application/ld+json', 'FAQPage'],
  'src/pages/ulasim/otobus-saatleri.astro': ['application/ld+json', 'FAQPage'],
  'src/pages/ulasim/ucak-saatleri.astro': ['application/ld+json', 'FAQPage'],
  'src/pages/mekanlar/index.astro': ['application/ld+json', 'FAQPage'],
};

const CITE_FRIENDLY_CUES = ['Hızlı Cevap', 'Not:', 'Güncel', 'Hızlı Erişim', 'Acil Durumda'];

function readLocalImagesCount(bucket: string): number {
  const dir = path.join(process.cwd(), 'public', 'images', bucket);
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir)
    .filter((name) => /\.(jpg|jpeg|png|webp)$/i.test(name))
    .length;
}

function readContentMarkdownCount(category: string): number {
  const dir = path.join(process.cwd(), 'src', 'content', category);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith('.md')).length;
}

async function getPrimaryActionsHrefs(): Promise<string[]> {
  const { queryFn } = await ensureDb();
  const result = await queryFn<{ setting_value: Record<string, any> }>(
    `SELECT setting_value FROM site_settings WHERE setting_key = 'homepage.primaryActions' LIMIT 1`,
  );
  const setting = result.rows[0]?.setting_value || {};
  const items = Array.isArray(setting.items) ? setting.items : [];
  return items.map((item: any) => String(item?.href || '')).filter(Boolean);
}

function countFaqQuestions(content: string): number {
  return (content.match(/\bq\s*:\s*['"`]/g) || []).length;
}

function hasCiteFriendlySignal(content: string): boolean {
  const hasCue = CITE_FRIENDLY_CUES.some((cue) => content.includes(cue));
  const hasNumericFact = /\d/.test(content);
  return hasCue && hasNumericFact;
}

async function main() {
  const issues: GateIssue[] = [];
  const generatedAt = new Date().toISOString();
  const pageChecks = REQUIRED_PAGE_FILES.map((filePath) => ({
    filePath,
    exists: fs.existsSync(path.join(process.cwd(), filePath)),
  }));

  for (const pageCheck of pageChecks) {
    if (!pageCheck.exists) {
      issues.push({
        code: 'missing_page_file',
        message: 'Zorunlu cluster sayfası eksik',
        details: { filePath: pageCheck.filePath },
      });
      continue;
    }

    const fullPath = path.join(process.cwd(), pageCheck.filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes('seo')) {
      issues.push({
        code: 'missing_seo_block',
        message: 'Sayfada SEO objesi/bağlantısı eksik',
        details: { filePath: pageCheck.filePath },
      });
    }
    const hasLayoutSeoBinding =
      content.includes('<Layout seo={seo}>') || /<ListingTemplate\s+seo=\{seo\}/.test(content);
    if (!hasLayoutSeoBinding) {
      issues.push({
        code: 'missing_layout_seo_binding',
        message: 'Layout seo binding bulunamadı',
        details: { filePath: pageCheck.filePath },
      });
    }

    const schemaHints = REQUIRED_SCHEMA_HINTS[pageCheck.filePath] || [];
    for (const hint of schemaHints) {
      if (!content.includes(hint)) {
        issues.push({
          code: 'missing_schema_hint',
          message: 'Schema/structured data izi eksik',
          details: { filePath: pageCheck.filePath, hint },
        });
      }
    }

    const faqQuestionCount = countFaqQuestions(content);
    if (faqQuestionCount < 3) {
      issues.push({
        code: 'weak_faq_block',
        message: 'FAQ bloğu zayıf: en az 3 soru-cevap zorunlu',
        details: { filePath: pageCheck.filePath, faqQuestionCount, expectedMin: 3 },
      });
    }

    if (!hasCiteFriendlySignal(content)) {
      issues.push({
        code: 'missing_cite_friendly_passage',
        message: 'AI arama görünürlüğü için cite-friendly pasaj izi bulunamadı',
        details: { filePath: pageCheck.filePath, requiredCues: CITE_FRIENDLY_CUES },
      });
    }
  }

  let primaryActionHrefs: string[] = [];
  let dbUnavailable = false;
  try {
    primaryActionHrefs = await getPrimaryActionsHrefs();
    for (const route of REQUIRED_ROUTES) {
      if (!primaryActionHrefs.includes(route)) {
        issues.push({
          code: 'missing_primary_action_route',
          message: 'homepage.primaryActions içinde zorunlu route eksik',
          details: { route },
        });
      }
    }
  } catch (error) {
    dbUnavailable = true;
    issues.push({
      code: 'db_read_failed',
      message: 'site_settings okunamadı',
      severity: 'warning',
      details: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  const localImageStats = {
    places: readLocalImagesCount('places'),
    blog: readLocalImagesCount('blog'),
    tarihiYerler: readLocalImagesCount('tarihi-yerler'),
    etkinlikler: readLocalImagesCount('etkinlikler'),
  };

  const placeContentCount = readContentMarkdownCount('places');
  const expectedPlacesMin = Math.max(4, placeContentCount * 2);

  if (localImageStats.places < expectedPlacesMin) {
      issues.push({
        code: 'insufficient_places_images',
        message: 'Places bucket görsel sayısı düşük',
        severity: 'warning',
        details: { count: localImageStats.places, expectedMin: expectedPlacesMin, placeContentCount },
      });
  }

  const report = {
    generatedAt,
    requiredRoutes: REQUIRED_ROUTES,
    pageChecks,
    primaryActionHrefs,
    localImageStats,
    dbUnavailable,
    issueCount: issues.length,
    issues,
  };

  const docsDir = path.join(process.cwd(), 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  const outJson = path.join(docsDir, 'content-cluster-quality-report.json');
  const outMd = path.join(docsDir, 'content-cluster-quality-report.md');

  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const lines: string[] = [];
  lines.push('# Content Cluster Quality Report');
  lines.push('');
  lines.push(`- Generated At: ${generatedAt}`);
  lines.push(`- Issue Count: ${issues.length}`);
  lines.push(`- Required Routes: ${REQUIRED_ROUTES.join(', ')}`);
  lines.push('');
  lines.push('## Image Stats');
  lines.push('');
  lines.push(`- places: ${localImageStats.places}`);
  lines.push(`- blog: ${localImageStats.blog}`);
  lines.push(`- tarihi-yerler: ${localImageStats.tarihiYerler}`);
  lines.push(`- etkinlikler: ${localImageStats.etkinlikler}`);
  lines.push('');
  if (issues.length > 0) {
    lines.push('## Issues');
    lines.push('');
    for (const issue of issues) {
      lines.push(`- [${issue.severity || 'error'}][${issue.code}] ${issue.message}`);
    }
  } else {
    lines.push('## Status');
    lines.push('');
    lines.push('- OK: Cluster kalite gate geçti.');
  }
  lines.push('');
  fs.writeFileSync(outMd, lines.join('\n'), 'utf8');

  console.log(`content cluster report: ${outJson}`);
  console.log(`content cluster markdown: ${outMd}`);

  const blockingIssues = issues.filter((issue) => (issue.severity || 'error') === 'error');
  if (blockingIssues.length > 0) process.exit(1);
}

main()
  .catch((error) => {
    console.error('content cluster quality gate failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    if (poolRef) {
      await poolRef.end();
    }
  });

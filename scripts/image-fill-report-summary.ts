import { readFileSync } from 'node:fs';
import path from 'node:path';

interface FailureEntry {
  bucket: 'places' | 'blog' | 'events';
  id: string;
  slug: string;
  title: string;
  attemptedQueries: string[];
  reason: string;
}

interface ImageFillReport {
  generatedAt: string;
  mode: 'dry-run' | 'write';
  type: 'places' | 'blog' | 'events' | 'all';
  limit: number;
  queryMode: 'strict' | 'expanded';
  totals: {
    scanned: number;
    filled: number;
    failed: number;
  };
  buckets: Record<'places' | 'blog' | 'events', { scanned: number; filled: number; failed: number }>;
  failures: FailureEntry[];
}

const reportJsonArg = process.argv.find((arg) => arg.startsWith('--report-json='))?.split('=')[1];
if (!reportJsonArg) {
  console.error('[images:report] --report-json=<path> parametresi zorunlu.');
  process.exit(1);
}

const reportPath = path.isAbsolute(reportJsonArg)
  ? reportJsonArg
  : path.join(process.cwd(), reportJsonArg);

let parsed: ImageFillReport;
try {
  parsed = JSON.parse(readFileSync(reportPath, 'utf8')) as ImageFillReport;
} catch (error) {
  console.error(`[images:report] rapor okunamadı: ${reportPath}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const reasonCount = new Map<string, number>();
for (const item of parsed.failures || []) {
  reasonCount.set(item.reason, (reasonCount.get(item.reason) || 0) + 1);
}
const topReasons = [...reasonCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

console.log(`[images:report] ${reportPath}
- mode=${parsed.mode}, type=${parsed.type}, queryMode=${parsed.queryMode}, limit=${parsed.limit}
- totals scanned=${parsed.totals.scanned} filled=${parsed.totals.filled} failed=${parsed.totals.failed}
- places: scanned=${parsed.buckets.places.scanned} filled=${parsed.buckets.places.filled} failed=${parsed.buckets.places.failed}
- blog: scanned=${parsed.buckets.blog.scanned} filled=${parsed.buckets.blog.filled} failed=${parsed.buckets.blog.failed}
- events: scanned=${parsed.buckets.events.scanned} filled=${parsed.buckets.events.filled} failed=${parsed.buckets.events.failed}`);

if (topReasons.length > 0) {
  console.log('[images:report] en sık hata nedenleri:');
  for (const [reason, count] of topReasons) {
    console.log(`- ${reason}: ${count}`);
  }
}

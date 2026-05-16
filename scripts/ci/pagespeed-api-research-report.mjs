#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'pagespeed-api-research-report.json');
const outMd = path.join(docsDir, 'pagespeed-api-research-report.md');
const project = process.env.GCLOUD_PROJECT || 'sanliurfa-com-2026';

function runOutput(command) {
  try {
    return execSync(command, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }).trim();
  } catch (error) {
    return `${error.stdout || ''}\n${error.stderr || ''}`.trim();
  }
}

const enabledServices = runOutput(`gcloud services list --enabled --project=${project} --format="value(config.name)"`)
  .split(/\r?\n/)
  .filter(Boolean);

const report = {
  generatedAt: new Date().toISOString(),
  status: enabledServices.includes('pagespeedonline.googleapis.com') ? 'ok' : 'review',
  project,
  service: {
    name: 'pagespeedonline.googleapis.com',
    enabled: enabledServices.includes('pagespeedonline.googleapis.com'),
  },
  officialDocs: {
    getStarted: 'https://developers.google.com/speed/docs/insights/v5/get-started',
    rest: 'https://developers.google.com/speed/docs/insights/rest',
    runPagespeed: 'https://developers.google.com/speed/docs/insights/rest/v5/pagespeedapi/runpagespeed',
    cruxApi: 'https://developer.chrome.com/docs/crux/api',
  },
  usagePolicy: {
    apiKey: 'Sık otomatik sorgu için API key önerilir; key yoksa da API Explorer/cURL ile test mümkündür.',
    categories: ['performance', 'accessibility', 'best-practices', 'seo'],
    strategies: ['mobile', 'desktop'],
    localStorageRule: 'PageSpeed sadece ölçüm için kullanılır; CDN veya object storage entegrasyonu yapmaz.',
    recommendedTargets: [
      'https://sanliurfa.com/',
      'https://sanliurfa.com/blog',
      'https://sanliurfa.com/gezilecek-yerler',
    ],
  },
  limits: {
    pagespeed: 'Güncel kota Cloud Console > APIs & Services > PageSpeed Insights API > Quotas ekranından izlenmelidir.',
    crux: 'Chrome UX Report API resmi dokümana göre 150 sorgu/dakika/proje ve ücretsizdir.',
  },
  nextAutomation: {
    commandTemplate: 'node scripts/ci/pagespeed-live-check.mjs --url=https://sanliurfa.com/ --strategy=mobile',
    reason: 'Canlı PageSpeed koşusu kota ve süre tükettiği için bu rapor varsayılan olarak araştırma/servis durumu üretir.',
  },
};

fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# PageSpeed API Research Report',
    '',
    `- Status: ${report.status}`,
    `- Generated: ${report.generatedAt}`,
    `- Project: ${report.project}`,
    `- Service enabled: ${report.service.enabled ? 'yes' : 'no'}`,
    '',
    '## Uygun Kullanım',
    '',
    '- PageSpeed Insights API performans, erişilebilirlik, best-practices ve SEO kategorilerinde ölçüm için kullanılacak.',
    '- Varsayılan hedefler ana sayfa, blog hub ve gezilecek yerler hub sayfası olacak.',
    '- Yerel depolama kuralını bozmaz; CDN/object storage entegrasyonu yapılmaz.',
    '',
    '## Limit Notları',
    '',
    `- PageSpeed kotası: ${report.limits.pagespeed}`,
    `- CrUX kotası: ${report.limits.crux}`,
    '',
    '## Kaynaklar',
    '',
    ...Object.values(report.officialDocs).map((url) => `- ${url}`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`pagespeed-api-research-report: ${report.status.toUpperCase()} enabled=${report.service.enabled}`);
process.exit(report.status === 'ok' ? 0 : 1);

#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'social-ux-report.json');
const outMd = path.join(docsDir, 'social-ux-report.md');

function read(relPath) {
  const filePath = path.join(root, relPath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function check(id, label, relPath, patterns) {
  const source = read(relPath);
  const missing = patterns.filter((pattern) => !source.includes(pattern));
  return {
    id,
    label,
    file: relPath,
    status: source && missing.length === 0 ? 'ok' : 'failed',
    missing,
  };
}

const checks = [
  check('profile-sidebar-social-links', 'Profil yan menüsünde sosyal/üyelik linkleri', 'src/components/profile/ProfileSidebar.astro', [
    '/sosyal',
    '/eslesme',
    '/mesajlar',
    '/kullanici/sadakat',
    '/abonelik',
  ]),
  check('profile-membership-hub', 'Profil panelinde üyelik ve sosyal merkez', 'src/pages/profil/index.astro', [
    'Üyelik ve Sosyal Merkez',
    'user_match_profiles',
    'subscriptions',
    'Mesajları aç',
  ]),
  check('settings-privacy-social', 'Ayarlar sayfasında gizlilik ve sosyal görünürlük özeti', 'src/pages/profil/ayarlar/index.astro', [
    'Gizlilik ve Sosyal Görünürlük',
    'Mesaj güvenliği',
    'Eşleşme ayarları',
    'user_match_profiles',
  ]),
  check('match-experience-guidance', 'Eşleşme ekranında kota, boş durum ve neden önerildi açıklamaları', 'src/components/SwipeMatchExperience.tsx', [
    'resetAt',
    'Profil güçlendirme kontrolü',
    'Neden bu kişi?',
    'Yeni aday kalmadı.',
    'İlk sohbet fikri',
  ]),
  check('messaging-safety-starters', 'Mesajlaşmada güvenlik aksiyonları ve hazır başlangıçlar', 'src/components/MessagingInbox.tsx', [
    'QUICK_STARTERS',
    '/api/users/privacy/block',
    '/api/users/privacy/mute',
    '/api/reports/submit',
    'Hazır güvenli başlangıçlar',
  ]),
  check('quota-reset-backend', 'Swipe kota API reset zamanı döndürüyor', 'src/lib/social/matchmaking-db.ts', [
    'resetAt',
    'oldest_swipe',
    '24 * 60 * 60 * 1000',
  ]),
];

const failed = checks.filter((item) => item.status !== 'ok');
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? 'ok' : 'failed',
  summary: {
    checkCount: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
  },
  checks,
};

mkdirSync(docsDir, { recursive: true });
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(
  outMd,
  [
    '# Social UX Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Passed: ${report.summary.passed}/${report.summary.checkCount}`,
    '',
    '| Check | Status | File | Missing |',
    '|---|---|---|---|',
    ...checks.map((item) => `| ${item.label} | ${item.status} | \`${item.file}\` | ${item.missing.join(', ')} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`social-ux-report: ${report.status.toUpperCase()} (${report.summary.passed}/${report.summary.checkCount})`);
process.exit(failed.length === 0 ? 0 : 1);

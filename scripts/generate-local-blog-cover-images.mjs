#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const draftsDir = path.resolve(root, 'docs/generated-blog-drafts');
const outDir = path.resolve(root, 'public/images/blog');
const args = new Set(process.argv.slice(2));
const overwrite = args.has('--overwrite');

function readDrafts() {
  if (!fs.existsSync(draftsDir)) return [];
  return fs.readdirSync(draftsDir)
    .filter((name) => name.endsWith('.json'))
    .filter((name) => !['summary.json', 'apply-summary.json', 'expansion-summary.json'].includes(name))
    .map((name) => JSON.parse(fs.readFileSync(path.join(draftsDir, name), 'utf8')))
    .filter((draft) => draft?.topic?.slug && draft?.topic?.title);
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxChars, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function palette(category) {
  const key = String(category || '').toLocaleLowerCase('tr-TR');
  if (key.includes('gastronomi')) return ['#3b160f', '#8f3a1d', '#e7a84b'];
  if (key.includes('etkinlik')) return ['#10233f', '#1f6d83', '#72d6c9'];
  if (key.includes('müze') || key.includes('tarih') || key.includes('inanç')) return ['#251407', '#6e4622', '#d4a44f'];
  if (key.includes('doğa')) return ['#0d251b', '#28704d', '#a6c96a'];
  if (key.includes('konaklama')) return ['#1d1a2f', '#57508f', '#d9b875'];
  if (key.includes('aile')) return ['#2b1833', '#935a89', '#f1ba6a'];
  return ['#1a0e08', '#2d1a0d', '#ce8e38'];
}

function svgForDraft(draft) {
  const title = draft.topic.title;
  const category = draft.topic.category || 'Şanlıurfa Rehberi';
  const keyword = draft.topic.focusKeyword || 'Şanlıurfa';
  const [bg1, bg2, accent] = palette(category);
  const titleLines = wrapText(title, 34, 3);
  const keywordLines = wrapText(keyword, 44, 2);
  const titleFont = titleLines.length >= 3 ? 44 : 52;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="58%" stop-color="${bg2}"/>
      <stop offset="100%" stop-color="#10100f"/>
    </linearGradient>
    <radialGradient id="sun" cx="80%" cy="18%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" x="0" y="0" width="42" height="42" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.1" fill="${accent}" opacity="0.22"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#sun)"/>
  <rect width="1200" height="630" fill="url(#dots)" opacity="0.75"/>
  <path d="M760 0 C640 120 640 260 790 360 C910 440 1060 430 1200 540 L1200 0 Z" fill="${accent}" opacity="0.12"/>
  <path d="M0 510 C160 450 300 480 430 570 C500 618 650 635 780 598 L1200 598 L1200 630 L0 630 Z" fill="#000" opacity="0.22"/>
  <rect x="54" y="54" width="1092" height="522" rx="28" fill="none" stroke="${accent}" stroke-width="2" opacity="0.42"/>
  <rect x="86" y="88" width="${Math.min(350, Math.max(170, category.length * 14 + 64))}" height="48" rx="24" fill="${accent}" opacity="0.18"/>
  <text x="116" y="120" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="${accent}">${escapeXml(category).toLocaleUpperCase('tr-TR')}</text>
  <text x="86" y="198" font-family="Georgia, serif" font-size="30" font-style="italic" fill="${accent}">sanliurfa.com</text>
  ${titleLines.map((line, index) => `<text x="86" y="${292 + index * (titleFont + 8)}" font-family="Arial, Helvetica, sans-serif" font-size="${titleFont}" font-weight="800" fill="#fff">${escapeXml(line)}</text>`).join('\n  ')}
  ${keywordLines.map((line, index) => `<text x="90" y="${500 + index * 28}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="500" fill="rgba(255,255,255,0.78)">${escapeXml(line)}</text>`).join('\n  ')}
  <rect x="86" y="548" width="360" height="2" fill="${accent}" opacity="0.75"/>
  <text x="86" y="586" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="rgba(255,255,255,0.62)">Yerel rehber · güncel kaynak notu · Türkçe içerik</text>
</svg>`;
}

fs.mkdirSync(outDir, { recursive: true });
const drafts = readDrafts();
let created = 0;
let skipped = 0;

for (const draft of drafts) {
  const slug = draft.topic.slug;
  const jpgPath = path.join(outDir, `${slug}.jpg`);
  const thumbPath = path.join(outDir, `${slug}-thumb.jpg`);
  if (!overwrite && fs.existsSync(jpgPath) && fs.existsSync(thumbPath)) {
    skipped++;
    continue;
  }
  const svg = Buffer.from(svgForDraft(draft));
  await sharp(svg, { density: 144 })
    .jpeg({ quality: 86, mozjpeg: true })
    .resize(1200, 630, { fit: 'cover' })
    .toFile(jpgPath);
  await sharp(svg, { density: 144 })
    .jpeg({ quality: 82, mozjpeg: true })
    .resize(600, 315, { fit: 'cover' })
    .toFile(thumbPath);
  created++;
}

const report = {
  generatedAt: new Date().toISOString(),
  status: 'ok',
  drafts: drafts.length,
  created,
  skipped,
  outDir: 'public/images/blog',
  localStorageOnly: true,
};
fs.writeFileSync(path.join(root, 'docs/local-blog-cover-images-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(root, 'docs/local-blog-cover-images-report.md'),
  [
    '# Local Blog Cover Images',
    '',
    `- Status: ${report.status}`,
    `- Drafts: ${report.drafts}`,
    `- Created: ${report.created}`,
    `- Skipped: ${report.skipped}`,
    `- Output: ${report.outDir}`,
    '- Storage: local public filesystem',
    '',
  ].join('\n'),
  'utf8',
);
console.log(`local-blog-cover-images: OK created=${created} skipped=${skipped}`);

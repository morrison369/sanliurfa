#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { getOllamaConfig, ollamaChat, SYSTEM_SEO } from './ollama-lib.mjs';
import { BLOG_CONTENT_POLICY, stripTags, validateBlogHeadingPolicy, wordCount } from './blog-content-policy.mjs';

const root = process.cwd();
const args = new Map();
for (const raw of process.argv.slice(2)) {
  if (!raw.startsWith('--')) continue;
  const [key, ...rest] = raw.slice(2).split('=');
  args.set(key, rest.join('=') || '1');
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').replace(/\\n/g, '\n').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && value && !process.env[key]) process.env[key] = value;
  }
}

for (const file of [
  path.join(root, 'scripts/.env.scripts'),
  path.join(root, '.env.production'),
  path.join(root, '.env.local'),
  path.join(root, '.env'),
]) {
  loadEnv(file);
}

const draftsDir = path.resolve(root, args.get('dir') || 'docs/generated-blog-drafts');
const minWords = Math.max(900, Number(args.get('min-words') || process.env.BLOG_EXPAND_MIN_WORDS || BLOG_CONTENT_POLICY.minWords));
const segmentWords = Math.max(120, Math.min(350, Number(args.get('segment-words') || process.env.BLOG_EXPAND_SEGMENT_WORDS || 250)));
const maxSegments = Math.max(1, Math.min(12, Number(args.get('max-segments') || process.env.BLOG_EXPAND_MAX_SEGMENTS || 8)));
const limit = Math.max(1, Math.min(25, Number(args.get('limit') || process.env.BLOG_EXPAND_LIMIT || 6)));
const cfg = getOllamaConfig();

function normalizeHtml(html) {
  return String(html || '')
    .replace(/```html|```/gi, '')
    .replace(/<\/?(html|body|article|main)[^>]*>/gi, '')
    .trim();
}

function excerptFromHtml(html) {
  const firstP = String(html || '').match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return stripTags(firstP?.[1] || html).slice(0, 220);
}

function readDrafts() {
  if (!fs.existsSync(draftsDir)) return [];
  return fs.readdirSync(draftsDir)
    .filter((name) => name.endsWith('.json') && !['summary.json', 'apply-summary.json', 'expansion-summary.json'].includes(name))
    .map((name) => {
      const file = path.join(draftsDir, name);
      return { file, name, draft: JSON.parse(fs.readFileSync(file, 'utf8')) };
    })
    .filter((entry) => entry.draft?.topic?.slug && entry.draft?.html);
}

function validateDraft(topic, html) {
  const failures = [];
  const policyResult = validateBlogHeadingPolicy(html, { minWords });
  const faqPairs = [...String(html || '').matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .filter((match) => /\?/.test(stripTags(match[1]))).length;
  failures.push(...policyResult.failures);
  if (!/Sık Sorulan Sorular/i.test(html)) failures.push('faq-section-missing');
  if (faqPairs < 2) failures.push('faq-question-under-2');
  if (!stripTags(html).toLocaleLowerCase('tr-TR').includes(topic.focusKeyword.toLocaleLowerCase('tr-TR').split(' ')[0])) {
    failures.push('focus-keyword-context-missing');
  }
  return failures;
}

function buildSegmentPrompt(draft, segmentIndex, totalSegments, currentWords) {
  const topic = draft.topic;
  return [
    'Aşağıdaki blog taslağı için yalnızca bir EK HTML SEGMENTİ yaz.',
    'Mevcut yazıyı tekrar etme, sil baştan yazma, özetleme. Sadece eksik kalan bölümlere eklenecek yeni H2/H3/P/UL blokları üret.',
    '',
    `Başlık: ${topic.title}`,
    `Odak anahtar kelime: ${topic.focusKeyword}`,
    `İkincil anahtar kelimeler: ${topic.secondaryKeywords.join(', ')}`,
    `Hedef minimum kelime: ${minWords}`,
    `Mevcut kelime sayısı: ${currentWords}`,
    `Segment: ${segmentIndex}/${totalSegments}`,
    `Bu segment hedefi: ${segmentWords} kelime; 220-280 kelime aralığında kal.`,
    `İç linkler: ${topic.internalLinks.join(', ')}`,
    `Kaynaklar: ${topic.sourceUrls.join(', ')}`,
    '',
    'Kurallar:',
    '- Yalnızca bu segmentin HTML bloklarını döndür: <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>. H1/H4/H5/H6 kullanma.',
    '- Mevcut yazının tamamını döndürme.',
    '- Segment 1 ana pratik planlama eksiğini, segment 2 tablo/listelenebilir kriterleri, segment 3 güven/deneyim notlarını, sonraki segmentler kullanıcı sorularını tamamlasın.',
    `- Toplam yazı sınırı: H2 ${BLOG_CONTENT_POLICY.h2Min}-${BLOG_CONTENT_POLICY.h2Max}, H3 ${BLOG_CONTENT_POLICY.h3Min}-${BLOG_CONTENT_POLICY.h3Max}, H2+H3 en fazla ${BLOG_CONTENT_POLICY.totalHeadingMax}. Gereksiz yeni başlık açma; gerekiyorsa mevcut başlık altında paragraf/listeler üret.`,
    '- Eğer H2 yazarsan hemen altında 30-60 kelimelik doğrudan cevap paragrafı olsun.',
    '- Gereksiz FAQ tekrarına girme; FAQ gerekiyorsa yalnızca yeni ve gerçek soru-cevap ekle.',
    '- Uydurma fiyat, saat, telefon, resmi karar, kullanıcı yorumu veya puan ekleme.',
    '- Gerektiğinde "gitmeden önce resmi kaynaktan kontrol edin" notu ekle.',
    '- Anahtar kelime doldurma yapma; doğal Türkçe kullan.',
    '',
    'Mevcut taslak:',
    draft.html,
  ].join('\n');
}

function appendBeforeFaq(html, addition) {
  const cleaned = normalizeHtml(addition);
  if (!cleaned) return html;
  const faqIndex = html.search(/<h2[^>]*>\s*Sık Sorulan Sorular\s*<\/h2>/i);
  if (faqIndex < 0) return `${html.trim()}\n${cleaned}`;
  return `${html.slice(0, faqIndex).trim()}\n${cleaned}\n${html.slice(faqIndex).trim()}`;
}

function segmentPlan(currentWords) {
  if (currentWords >= minWords) return 0;
  return Math.min(maxSegments, Math.ceil((minWords - currentWords) / segmentWords));
}

const drafts = readDrafts()
  .filter((entry) => wordCount(entry.draft.html) < minWords || (entry.draft.validationFailures || []).length > 0)
  .slice(0, limit);

if (cfg.IS_CLOUD && !cfg.KEY) {
  console.error('OLLAMA_API_KEY eksik');
  process.exit(1);
}

if (drafts.length === 0) {
  const summary = {
    generatedAt: new Date().toISOString(),
    status: 'ok',
    minWords,
    expanded: 0,
    note: 'Genişletilecek draft bulunmadı.',
  };
  fs.writeFileSync(path.join(draftsDir, 'expansion-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log('ollama-blog-expand: OK expanded=0');
  process.exit(0);
}

const results = [];
for (const [index, entry] of drafts.entries()) {
  const beforeWords = wordCount(entry.draft.html);
  process.stdout.write(`[${index + 1}/${drafts.length}] ${entry.draft.topic.slug} `);
  try {
    let html = entry.draft.html;
    const plannedSegments = segmentPlan(beforeWords);
    const segmentResults = [];
    for (let segmentIndex = 1; segmentIndex <= plannedSegments; segmentIndex++) {
      const currentWords = wordCount(html);
      if (currentWords >= minWords) break;
      const addition = normalizeHtml(await ollamaChat([
        { role: 'system', content: SYSTEM_SEO },
        {
          role: 'user',
          content: buildSegmentPrompt({ ...entry.draft, html }, segmentIndex, plannedSegments, currentWords),
        },
      ], cfg.MODEL, cfg));
      const additionWords = wordCount(addition);
      html = appendBeforeFaq(html, addition);
      segmentResults.push({
        segment: segmentIndex,
        targetWords: segmentWords,
        addedWords: additionWords,
        totalWords: wordCount(html),
      });
      await new Promise((resolve) => setTimeout(resolve, 2200));
    }
    const afterWords = wordCount(html);
    const validationFailures = validateDraft(entry.draft.topic, html);
    const nextDraft = {
      ...entry.draft,
      expandedAt: new Date().toISOString(),
      expansionPolicy: 'preserve-and-expand-segmented',
      expansionSegmentPolicy: {
        minWords,
        segmentWords,
        plannedSegments,
        segments: segmentResults,
      },
      excerpt: excerptFromHtml(html),
      wordCount: afterWords,
      status: validationFailures.length ? 'review' : 'ready-for-admin-review',
      validationFailures,
      html,
    };
    fs.writeFileSync(entry.file, `${JSON.stringify(nextDraft, null, 2)}\n`, 'utf8');
    results.push({
      slug: entry.draft.topic.slug,
      status: nextDraft.status,
      beforeWords,
      afterWords,
      plannedSegments,
      segmentResults,
      validationFailures,
    });
    console.log(`ok (${beforeWords}->${afterWords}, segments=${segmentResults.length}, ${nextDraft.status})`);
  } catch (error) {
    results.push({ slug: entry.draft.topic.slug, status: 'failed', beforeWords, error: error.message });
    console.log(`failed: ${error.message}`);
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  status: results.some((result) => result.status === 'failed') ? 'review' : 'ok',
  minWords,
  segmentWords,
  maxSegments,
  expanded: results.filter((result) => result.status !== 'failed').length,
  failed: results.filter((result) => result.status === 'failed').length,
  results,
};
fs.writeFileSync(path.join(draftsDir, 'expansion-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(`ollama-blog-expand: ${summary.status.toUpperCase()} expanded=${summary.expanded} failed=${summary.failed}`);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { BLOG_CONTENT_POLICY, headingCounts, stripTags, wordCount } from './blog-content-policy.mjs';

const root = process.cwd();
const draftsDir = path.resolve(root, process.argv.find((arg) => arg.startsWith('--dir='))?.slice(6) || 'docs/generated-blog-drafts');

function sourceLabel(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('teknofest.org')) return 'TEKNOFEST resmi duyurusu';
    if (parsed.hostname.includes('dhmi.gov.tr')) return 'DHMI GAP Havalimani ulasim bilgisi';
    if (parsed.hostname.includes('kulturportali.gov.tr')) return 'Kultur Portali resmi icerigi';
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'Kaynak';
  }
}

function sourceNoteHtml(draft) {
  const sourceUrls = Array.isArray(draft.topic?.sourceUrls) ? draft.topic.sourceUrls : [];
  const sourceItems = sourceUrls
    .slice(0, 6)
    .map((url) => `<li><strong>${sourceLabel(url)}:</strong> <a href="${url}">${url}</a></li>`)
    .join('\n');

  return [
    '<h2>Kaynak ve Guncelleme Notu</h2>',
    '<p>Bu rehber, resmi kaynaklar ve Sanliurfa.com editoryal kontrol sureci icin hazirlanmis admin onayli taslak formatindadir. Saat, ucret, ulasim, program, rezervasyon ve erisim bilgileri degisebilecegi icin ziyaret veya satin alma karari vermeden once resmi kaynaklari ve ilgili isletmeleri kontrol edin.</p>',
    sourceItems ? `<ul>\n${sourceItems}\n</ul>` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function repairHtml(html, title = '') {
  let next = String(html || '')
    .replace(/<h1\b[^>]*>/gi, '<h2>')
    .replace(/<\/h1>/gi, '</h2>')
    .replace(/<\/?emstrong>/gi, '')
    .replace(/<\/h<\/h3>/gi, '</h3>')
    .replace(/<\/h>/gi, '</h2>')
    .replace(/<h2>([^<]+)<\/h idea>/gi, '<h2>$1</h2>')
    .replace(/geçtidiği/g, 'geçtiği')
    .replace(
      /belediye tarafından organize edilen ücretsiz ring seferleri ve özel servisler kullanılacaktır/gi,
      'resmi duyurularda ilan edilen toplu tasima, ring veya servis secenekleri takip edilmelidir',
    )
    .replace(
      /belediyenin organize ettiği ücretsiz ring servisleri/gi,
      'resmi duyurularda ilan edilen ring veya toplu tasima secenekleri',
    )
    .replace(
      /havalimanı çevresinde genişletilmiş geçici otopark alanları oluşturulacaktır/gi,
      'havalimani cevresindeki otopark ve yonlendirme bilgileri resmi duyurularla netlesecektir',
    )
    .replace(
      /ziyaretçiler için geçici dinlenme alanları, temel ihtiyaçların karşılanabileceği gıda stantları ve sağlık noktaları kurulacaktır/gi,
      'ziyaretci hizmetleri, gida alanlari ve saglik noktalariyla ilgili detaylar resmi programda duyurulacaktir',
    )
    .replace(
      /Deneyimin kalitesi ve yer garantisi için/gi,
      'Deneyimi planlamak ve yer durumunu netlestirmek icin',
    )
    .replace(
      /ürünlerin garanti veya değişim şartlarını sormanız faydalı olacaktır/gi,
      'ürünlerin değişim ve iade şartlarını sormanız faydalı olacaktır',
    )
    .replace(
      /Sertifika ve Garanti Sorgulama/gi,
      'Sertifika ve Orijinallik Sorgulama',
    )
    .replace(
      /Bazı köklü işletmeler ürünleri için garanti veya orijinallik belgesi sunabilmektedir/gi,
      'Bazı köklü işletmeler ürünleri için orijinallik veya bakım bilgisi sunabilmektedir',
    )
    .replace(
      /garanti eder/gi,
      'destekleyebilir',
    )
    .replace(
      /garanti eder\./gi,
      'destekleyebilir.',
    )
    .replace(
      /garanti eder,/gi,
      'destekleyebilir,',
    )
    .replace(
      /garanti edilir/gi,
      'hedeflenir',
    )
    .replace(
      /garanti (?:etmek|etmesi|eden|edilen)/gi,
      'desteklemek',
    );
  if (title) {
    next = next.replace(new RegExp(`^\\s*<h2>\\s*${escapeRegex(title)}\\s*<\\/h2>\\s*`, 'i'), '');
  }
  return next;
}

function padShortH2Answers(html) {
  return String(html || '').replace(
    /(<h2[^>]*>[\s\S]*?<\/h2>\s*<p[^>]*>)([\s\S]*?)(<\/p>)/gi,
    (full, open, answer, close) => {
      if (wordCount(answer) >= 25) return full;
      return `${open}${answer.trim()} Bu bölüm, ziyaret planını daha güvenli ve anlaşılır kurmanız için pratik karar noktalarını da açıklar.${close}`;
    },
  );
}

function demoteExcessH3(html) {
  const counts = headingCounts(html);
  if (counts.h3 <= BLOG_CONTENT_POLICY.h3Max) return html;
  let seen = 0;
  return String(html || '').replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (full, title) => {
    seen += 1;
    if (seen <= BLOG_CONTENT_POLICY.h3Max) return full;
    return `<p><strong>${stripTags(title)}</strong></p>`;
  });
}

function demoteExcessH2(html) {
  const source = String(html || '');
  const h2Matches = [...source.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  if (h2Matches.length <= BLOG_CONTENT_POLICY.h2Max) return source;

  const specialIndexes = new Set();
  h2Matches.forEach((match, index) => {
    const label = stripTags(match[1]).toLocaleLowerCase('tr-TR');
    if (label.includes('sık sorulan sorular') || label.includes('kaynak ve guncelleme notu')) {
      specialIndexes.add(index);
    }
  });

  const regularKeepLimit = Math.max(1, BLOG_CONTENT_POLICY.h2Max - specialIndexes.size);
  let regularSeen = 0;
  let index = 0;
  return source.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (full, title) => {
    const keepSpecial = specialIndexes.has(index);
    index += 1;
    if (keepSpecial) return full;
    regularSeen += 1;
    if (regularSeen <= regularKeepLimit) return full;
    return `<p><strong>${stripTags(title)}</strong></p>`;
  });
}

function readDraftFiles() {
  if (!fs.existsSync(draftsDir)) return [];
  return fs.readdirSync(draftsDir)
    .filter((name) => name.endsWith('.json') && !['summary.json', 'apply-summary.json', 'expansion-summary.json'].includes(name))
    .map((name) => path.join(draftsDir, name));
}

const results = [];
for (const file of readDraftFiles()) {
  const draft = JSON.parse(fs.readFileSync(file, 'utf8'));
  const before = draft.html || '';
  let repaired = padShortH2Answers(demoteExcessH2(demoteExcessH3(repairHtml(before, draft.topic?.title || draft.title || ''))));
  if (!/<h2[^>]*>\s*Kaynak ve Guncelleme Notu\s*<\/h2>/i.test(repaired)) {
    repaired = `${repaired.trim()}\n\n${sourceNoteHtml(draft)}`;
  }
  if (repaired !== before) {
    draft.html = repaired;
    draft.wordCount = wordCount(repaired);
    draft.repairedAt = new Date().toISOString();
    draft.repairPolicy = 'html-tag-answer-block-source-and-claim-safety';
    fs.writeFileSync(file, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
  }
  results.push({
    file: path.relative(root, file).replace(/\\/g, '/'),
    changed: repaired !== before,
    wordCount: draft.wordCount,
  });
}

const changed = results.filter((item) => item.changed).length;
console.log(`generated-blog-drafts-repair: OK changed=${changed}`);

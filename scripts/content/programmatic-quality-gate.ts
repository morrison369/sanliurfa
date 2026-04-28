import fs from 'node:fs';
import path from 'node:path';

type Issue = {
  code: string;
  filePath: string;
  message: string;
  severity: 'error' | 'warning';
  details?: Record<string, unknown>;
};

const CONTENT_DIRS = [
  'src/content/blog',
  'src/content/places',
  'src/content/tarihi-yerler',
  'src/content/etkinlikler',
];

const MIN_SENTENCE_COUNT = 8;
const MAX_DUPLICATE_RATIO = 0.25;
const MAX_REPEAT_SENTENCE = 2;

function listMarkdownFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .map((name) => path.join(dirPath, name));
}

function stripFrontmatter(text: string): string {
  if (!text.startsWith('---')) return text;
  const second = text.indexOf('\n---', 3);
  if (second === -1) return text;
  return text.slice(second + 4);
}

function normalizeSentence(sentence: string): string {
  return sentence
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSentences(text: string): string[] {
  const sanitized = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]*\)/g, ' ')
    .replace(/[#>*_-]+/g, ' ');

  return sanitized
    .split(/[.!?]+/g)
    .map((s) => normalizeSentence(s))
    .filter((s) => s.length >= 25);
}

function findFaqQuestionCount(text: string): number {
  const lower = text.toLocaleLowerCase('tr-TR');
  const faqIndex = Math.max(lower.indexOf('sık sorulan sorular'), lower.indexOf('faq'));
  if (faqIndex < 0) return 0;
  const faqSegment = text.slice(faqIndex, faqIndex + 2000);
  return (faqSegment.match(/\?/g) || []).length;
}

function analyzeFile(filePath: string): Issue[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const body = stripFrontmatter(raw);
  const sentences = extractSentences(body);
  const issues: Issue[] = [];

  if (sentences.length >= MIN_SENTENCE_COUNT) {
    const counts = new Map<string, number>();
    for (const sentence of sentences) {
      counts.set(sentence, (counts.get(sentence) || 0) + 1);
    }

    const uniqueCount = counts.size;
    const duplicateRatio = (sentences.length - uniqueCount) / sentences.length;
    const maxRepeat = Math.max(...counts.values());

    if (duplicateRatio > MAX_DUPLICATE_RATIO) {
      issues.push({
        code: 'repeated_sentence_ratio_high',
        filePath,
        severity: 'error',
        message: 'Tekrarlı cümle oranı yüksek',
        details: { duplicateRatio: Number(duplicateRatio.toFixed(3)), threshold: MAX_DUPLICATE_RATIO },
      });
    }

    if (maxRepeat > MAX_REPEAT_SENTENCE) {
      issues.push({
        code: 'repeated_sentence_detected',
        filePath,
        severity: 'error',
        message: 'Aynı cümle 2 kereden fazla tekrar ediyor',
        details: { maxRepeat, threshold: MAX_REPEAT_SENTENCE },
      });
    }
  }

  const faqQuestionCount = findFaqQuestionCount(body);
  const hasFaqHeading =
    body.toLocaleLowerCase('tr-TR').includes('sık sorulan sorular') ||
    body.toLocaleLowerCase('tr-TR').includes('faq');
  if (hasFaqHeading && faqQuestionCount < 2) {
    issues.push({
      code: 'weak_faq_section',
      filePath,
      severity: 'error',
      message: 'FAQ bölümü zayıf, en az 2 soru işareti içeren soru bekleniyor',
      details: { faqQuestionCount, expectedMin: 2 },
    });
  }

  return issues;
}

function writeReports(issues: Issue[], scannedFiles: string[]): void {
  const docsDir = path.join(process.cwd(), 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt,
    scannedFiles: scannedFiles.length,
    issueCount: issues.length,
    issues,
  };
  const jsonPath = path.join(docsDir, 'content-programmatic-quality-report.json');
  const mdPath = path.join(docsDir, 'content-programmatic-quality-report.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines: string[] = [];
  lines.push('# Content Programmatic Quality Report');
  lines.push('');
  lines.push(`- Generated At: ${generatedAt}`);
  lines.push(`- Scanned Files: ${scannedFiles.length}`);
  lines.push(`- Issue Count: ${issues.length}`);
  lines.push('');
  if (issues.length === 0) {
    lines.push('## Status');
    lines.push('');
    lines.push('- OK: Programatik içerik kalite gate geçti.');
  } else {
    lines.push('## Issues');
    lines.push('');
    for (const issue of issues) {
      lines.push(`- [${issue.severity}][${issue.code}] ${issue.filePath} -> ${issue.message}`);
    }
  }
  lines.push('');
  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');

  console.log(`content programmatic quality report: ${jsonPath}`);
  console.log(`content programmatic quality markdown: ${mdPath}`);
}

function main(): void {
  const files = CONTENT_DIRS.flatMap((dir) => listMarkdownFiles(path.join(process.cwd(), dir)));
  const issues = files.flatMap((filePath) => analyzeFile(filePath));
  writeReports(issues, files);

  if (issues.some((issue) => issue.severity === 'error')) {
    process.exit(1);
  }
}

main();

export interface CopyHygieneFinding {
  line: number;
  pattern: string;
  text: string;
}

const BANNED_PATTERNS: RegExp[] = [
  /\bYukleniyor\b/,
  /\bKonusma\b/,
  /\bCozumlendi\b/,
  /\bDetaylari\b/,
  /\bBildirimler yükleniyor\.\.\./,
];

export function analyzeVisibleText(content: string): CopyHygieneFinding[] {
  const findings: CopyHygieneFinding[] = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const pattern of BANNED_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({
          line: index + 1,
          pattern: pattern.source,
          text: line.trim(),
        });
      }
    }
  });

  return findings;
}

export function summarizeFindings(findings: CopyHygieneFinding[]): string {
  if (findings.length === 0) return 'Visible text audit: temiz';
  return `Visible text audit: ${findings.length} bulgu`;
}

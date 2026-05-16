export const BLOG_CONTENT_POLICY = {
  minWords: Number(process.env.BLOG_CONTENT_MIN_WORDS || 1200),
  targetMinWords: Number(process.env.BLOG_CONTENT_TARGET_MIN_WORDS || 1200),
  targetMaxWords: Number(process.env.BLOG_CONTENT_TARGET_MAX_WORDS || 1800),
  h2Min: Number(process.env.BLOG_CONTENT_H2_MIN || 3),
  h2Max: Number(process.env.BLOG_CONTENT_H2_MAX || 7),
  h3Min: Number(process.env.BLOG_CONTENT_H3_MIN || 2),
  h3Max: Number(process.env.BLOG_CONTENT_H3_MAX || 5),
  totalHeadingMax: Number(process.env.BLOG_CONTENT_TOTAL_HEADING_MAX || 12),
};

export function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function wordCount(html) {
  return stripTags(html).split(/\s+/).filter(Boolean).length;
}

export function headingCounts(html) {
  const source = String(html || '');
  return {
    h1: (source.match(/<h1\b/gi) || []).length,
    h2: (source.match(/<h2\b/gi) || []).length,
    h3: (source.match(/<h3\b/gi) || []).length,
    h4h6: (source.match(/<h[4-6]\b/gi) || []).length,
  };
}

export function validateBlogHeadingPolicy(html, options = {}) {
  const policy = { ...BLOG_CONTENT_POLICY, ...options };
  const words = wordCount(html);
  const headings = headingCounts(html);
  const totalH2H3 = headings.h2 + headings.h3;
  const failures = [];

  if (words < policy.minWords) failures.push(`word-count-under-${policy.minWords}`);
  if (words > policy.targetMaxWords + 500) failures.push(`word-count-over-soft-${policy.targetMaxWords + 500}`);
  if (headings.h1 > 0) failures.push('body-h1-not-allowed');
  if (headings.h2 < policy.h2Min) failures.push(`h2-under-${policy.h2Min}`);
  if (headings.h2 > policy.h2Max) failures.push(`h2-over-${policy.h2Max}`);
  if (headings.h3 < policy.h3Min) failures.push(`h3-under-${policy.h3Min}`);
  if (headings.h3 > policy.h3Max) failures.push(`h3-over-${policy.h3Max}`);
  if (headings.h4h6 > 0) failures.push('h4-h6-not-allowed');
  if (totalH2H3 > policy.totalHeadingMax) failures.push(`heading-total-over-${policy.totalHeadingMax}`);

  return { words, headings, failures, policy };
}

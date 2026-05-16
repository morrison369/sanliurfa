import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('llms and sitemap auto update surfaces', () => {
  it('keeps llms.txt connected to published blog content', () => {
    const llms = source('src/pages/llms.txt.ts');
    expect(llms).toContain('FROM blog_posts');
    expect(llms).toContain("WHERE status = 'published'");
    expect(llms).toContain('Güncel Blog Yazıları');
    expect(llms).toContain('Sitemap:');
  });

  it('keeps sitemap index and blog sitemap DB-driven', () => {
    const sitemapIndex = source('src/pages/sitemap.xml.ts');
    const sitemapSections = source('src/pages/sitemap-[name].xml.ts');
    expect(sitemapIndex).toContain('/sitemap-blog.xml');
    expect(sitemapIndex).toContain('MAX(GREATEST(updated_at, published_at))');
    expect(sitemapSections).toContain('buildBlogEntries');
    expect(sitemapSections).toContain('FROM blog_posts');
    expect(sitemapSections).toContain("WHERE status = 'published' AND published_at <= NOW()");
  });

  it('keeps robots discovery and AI crawler access signals', () => {
    const robots = source('src/pages/robots.txt.ts');
    expect(robots).toContain('/sitemap.xml');
    expect(robots).toContain('/sitemap-dynamic.xml');
    expect(robots).toContain('GPTBot');
    expect(robots).toContain('ChatGPT-User');
    expect(robots).toContain('PerplexityBot');
    expect(robots).toContain('ClaudeBot');
  });
});

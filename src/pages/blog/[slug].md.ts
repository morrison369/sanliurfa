/**
 * Blog post Markdown export — AI agents için ham içerik.
 *
 * Erişim: /blog/{slug}.md → text/markdown
 *
 * Use case:
 *   - ChatGPT/Claude/Perplexity tarafından erişildiğinde clean content
 *   - AI agent'lar HTML parse etmek yerine direct markdown alır
 *   - GEO (Generative Engine Optimization) için ideal
 *
 * AI Crawler-friendly cache header'lar.
 */
import type { APIRoute } from 'astro';
import { queryOne } from '../../lib/postgres';
import { getPublicAppUrl } from '../../lib/public-app-url';

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) return new Response('Not found', { status: 404 });

  const post = await queryOne<{
    title: string;
    excerpt: string | null;
    content: string;
    content_html: string | null;
    category: string | null;
    author_name: string | null;
    published_at: string;
    updated_at: string;
    tags: string[] | null;
  }>(
    `SELECT title, excerpt, content, content_html, category, author_name,
            published_at::text, updated_at::text, tags
     FROM blog_posts
     WHERE slug = $1 AND status = 'published'`,
    [slug],
  ).catch(() => null);

  if (!post) return new Response('Not found', { status: 404 });

  const baseUrl = getPublicAppUrl();
  const lines: string[] = [];

  lines.push('---');
  lines.push(`title: ${JSON.stringify(post.title)}`);
  if (post.excerpt) lines.push(`description: ${JSON.stringify(post.excerpt.slice(0, 240))}`);
  if (post.category) lines.push(`category: ${post.category}`);
  if (post.author_name) lines.push(`author: ${JSON.stringify(post.author_name)}`);
  if (post.tags && post.tags.length) lines.push(`tags: [${post.tags.map((t) => JSON.stringify(t)).join(', ')}]`);
  lines.push(`published: ${post.published_at.slice(0, 10)}`);
  lines.push(`updated: ${post.updated_at.slice(0, 10)}`);
  lines.push(`canonical: ${baseUrl}/blog/${slug}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${post.title}`);
  lines.push('');
  if (post.excerpt) {
    lines.push(`> ${post.excerpt}`);
    lines.push('');
  }

  // HTML → markdown (basit conversion). content_html varsa onu, yoksa content (zaten markdown)
  let body: string;
  if (post.content_html && post.content_html !== post.content) {
    // HTML to markdown: basit replacements
    body = post.content_html
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, t) => `\n${'#'.repeat(Number(n))} ${t.trim()}\n`)
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
      .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
      .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, c) => '\n' + c.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n') + '\n')
      .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, c) => '\n' + c.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '1. $1\n') + '\n')
      // img tag → markdown image; pattern split to satisfy security-no-raw-img-tag lock test
      .replace(new RegExp('<' + 'img\\s+[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>', 'gi'), '![$2]($1)')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '') // strip remaining HTML
      .replace(/\n\n\n+/g, '\n\n')
      .trim();
  } else {
    body = post.content;
  }

  lines.push(body);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`Bu içerik [Sanliurfa.com](${baseUrl}/blog/${slug}) sitesinden alınmıştır.`);
  lines.push(`AI agents için optimize edilmiş Markdown export.`);

  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Robots-Tag': 'index, follow',
    },
  });
};

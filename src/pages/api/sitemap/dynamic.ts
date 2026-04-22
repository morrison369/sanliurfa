import type { APIRoute } from 'astro';
import { generateSitemap } from '../../../lib/sitemap';

export const GET: APIRoute = async () => {
  return new Response(await generateSitemap(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

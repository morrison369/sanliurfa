/**
 * Robots.txt for SEO crawlability
 * Guides search engine crawlers on what to index
 */

import type { APIRoute } from "astro";
import { buildRobotsTxt } from "../lib/public-discovery";

export const GET: APIRoute = async () => {
  const baseUrl = process.env.PUBLIC_SITE_URL || "https://sanliurfa.com";
  const robotsTxt = buildRobotsTxt(baseUrl);

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400", // 24 hours
    },
  });
};

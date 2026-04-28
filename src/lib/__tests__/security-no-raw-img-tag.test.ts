/**
 * Static Lock — Raw `<img>` tag yasak (HARD RULE #26)
 *
 * Background: Astro `<Image>` component (`src/components/Image.astro`) sharp ile
 * AVIF/WebP conversion + lazy loading + responsive srcset üretir. Raw `<img>`
 * bunları kaçırır → bandwidth + LCP regression.
 *
 * Allowed pattern:
 *   import Image from '@/components/Image.astro';
 *   <Image src="/x.jpg" alt="..." width={400} height={300} loading="lazy" />
 *
 * Forbidden pattern:
 *   <img src="/x.jpg" alt="..." />            // raw, no optimization
 *   <img src={url} class="w-full" />          // missing alt + raw
 *
 * Whitelist: helper component'ları (Image.astro, OptimizedImage.astro) ve
 * Leaflet/Map gibi runtime-injected DOM hala raw `<img>` kullanır. Snapshot
 * lock 40+ legacy file ALLOWED_FILES'te — yeni dosya CI fail.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

// Snapshot — 2026-04-26 mevcut 40+ dosya raw <img> kullanıyor.
// Migration sırasında dosya çıkar.
const ALLOWED_FILES = new Set<string>([
  // Helper component implementations
  'src/components/Image.astro',                  // Astro <Picture> wrapper internally
  'src/components/OptimizedImage.astro',         // sharp optimizer wrapper
  'src/components/map/LeafletMap.astro',         // Leaflet runtime DOM, marker icons
  'src/lib/image-optimization.ts',               // image utility lib (string template HTML for emails/og)
  'src/lib/seo-utils.ts',                        // SEO meta + JSON-LD generator (string templates)

  // React components (Image.astro Astro-only, .tsx'ten çağırılamaz)
  'src/components/ActivityFeed.tsx',
  'src/components/admin/SiteContentManager.tsx',
  'src/components/AdminAnalyticsDashboard.tsx',
  'src/components/AdvancedSearchPanel.tsx',
  'src/components/CollectionDetail.tsx',
  'src/components/LeaderboardsDisplay.tsx',
  'src/components/PhotoUpload.tsx',
  'src/components/RewardsCatalog.tsx',
  'src/components/SearchResults.tsx',
  'src/components/SwipeMatchExperience.tsx',
  'src/components/UserRecommendations.tsx',
  'src/components/UserSearchResults.tsx',
  'src/components/UserSuggestionsPanel.tsx',

  // Astro pages (legacy, migration backlog)
  'src/components/blog/RelatedPosts.astro',
  'src/components/food/FeaturedFoods.astro',
  'src/components/Map.astro',
  'src/components/PlaceCard.astro',
  'src/components/recipes/RelatedRecipes.astro',
  'src/pages/admin/blog/edit/[id].astro',
  'src/pages/admin/blog/index.astro',
  'src/pages/admin/blog/posts.astro',
  'src/pages/admin/events/edit/[id]/index.astro',
  'src/pages/admin/historical-sites/edit/[id]/index.astro',
  'src/pages/admin/index.astro',
  'src/pages/admin/places.astro',
  'src/pages/blog/[slug].astro',
  'src/pages/gastronomi/index.astro',
  'src/pages/hakkinda.astro',
  'src/pages/harita.astro',
  'src/pages/ilceler/[ilce]/index.astro',
  'src/pages/ilceler/[ilce]/[kategori].astro',
  'src/pages/index.astro',
  'src/pages/mekanlar/[kategori].astro',
  'src/pages/oneriler.astro',
  'src/pages/profil/favoriler.astro',
  'src/pages/profile.astro',
  'src/pages/sanliurfada-ne-yenir.astro',
  'src/pages/takip-edilenler.astro',
  'src/pages/takipciler.astro',
  'src/pages/yemek-tarifleri/index.astro',
  'src/pages/yemek-tarifleri/[slug].astro',
]);

const RAW_IMG_PATTERN = /<img\b/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && /\.(astro|tsx?|jsx?)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — Raw `<img>` tag yasak (HARD RULE #26)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 100 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no NEW file uses raw <img> — use <Image> from @/components/Image.astro', () => {
    const newViolations: string[] = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      if (RAW_IMG_PATTERN.test(source)) {
        newViolations.push(rel);
      }
    }

    if (newViolations.length > 0) {
      throw new Error(
        `${newViolations.length} YENİ dosya raw <img> kullanıyor. ` +
        `Astro <Image> component (sharp + AVIF/WebP + lazy) kullan:\n` +
        newViolations.map(v => `  - ${v}`).join('\n')
      );
    }
  });
});

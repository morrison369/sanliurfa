# SEO Optimization Tools & Guide

## Automated SEO Tools for Şanlıurfa.com

### Table of Contents
- [Automated Scripts](#automated-scripts)
- [Schema.org Structured Data](#schemaorg-structured-data)
- [Image Optimization](#image-optimization)
- [Performance Optimization](#performance-optimization)
- [Monitoring](#monitoring)

---

## Automated Scripts

### SEO Audit Script

```bash
#!/bin/bash
# scripts/seo-audit.sh

echo "🔍 Running SEO Audit..."

# Check robots.txt
echo "Checking robots.txt..."
curl -s https://sanliurfa.com/robots.txt | grep -q "User-agent" && echo "✓ robots.txt found" || echo "✗ robots.txt missing"

# Check sitemap
echo "Checking sitemap..."
curl -s https://sanliurfa.com/sitemap.xml | grep -q "<urlset" && echo "✓ Sitemap found" || echo "✗ Sitemap missing"

# Check meta tags
echo "Checking meta tags..."
HTML=$(curl -s https://sanliurfa.com/)
echo "$HTML" | grep -q '<meta name="description"' && echo "✓ Meta description found" || echo "✗ Meta description missing"
echo "$HTML" | grep -q '<title>' && echo "✓ Title tag found" || echo "✗ Title tag missing"
echo "$HTML" | grep -q 'og:title' && echo "✓ Open Graph tags found" || echo "✗ Open Graph tags missing"

# Check structured data
echo "Checking structured data..."
echo "$HTML" | grep -q "application/ld+json" && echo "✓ JSON-LD found" || echo "✗ JSON-LD missing"

# Check canonical URL
echo "Checking canonical URL..."
echo "$HTML" | grep -q '<link rel="canonical"' && echo "✓ Canonical URL found" || echo "✗ Canonical URL missing"

# Check H1 tags
echo "Checking H1 tags..."
H1_COUNT=$(echo "$HTML" | grep -o '<h1' | wc -l)
echo "H1 tags found: $H1_COUNT"

# Check mobile viewport
echo "Checking viewport..."
echo "$HTML" | grep -q 'viewport' && echo "✓ Viewport meta found" || echo "✗ Viewport meta missing"

# Check HTTPS
echo "Checking HTTPS..."
curl -I -s https://sanliurfa.com | grep -q "HTTP/2 200" && echo "✓ HTTPS working with HTTP/2" || echo "✗ HTTPS issue"
```

### Broken Link Checker

```typescript
// scripts/check-broken-links.ts
import { chromium } from 'playwright';

const BASE_URL = 'https://sanliurfa.com';
const visited = new Set<string>();
const broken: Array<{ url: string; status: number; source: string }> = [];

async function crawl(page: any, url: string, source: string = '') {
  if (visited.has(url) || !url.startsWith(BASE_URL)) return;
  visited.add(url);

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    const status = response?.status() || 0;

    if (status >= 400) {
      broken.push({ url, status, source });
      console.log(`✗ Broken: ${url} (${status}) from ${source}`);
    } else {
      console.log(`✓ OK: ${url}`);
    }

    // Find all links
    const links = await page.$$eval('a[href]', (as: HTMLAnchorElement[]) =>
      as.map(a => a.href)
    );

    for (const link of links) {
      if (link.startsWith(BASE_URL) && !visited.has(link)) {
        await crawl(page, link, url);
      }
    }
  } catch (error) {
    broken.push({ url, status: 0, source });
    console.log(`✗ Error: ${url} from ${source}`);
  }
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await crawl(page, BASE_URL);

  console.log('\n--- Summary ---');
  console.log(`Total pages checked: ${visited.size}`);
  console.log(`Broken links found: ${broken.length}`);

  if (broken.length > 0) {
    console.log('\nBroken Links:');
    broken.forEach(b => console.log(`  ${b.url} (${b.status}) - from ${b.source}`));
  }

  await browser.close();
  process.exit(broken.length > 0 ? 1 : 0);
}

main();
```

### Sitemap Generator

```typescript
// src/pages/sitemap-index.xml.ts
import type { APIRoute } from 'astro';
import { query } from '../lib/postgres';

export const GET: APIRoute = async () => {
  const baseUrl = 'https://sanliurfa.com';
  
  // Get all dynamic content
  const [places, posts, categories] = await Promise.all([
    query("SELECT slug, updated_at FROM places WHERE status = 'active'", []),
    query("SELECT slug, updated_at FROM blog_posts WHERE is_published = true", []),
    query("SELECT slug FROM categories", []),
  ]);

  const urls = [
    { loc: baseUrl, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/places`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/blog`, priority: '0.9', changefreq: 'daily' },
    ...places.rows.map((p: any) => ({
      loc: `${baseUrl}/places/${p.slug}`,
      lastmod: p.updated_at,
      priority: '0.8',
      changefreq: 'weekly',
    })),
    ...posts.rows.map((p: any) => ({
      loc: `${baseUrl}/blog/${p.slug}`,
      lastmod: p.updated_at,
      priority: '0.7',
      changefreq: 'monthly',
    })),
    ...categories.rows.map((c: any) => ({
      loc: `${baseUrl}/category/${c.slug}`,
      priority: '0.6',
      changefreq: 'weekly',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
```

---

## Schema.org Structured Data

### Place Schema

```typescript
// src/lib/schema/place.ts
export function generatePlaceSchema(place: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: place.name,
    description: place.description,
    url: `https://sanliurfa.com/places/${place.slug}`,
    image: place.images?.[0],
    geo: {
      '@type': 'GeoCoordinates',
      latitude: place.latitude,
      longitude: place.longitude,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Şanlıurfa',
      addressRegion: 'Şanlıurfa',
      addressCountry: 'TR',
      streetAddress: place.address,
    },
    aggregateRating: place.rating ? {
      '@type': 'AggregateRating',
      ratingValue: place.rating,
      reviewCount: place.reviewCount,
    } : undefined,
    openingHoursSpecification: place.hours?.map((h: any) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.day,
      opens: h.opens,
      closes: h.closes,
    })),
    priceRange: place.priceRange,
    telephone: place.phone,
  };
}
```

### Article/Blog Schema

```typescript
// src/lib/schema/article.ts
export function generateArticleSchema(post: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.author?.name,
      url: post.author?.url,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Şanlıurfa.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sanliurfa.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://sanliurfa.com/blog/${post.slug}`,
    },
  };
}
```

### Breadcrumb Schema

```typescript
// src/lib/schema/breadcrumb.ts
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

---

## Image Optimization

### Automatic Image Processing

```typescript
// src/lib/image-optimization.ts
import sharp from 'sharp';
import path from 'path';

export async function optimizeImage(inputPath: string, outputDir: string) {
  const filename = path.basename(inputPath, path.extname(inputPath));
  
  const sizes = [
    { width: 400, suffix: 'sm' },
    { width: 800, suffix: 'md' },
    { width: 1200, suffix: 'lg' },
    { width: 1600, suffix: 'xl' },
  ];

  const results = [];

  for (const size of sizes) {
    // WebP
    const webpPath = path.join(outputDir, `${filename}-${size.suffix}.webp`);
    await sharp(inputPath)
      .resize(size.width, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(webpPath);

    // JPEG fallback
    const jpegPath = path.join(outputDir, `${filename}-${size.suffix}.jpg`);
    await sharp(inputPath)
      .resize(size.width, null, { withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toFile(jpegPath);

    results.push({
      width: size.width,
      webp: webpPath,
      jpeg: jpegPath,
    });
  }

  return results;
}
```

### Responsive Image Component

```astro
---
// src/components/ResponsiveImage.astro
interface Props {
  src: string;
  alt: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
}

const { src, alt, sizes = '100vw', loading = 'lazy' } = Astro.props;

// Generate srcset for different sizes
const sizes_list = [400, 800, 1200, 1600];
const srcset_webp = sizes_list.map(w => `/${src}-${w}.webp ${w}w`).join(', ');
const srcset_jpg = sizes_list.map(w => `/${src}-${w}.jpg ${w}w`).join(', ');
---

<picture>
  <source 
    type="image/webp" 
    srcset={srcset_webp} 
    sizes={sizes}
  />
  <source 
    type="image/jpeg" 
    srcset={srcset_jpg} 
    sizes={sizes}
  />
  <img 
    src={`/${src}-800.jpg`} 
    alt={alt} 
    loading={loading}
    decoding="async"
    class="w-full h-auto"
  />
</picture>
```

---

## Performance Optimization

### Critical CSS Extraction

```typescript
// scripts/extract-critical-css.ts
import { generate } from 'critical';

const pages = [
  'https://sanliurfa.com/',
  'https://sanliurfa.com/places',
  'https://sanliurfa.com/blog',
];

async function extractCriticalCSS() {
  for (const page of pages) {
    const result = await generate({
      base: 'dist/',
      src: page,
      dimensions: [
        { width: 375, height: 667 },  // Mobile
        { width: 1920, height: 1080 }, // Desktop
      ],
    });

    // Inline critical CSS
    console.log(`Extracted ${result.css.length} bytes of critical CSS for ${page}`);
  }
}
```

### Resource Hints

Add to Layout.astro head:

```astro
<!-- Preconnect to critical domains -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- DNS prefetch for analytics -->
<link rel="dns-prefetch" href="https://www.google-analytics.com" />

<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />

<!-- Preload LCP image -->
<link rel="preload" href="/images/hero.webp" as="image" type="image/webp" />
```

---

## Monitoring

### Google Search Console Integration

```typescript
// scripts/search-console.ts
import { google } from 'googleapis';

async function fetchSearchAnalytics() {
  const searchconsole = google.searchconsole('v1');
  
  const response = await searchconsole.searchanalytics.query({
    siteUrl: 'https://sanliurfa.com/',
    requestBody: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      dimensions: ['query', 'page'],
      rowLimit: 1000,
    },
  });

  return response.data.rows;
}
```

### Rank Tracking

```typescript
// scripts/rank-tracker.ts
import puppeteer from 'puppeteer';

async function checkGoogleRanking(keyword: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(keyword)}`);
  
  const results = await page.$$eval('div.g', (links: Element[]) =>
    links.map((link, index) => ({
      position: index + 1,
      url: link.querySelector('a')?.getAttribute('href'),
      title: link.querySelector('h3')?.textContent,
    }))
  );

  const ourPosition = results.find(r => r.url?.includes('sanliurfa.com'));
  
  await browser.close();
  
  return ourPosition;
}
```

---

## SEO Checklist

### On-Page SEO
- [ ] Unique, descriptive title tags (< 60 chars)
- [ ] Meta descriptions (< 160 chars)
- [ ] One H1 per page
- [ ] Semantic HTML structure
- [ ] Image alt text
- [ ] Internal linking
- [ ] Schema.org markup
- [ ] Canonical URLs
- [ ] Open Graph tags
- [ ] Twitter Cards

### Technical SEO
- [ ] HTTPS enabled
- [ ] Mobile responsive
- [ ] Fast loading (< 3s LCP)
- [ ] XML sitemap
- [ ] robots.txt
- [ ] Clean URLs
- [ ] 301 redirects
- [ ] Custom 404 page
- [ ] Breadcrumb navigation
- [ ] Pagination with rel=prev/next

### Content
- [ ] Keyword research
- [ ] High-quality content
- [ ] Regular updates
- [ ] Local content (Şanlıurfa focused)
- [ ] User-generated content (reviews)
- [ ] Image optimization
- [ ] Video content

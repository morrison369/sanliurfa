/**
 * Content Generation Bot API
 * Automatically generates blog posts using AI rules
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { query, queryOne } from '../../../../lib/postgres';
import { createPost } from '../../../../lib/blog/db';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../../lib/api';
import {
  generateBlogContentHTMLWithContext,
  generateSeoMetaDescription,
} from '../../../../lib/ai/ollama';
import { sanitizeHTML, stripHTML } from '../../../../lib/security/xss';

interface PlaceRow {
  id?: string | number;
  name: string;
  category?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  slug?: string;
  opening_hours?: string | Record<string, string> | null;
  rating?: string | number | null;
  review_count?: string | number | null;
  district_name?: string | null;
}

function placeContext(place: PlaceRow): string {
  return [
    `Mekan adı: ${place.name}`,
    `Kategori: ${place.category || 'Belirtilmemiş'}`,
    `İlçe: ${place.district_name || 'Şanlıurfa'}`,
    `Adres: ${place.address || 'Belirtilmemiş'}`,
    `Telefon: ${place.phone || 'Belirtilmemiş'}`,
    `Web sitesi: ${place.website || 'Belirtilmemiş'}`,
    `Çalışma saatleri: ${place.opening_hours ? JSON.stringify(place.opening_hours) : 'Belirtilmemiş'}`,
    `Puan: ${place.rating || 'Belirtilmemiş'}`,
    `Yorum sayısı: ${place.review_count || 'Belirtilmemiş'}`,
    `Mevcut açıklama: ${place.description || 'Belirtilmemiş'}`,
  ].join('\n');
}

function assertGeneratedContentQuality(content: string, title: string) {
  const plain = stripHTML(content).replace(/\s+/g, ' ').trim();
  const wordCount = plain.split(/\s+/).filter(Boolean).length;
  const h2Count = (content.match(/<h2\b/gi) || []).length;
  const h3Count = (content.match(/<h3\b/gi) || []).length;
  const hasFaq = /Sık Sorulan Sorular/i.test(plain);

  if (wordCount < 450) {
    throw new Error(`Ollama içerik kalite eşiği geçilemedi: ${title} için ${wordCount} kelime üretildi.`);
  }
  if (h2Count < 3) {
    throw new Error(`Ollama içerik kalite eşiği geçilemedi: ${title} için en az 3 H2 gerekli.`);
  }
  if (h3Count < 3 || !hasFaq) {
    throw new Error(`Ollama içerik kalite eşiği geçilemedi: ${title} için FAQ/H3 yapısı eksik.`);
  }
}

async function generatePlaceContent(place: PlaceRow): Promise<{ title: string; content: string; excerpt: string; metaDescription: string }> {
  const title = `${place.name} Şanlıurfa Rehberi: Adres, Özellikler ve Ziyaret Notları`;
  const keywords = [
    place.name,
    `Şanlıurfa ${place.name}`,
    place.category || 'Şanlıurfa mekanları',
    place.address || 'Şanlıurfa',
  ].filter((value): value is string => Boolean(value));
  const rawContent = await generateBlogContentHTMLWithContext(title, keywords, placeContext(place), 850);
  const content = sanitizeHTML(rawContent);
  assertGeneratedContentQuality(content, title);
  const plain = stripHTML(content).replace(/\s+/g, ' ').trim();
  const excerpt = plain.slice(0, 220) || `${place.name} hakkında adres, iletişim, çalışma saatleri ve ziyaret notları.`;
  const metaDescription = await generateSeoMetaDescription(title, 'mekan blog yazısı');

  return { title, content, excerpt, metaDescription };
}

async function generateCategoryGuideContent(category: string, places: PlaceRow[]): Promise<{ title: string; slug: string; content: string; excerpt: string; metaDescription: string }> {
  const title = `Şanlıurfa ${category} Rehberi: Öne Çıkan Mekanlar ve Yerel Tavsiyeler`;
  const slug = `sanliurfa-${category}-rehberi`;
  const placeList = places
    .map((place, index) => `${index + 1}. ${place.name} - ${place.address || 'Şanlıurfa'} - ${place.description || place.category || ''}`)
    .join('\n');
  const keywords = [`Şanlıurfa ${category}`, `${category} rehberi`, 'Şanlıurfa mekanları', ...places.slice(0, 5).map((p) => p.name)];
  const rawContent = await generateBlogContentHTMLWithContext(
    title,
    keywords,
    `Kategori: ${category}\nDoğrulanmış mekan listesi:\n${placeList}`,
    1100,
  );
  const content = sanitizeHTML(rawContent);
  assertGeneratedContentQuality(content, title);
  const plain = stripHTML(content).replace(/\s+/g, ' ').trim();
  const excerpt = plain.slice(0, 220) || `Şanlıurfa ${category} kategorisinde öne çıkan mekanlar ve pratik öneriler.`;
  const metaDescription = await generateSeoMetaDescription(title, 'kategori rehberi');

  return { title, slug, content, excerpt, metaDescription };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-content-bot-unauthorized',
        instance: '/api/admin/content-bot/generate',
      });
    }

    const body = await request.json();
    const { type, category, placeIds } = body;

    if (type === 'places') {
      // Generate content for specific places
      const places = await query(
        `SELECT p.*, c.name AS category_name, d.name AS district_name
         FROM places p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN districts d ON d.id = p.district_id
         WHERE p.id = ANY($1)`,
        [placeIds]
      );

      // Batch category lookup — one query instead of one per place
      const uniqueCatSlugs = [...new Set(
        places.rows.map((p: { category?: string }) =>
          p.category === 'tarihi-yerler' ? 'tarih' : (p.category ?? '')
        ).filter(Boolean)
      )];
      const catRows = uniqueCatSlugs.length > 0
        ? await query('SELECT id, slug FROM blog_categories WHERE slug = ANY($1)', [uniqueCatSlugs])
        : { rows: [] };
      const categoryMap = new Map<string, string>(
        catRows.rows.map((r: { id: string; slug: string }) => [r.slug, r.id])
      );

      const generated = [];
      for (const place of places.rows) {
        const normalizedPlace = { ...place, category: place.category_name || place.category };
        const { title, content, excerpt, metaDescription } = await generatePlaceContent(normalizedPlace);

        // Create slug
        const slug = place.name
          .toLowerCase()
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ı/g, 'i')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const catSlug = place.category === 'tarihi-yerler' ? 'tarih' : place.category;
        const catResult = catSlug ? { id: categoryMap.get(catSlug) } : null;

        // Unique constraint on slug is the race-safe check (HARD RULE #47)
        try {
          const post = await createPost({
            title,
            slug,
            excerpt,
            content,
            content_html: content,
            ...(catResult?.id ? { category_id: catResult.id } : {}),
            author_id: auth.user.id,
            author_name: 'Ollama İçerik Botu',
            status: 'draft',
            meta_title: title.slice(0, 65),
            meta_description: metaDescription,
          });
          generated.push({ place: place.name, status: 'created', postId: post.id });
        } catch (dupErr: any) {
          if (dupErr?.code === '23505') {
            generated.push({ place: place.name, status: 'skipped', reason: 'Already exists' });
          } else {
            throw dupErr;
          }
        }
      }

      return apiResponse({ success: true, generated }, HttpStatus.OK);
    }

    if (type === 'category-guide') {
      // Generate category guide
      const places = await query(
        'SELECT * FROM places WHERE category = $1 LIMIT 10',
        [category]
      );

      const { title, slug, content, excerpt, metaDescription } = await generateCategoryGuideContent(category, places.rows);

      const post = await createPost({
        title,
        slug,
        excerpt,
        content,
        content_html: content,
        category_id: (await queryOne('SELECT id FROM blog_categories WHERE slug = $1', [category === 'restoran' ? 'yemek' : 'gezi']))?.id,
        author_id: auth.user.id,
        author_name: 'Ollama İçerik Botu',
        status: 'draft',
        is_featured: true,
        meta_title: title.slice(0, 65),
        meta_description: metaDescription,
      });

      return apiResponse({ 
        success: true, 
        post: { id: post.id, title: post.title, slug: post.slug }
      }, HttpStatus.OK);
    }

    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'Geçersiz type. places veya category-guide kullanın',
      type: '/problems/admin-content-bot-validation',
      instance: '/api/admin/content-bot/generate',
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'İçerik Üretimi Başarısız',
      detail: safeErrorDetail(error, 'Generation failed'),
      type: '/problems/admin-content-bot-failed',
      instance: '/api/admin/content-bot/generate',
    });
  }
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-content-bot-unauthorized',
        instance: '/api/admin/content-bot/generate',
      });
    }

    const [jobs, categories, placesWithoutContent] = await Promise.all([
      query(
        `SELECT * FROM content_generation_jobs
         ORDER BY created_at DESC
         LIMIT 20`
      ),
      query(`SELECT DISTINCT category FROM places WHERE category IS NOT NULL`),
      query(
        `SELECT p.id, p.name, p.category
         FROM places p
         LEFT JOIN blog_posts bp ON bp.slug = LOWER(REGEXP_REPLACE(p.name, '[^a-zA-Z0-9]', '-', 'g'))
         WHERE bp.id IS NULL
         LIMIT 50`
      ),
    ]);

    return apiResponse({
      jobs: jobs.rows,
      categories: categories.rows.map((r) => r.category),
      placesWithoutContent: placesWithoutContent.rows,
    }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'İçerik Bot Verileri Alınamadı',
      detail: safeErrorDetail(error, 'Failed to get data'),
      type: '/problems/admin-content-bot-get-failed',
      instance: '/api/admin/content-bot/generate',
    });
  }
};

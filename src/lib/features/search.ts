/**
 * search.ts - Gelişmiş arama işlevselliği modülü
 *
 * Bu modül, Şanlıurfa.com sitesi için mekanlar, blog yazıları
 * ve etkinliklerde tam metin arama (full-text search) yapmayı,
 * ayrıca arama önerileri sunmayı sağlar. PostgreSQL tsvector
 * tam metin arama özelliği kullanılır.
 */

import { query } from "../postgres.js";

/**
 * Mekanlarda tam metin arama yapar. Filtreler ile sonuçları daraltabilir.
 *
 * @param query - Arama terimi
 * @param filters - Opsiyonel filtreler (kategori, min_puan, şehir, ilçe)
 * @returns Eşleşen mekan listesi
 */
export async function searchPlaces(
  searchQuery: string,
  filters?: {
    category?: string;
    min_rating?: number;
    city?: string;
    district?: string;
  }
): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    rating: number;
    city: string;
    district: string;
    rank: number;
  }>
> {
  let sql = `SELECT
    id, name, description, category, rating, city, district,
    ts_rank(
      to_tsvector('turkish', coalesce(name, '') || ' ' || coalesce(description, '')),
      plainto_tsquery('turkish', $1)
    ) AS rank
  FROM places
  WHERE to_tsvector('turkish', coalesce(name, '') || ' ' || coalesce(description, ''))
        @@ plainto_tsquery('turkish', $1)`;

  const values: (string | number)[] = [searchQuery];
  let paramIndex = 2;

  // Kategori filtresi
  if (filters?.category) {
    sql += ` AND category = $${paramIndex}`;
    values.push(filters.category);
    paramIndex++;
  }

  // Minimum puan filtresi
  if (filters?.min_rating !== undefined) {
    sql += ` AND rating >= $${paramIndex}`;
    values.push(filters.min_rating);
    paramIndex++;
  }

  // Şehir filtresi
  if (filters?.city) {
    sql += ` AND city = $${paramIndex}`;
    values.push(filters.city);
    paramIndex++;
  }

  // İlçe filtresi
  if (filters?.district) {
    sql += ` AND district = $${paramIndex}`;
    values.push(filters.district);
    paramIndex++;
  }

  sql += ` ORDER BY rank DESC, rating DESC LIMIT 50`;

  const result = await query(sql, values);

  return result.rows as Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    rating: number;
    city: string;
    district: string;
    rank: number;
  }>;
}

/**
 * Blog yazılarında tam metin arama yapar.
 *
 * @param searchQuery - Arama terimi
 * @returns Eşleşen blog yazıları listesi
 */
export async function searchBlogPosts(searchQuery: string): Promise<
  Array<{
    id: string;
    title: string;
    excerpt: string;
    slug: string;
    published_at: Date;
    rank: number;
  }>
> {
  const result = await query(
    `SELECT
      id, title, excerpt, slug, published_at,
      ts_rank(
        to_tsvector('turkish', coalesce(title, '') || ' ' || coalesce(excerpt, '')),
        plainto_tsquery('turkish', $1)
      ) AS rank
    FROM blog_posts
    WHERE to_tsvector('turkish', coalesce(title, '') || ' ' || coalesce(excerpt, ''))
          @@ plainto_tsquery('turkish', $1)
      AND status = 'published'
    ORDER BY rank DESC, published_at DESC
    LIMIT 50`,
    [searchQuery]
  );

  return result.rows as Array<{
    id: string;
    title: string;
    excerpt: string;
    slug: string;
    published_at: Date;
    rank: number;
  }>;
}

/**
 * Etkinliklerde tam metin arama yapar.
 *
 * @param searchQuery - Arama terimi
 * @returns Eşleşen etkinlikler listesi
 */
export async function searchEvents(searchQuery: string): Promise<
  Array<{
    id: string;
    title: string;
    description: string;
    event_date: Date;
    location: string;
    rank: number;
  }>
> {
  const result = await query(
    `SELECT
      id, title, description, event_date, location,
      ts_rank(
        to_tsvector('turkish', coalesce(title, '') || ' ' || coalesce(description, '')),
        plainto_tsquery('turkish', $1)
      ) AS rank
    FROM events
    WHERE to_tsvector('turkish', coalesce(title, '') || ' ' || coalesce(description, ''))
          @@ plainto_tsquery('turkish', $1)
    ORDER BY rank DESC, event_date ASC
    LIMIT 50`,
    [searchQuery]
  );

  return result.rows as Array<{
    id: string;
    title: string;
    description: string;
    event_date: Date;
    location: string;
    rank: number;
  }>;
}

/**
 * Arama çubuğu için otomatik tamamlama önerileri döndürür.
 * Mekan adları ve blog başlıklarından öneriler toplar.
 *
 * @param searchQuery - Kullanıcının yazdığı terim
 * @param limit - Döndürülecek öneri sayısı (varsayılan: 5)
 * @returns Öneri listesi (suggestion metni ve kaynak türü)
 */
export async function getSearchSuggestions(
  searchQuery: string,
  limit: number = 5
): Promise<Array<{ suggestion: string; type: string }>> {
  // Mekan adlarından öneriler
  const placesResult = await query(
    `SELECT DISTINCT name AS suggestion, 'place' AS type
     FROM places
     WHERE to_tsvector('turkish', name)
           @@ to_tsquery('turkish', $1 || ':*')
     LIMIT $2`,
    [searchQuery, limit]
  );

  // Blog başlıklarından öneriler
  const blogResult = await query(
    `SELECT DISTINCT title AS suggestion, 'blog' AS type
     FROM blog_posts
     WHERE status = 'published'
       AND to_tsvector('turkish', title)
         @@ to_tsquery('turkish', $1 || ':*')
     LIMIT $2`,
    [searchQuery, limit]
  );

  // Etkinlik başlıklarından öneriler
  const eventsResult = await query(
    `SELECT DISTINCT title AS suggestion, 'event' AS type
     FROM events
     WHERE to_tsvector('turkish', title)
           @@ to_tsquery('turkish', $1 || ':*')
     LIMIT $2`,
    [searchQuery, limit]
  );

  // Tüm önerileri birleştir ve sınırlandır
  const allSuggestions = [
    ...placesResult.rows,
    ...blogResult.rows,
    ...eventsResult.rows,
  ] as Array<{ suggestion: string; type: string }>;

  return allSuggestions.slice(0, limit);
}

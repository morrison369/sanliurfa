/**
 * analytics.ts - Sayfa görüntüleme takibi ve analitik modülü
 *
 * Bu modül, Şanlıurfa.com sitesi için sayfa görüntüleme takibi,
 * popüler sayfaların analizi ve tarih aralığına göre istatistik
 * toplama işlevlerini sağlar. PostgreSQL veritabanı kullanılır.
 */

import { query } from "../postgres.js";

/**
 * Sayfa görüntüleme kaydını veritabanına ekler.
 *
 * @param path - Görüntülenen sayfanın yolu (örn: "/mekanlar/balikligol")
 * @param userId - Oturum açmış kullanıcının kimliği (opsiyonel)
 */
export async function trackPageView(path: string, userId?: string): Promise<void> {
  await query(
    `INSERT INTO page_views (path, user_id, viewed_at)
     VALUES ($1, $2, NOW())`,
    [path, userId || null]
  );
}

/**
 * En çok görüntülenen sayfaları listeler.
 *
 * @param limit - Döndürülecek sayfa sayısı (varsayılan: 10)
 * @returns Sayfa yolları ve görüntülenme sayıları
 */
export async function getPopularPages(limit: number = 10): Promise<Array<{ path: string; views: number }>> {
  const result = await query(
    `SELECT path, COUNT(*)::integer AS views
     FROM page_views
     WHERE viewed_at >= NOW() - INTERVAL '30 days'
     GROUP BY path
     ORDER BY views DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows as Array<{ path: string; views: number }>;
}

/**
 * Belirli bir tarih aralığındaki sayfa görüntüleme istatistiklerini döndürür.
 *
 * @param startDate - Başlangıç tarihi
 * @param endDate - Bitiş tarihi
 * @returns Günlük toplam görüntülenme sayısı
 */
export async function getStatsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; views: number; unique_users: number }>> {
  const result = await query(
    `SELECT
       DATE(viewed_at)::text AS date,
       COUNT(*)::integer AS views,
       COUNT(DISTINCT user_id)::integer AS unique_users
     FROM page_views
     WHERE viewed_at >= $1 AND viewed_at < $2
     GROUP BY DATE(viewed_at)
     ORDER BY date ASC`,
    [startDate, endDate]
  );

  return result.rows as Array<{ date: string; views: number; unique_users: number }>;
}

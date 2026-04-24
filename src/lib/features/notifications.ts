/**
 * notifications.ts - Kullanıcı bildirim sistemi modülü
 *
 * Bu modül, Sanliurfa.com kullanıcıları için bildirim oluşturma,
 * listeleme, okundu olarak işaretleme ve toplu okundu işaretleme
 * işlevlerini sağlar. PostgreSQL veritabanı kullanılır.
 */

import { query } from "../postgres.js";

/**
 * Kullanıcıya yeni bir bildirim gönderir.
 *
 * @param userId - Bildirimi alacak kullanıcının kimliği
 * @param type - Bildirim türü (örn: "yorum", "takip", "beğeni", "etkinlik")
 * @param title - Bildirim başlığı
 * @param message - Bildirim içeriği
 * @param link - Tıklanınca gidilecek sayfa bağlantısı (opsiyonel)
 * @returns Oluşturulan bildirimin kimliği
 */
export async function sendNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
): Promise<string> {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, message, action_url, created_at, read)
     VALUES ($1, $2, $3, $4, $5, NOW(), false)
     RETURNING id`,
    [userId, type, title, message, link || null]
  );

  return result.rows[0].id as string;
}

/**
 * Kullanıcının bildirimlerini listeler.
 *
 * @param userId - Bildirimleri alınacak kullanıcının kimliği
 * @param limit - Döndürülecek bildirim sayısı (varsayılan: 20)
 * @param offset - Atlama sayısı (sayfalama için, varsayılan: 0)
 * @returns Bildirim listesi
 */
export async function getNotifications(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<
  Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    is_read: boolean;
    created_at: Date;
  }>
> {
  const result = await query(
    `SELECT id, type, title, message, link, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows as Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    is_read: boolean;
    created_at: Date;
  }>;
}

/**
 * Tek bir bildirimi okundu olarak işaretler.
 *
 * @param notificationId - Okundu işaretlenecek bildirimin kimliği
 * @param userId - Bildirimin sahibi kullanıcının kimliği (güvenlik doğrulaması için)
 */
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await query(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
}

/**
 * Kullanıcının tüm okunmamış bildirimlerini okundu olarak işaretler.
 *
 * @param userId - Tüm bildirimleri okundu işaretlenecek kullanıcının kimliği
 * @returns Etkilenen satır sayısı
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await query(
    `UPDATE notifications
     SET is_read = true
     WHERE user_id = $1 AND is_read = false
     RETURNING id`,
    [userId]
  );

  return result.rowCount || 0;
}

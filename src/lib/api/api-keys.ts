/**
 * API Keys Sistemi - Ucuncu taraf entegrasyonlari
 */

import crypto from 'crypto';
import { pool, queryOne, queryMany } from '../postgres';
import { logger } from '../logger';
import { checkRateLimit } from '../cache';

/**
 * API key oluştur
 */
export async function createApiKey(
  userId: string,
  name: string,
  scopes: string[] = ['read'],
  expiresInDays?: number
): Promise<{ id: string; key: string } | null> {
  try {
    // Key'i oluştur
    const key = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null;

    const result = await queryOne<{id: string}>(
      `INSERT INTO api_keys (user_id, name, key_hash, scopes, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      [userId, name, keyHash, scopes, expiresAt]
    );

    const keyId = result?.id;

    logger.info('API key olusturuldu', {
      keyId,
      userId,
      scopes,
      expiresAt: expiresAt?.toISOString()
    });

    return { id: keyId, key };
  } catch (error) {
    logger.error('API key olusturulurken hata', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * API key'i doğrula
 */
export async function validateApiKey(
  key: string,
  ipAddress?: string
): Promise<{ userId: string; scopes: string[]; rateLimitRemaining: number } | null> {
  try {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const result = await queryOne<{
      id: string;
      user_id: string;
      scopes: string[];
      rate_limit: number;
      rate_limit_window: number;
      expires_at: string;
      active: boolean;
    }>(
      `SELECT id, user_id, scopes, rate_limit, rate_limit_window, expires_at, active
      FROM api_keys
      WHERE key_hash = $1`,
      [keyHash]
    );

    if (!result) {
      logger.warn('Gecersiz API key girisimlendi', Object.assign(new Error('Gecersiz API key girisimlendi'), { ipAddress }));
      return null;
    }

    const apiKey = result;

    // Kontrol et: aktif mi
    if (!apiKey.active) {
      logger.warn('Deaktif API key kullanılmaya çalışıldı', Object.assign(new Error('Deaktif API key kullanılmaya çalışıldı'), { userId: apiKey.user_id }));
      return null;
    }

    // Kontrol et: süresi dolmamış mı
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      logger.warn('Süresi dolan API key kullanılmaya çalışıldı', Object.assign(new Error('Süresi dolan API key kullanılmaya çalışıldı'), { userId: apiKey.user_id }));
      return null;
    }

    // Rate limit kontrol et
    const rateLimitKey = `sanliurfa:api_key_rate:${apiKey.id}`;
    const limited = await checkRateLimit(ipAddress || 'unknown', apiKey.rate_limit, apiKey.rate_limit_window);

    if (!limited) {
      logger.warn('API key rate limit aşıldı', Object.assign(new Error('API key rate limit aşıldı'), {
        keyId: apiKey.id,
        userId: apiKey.user_id,
        ipAddress
      }));
      return null;
    }

    // Last used'ı güncelle
    await pool.query(
      `UPDATE api_keys SET last_used_at = NOW(), last_ip_address = $1 WHERE id = $2`,
      [ipAddress || null, apiKey.id]
    );

    return {
      userId: apiKey.user_id,
      scopes: apiKey.scopes || [],
      rateLimitRemaining: apiKey.rate_limit
    };
  } catch (error) {
    logger.error('API key dogrulanırken hata', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * API key'i sil
 */
export async function deleteApiKey(keyId: string, userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM api_keys WHERE id = $1 AND user_id = $2`,
      [keyId, userId]
    );

    if ((result.rowCount || 0) > 0) {
      logger.info('API key silindi', { keyId, userId });
    }

    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('API key silinirken hata', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Kullanıcının API key'lerini al
 */
export async function getUserApiKeys(userId: string): Promise<Array<{ id: string; name: string; scopes: string[]; active: boolean; created_at: string; last_used_at?: string; expires_at?: string }>> {
  try {
    const result = await queryMany(
      `SELECT id, name, scopes, active, created_at, last_used_at, expires_at
      FROM api_keys
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [userId]
    );

    return result;
  } catch (error) {
    logger.error('Kullanici API key\'leri alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * API key kullanımını kaydet
 */
export async function logApiKeyUsage(
  keyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  ipAddress?: string,
  userAgent?: string,
  responseTimeMs?: number
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO api_key_usage (api_key_id, endpoint, method, status_code, ip_address, user_agent, response_time_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [keyId, endpoint, method, statusCode, ipAddress || null, userAgent || null, responseTimeMs || null]
    );
  } catch (error) {
    logger.error('API key kullanımı kaydedilirken hata', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * API key kullanım istatistikleri
 */
export async function getApiKeyUsageStats(keyId: string, days: number = 7): Promise<any> {
  try {
    const result = await queryOne<{
      total_requests: number;
      days_active: number;
      unique_endpoints: number;
      avg_response_time: number;
      max_response_time: number;
      successful_requests: number;
      failed_requests: number;
    }>(
      `SELECT
        COUNT(*) as total_requests,
        COUNT(DISTINCT DATE(created_at)) as days_active,
        COUNT(DISTINCT endpoint) as unique_endpoints,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful_requests,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests
      FROM api_key_usage
      WHERE api_key_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`,
      [keyId]
    );

    return result || {};
  } catch (error) {
    logger.error('API key istatistikleri alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return {};
  }
}



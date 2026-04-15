/**
 * Rate Limiting Middleware
 * API isteklerini sınırlar
 */

import { query } from '../postgres';
import { logger } from '../logging';

interface RateLimitConfig {
  windowMs: number;  // Zaman penceresi (ms)
  maxRequests: number;  // Maksimum istek sayısı
  keyPrefix?: string;  // Redis key prefix
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,  // 15 dakika
  maxRequests: 100,  // 100 istek
  keyPrefix: 'rl:'
};

export async function rateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const conf = { ...defaultConfig, ...config };
  const key = `${conf.keyPrefix}${identifier}`;
  const now = Date.now();
  const windowStart = now - conf.windowMs;

  try {
    // Eski kayıtları temizle
    await query(
      `DELETE FROM rate_limit_logs 
       WHERE key = $1 AND timestamp < $2`,
      [key, new Date(windowStart)]
    );

    // Mevcut istek sayısını al
    const countResult = await query(
      `SELECT COUNT(*) as count FROM rate_limit_logs 
       WHERE key = $1`,
      [key]
    );

    const currentCount = parseInt(countResult.rows[0].count);

    if (currentCount >= conf.maxRequests) {
      // Son isteğin zamanını al
      const lastResult = await query(
        `SELECT timestamp FROM rate_limit_logs 
         WHERE key = $1 ORDER BY timestamp DESC LIMIT 1`,
        [key]
      );
      
      const lastRequest = new Date(lastResult.rows[0]?.timestamp || now);
      const resetTime = lastRequest.getTime() + conf.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetTime
      };
    }

    // Yeni isteği kaydet
    await query(
      `INSERT INTO rate_limit_logs (key, identifier, timestamp)
       VALUES ($1, $2, NOW())`,
      [key, identifier]
    );

    return {
      allowed: true,
      remaining: conf.maxRequests - currentCount - 1,
      resetTime: now + conf.windowMs
    };

  } catch (error) {
    logger.error('Rate limit error:', error);
    // Hata durumunda izin ver (fail open)
    return { allowed: true, remaining: 1, resetTime: now + conf.windowMs };
  }
}

// IP bazlı rate limit
export async function rateLimitByIP(
  ip: string,
  config?: Partial<RateLimitConfig>
): Promise<{ allowed: boolean; remaining: number; resetTime: number; headers: Record<string, string> }> {
  const result = await rateLimit(`ip:${ip}`, config);
  
  return {
    ...result,
    headers: {
      'X-RateLimit-Limit': String(config?.maxRequests || defaultConfig.maxRequests),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000))
    }
  };
}

// User bazlı rate limit
export async function rateLimitByUser(
  userId: string,
  config?: Partial<RateLimitConfig>
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  return rateLimit(`user:${userId}`, {
    ...config,
    maxRequests: config?.maxRequests || 1000  // Kullanıcılar için daha yüksek limit
  });
}

// Endpoint bazlı rate limit
export async function rateLimitByEndpoint(
  ip: string,
  endpoint: string,
  config?: Partial<RateLimitConfig>
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const endpointLimits: Record<string, number> = {
    '/api/auth/login': 5,      // 5 deneme
    '/api/auth/register': 3,   // 3 kayıt
    '/api/contact': 10,        // 10 mesaj
    '/api/places/apply': 5     // 5 başvuru
  };

  const maxRequests = endpointLimits[endpoint] || config?.maxRequests || 100;
  
  return rateLimit(`endpoint:${endpoint}:${ip}`, {
    ...config,
    maxRequests,
    windowMs: 60 * 60 * 1000  // 1 saat
  });
}

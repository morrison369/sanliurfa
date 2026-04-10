/**
 * Rate Limiting & IP Management Library
 * API rate limiting, IP whitelist/blacklist, DDoS protection
 */

import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';

interface RateLimitRule {
  id: string;
  user_id?: string;
  ip_address: string;
  endpoint_pattern: string;
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  is_active: boolean;
  is_whitelisted: boolean;
}

interface IPStatus {
  ip_address: string;
  is_whitelisted: boolean;
  is_blacklisted: boolean;
  requests_count: number;
  blocked_until?: Date;
}

// Check if IP is whitelisted
export async function isIPWhitelisted(ipAddress: string): Promise<boolean> {
  try {
    const cacheKey = `sanliurfa:whitelist:${ipAddress}`;
    const cached = await getCache(cacheKey);

    if (cached !== null) {
      return cached === 'true';
    }

    const whitelist = await queryOne(
      'SELECT * FROM ip_whitelist WHERE (ip_address = $1 OR $1::inet << ip_range) AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())',
      [ipAddress]
    );

    const isWhitelisted = !!whitelist;
    await setCache(cacheKey, isWhitelisted ? 'true' : 'false', 3600);
    return isWhitelisted;
  } catch (error) {
    logger.error('Failed to check IP whitelist', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Check if IP is blacklisted
export async function isIPBlacklisted(ipAddress: string): Promise<boolean> {
  try {
    const cacheKey = `sanliurfa:blacklist:${ipAddress}`;
    const cached = await getCache(cacheKey);

    if (cached !== null) {
      return cached === 'true';
    }

    const blacklist = await queryOne(
      'SELECT * FROM ip_blacklist WHERE (ip_address = $1 OR $1::inet << ip_range) AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())',
      [ipAddress]
    );

    const isBlacklisted = !!blacklist;
    await setCache(cacheKey, isBlacklisted ? 'true' : 'false', 300);
    return isBlacklisted;
  } catch (error) {
    logger.error('Failed to check IP blacklist', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Add IP to whitelist
export async function addToWhitelist(ipAddress: string, name: string, reason: string, createdBy: string, expiresAt?: Date): Promise<boolean> {
  try {
    await insert('ip_whitelist', {
      ip_address: ipAddress,
      name: name,
      reason: reason,
      created_by_user_id: createdBy,
      is_active: true,
      expires_at: expiresAt || null
    });

    await deleteCache(`sanliurfa:whitelist:${ipAddress}`);
    logger.info('IP whitelisted', { ipAddress, reason });
    return true;
  } catch (error) {
    logger.error('Failed to add to whitelist', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Add IP to blacklist
export async function addToBlacklist(ipAddress: string, reason: string, severity: 'low' | 'medium' | 'high', createdBy: string, expiresAt?: Date): Promise<boolean> {
  try {
    await insert('ip_blacklist', {
      ip_address: ipAddress,
      reason: reason,
      severity: severity,
      block_reason: `Manually blocked: ${reason}`,
      created_by_user_id: createdBy,
      is_active: true,
      expires_at: expiresAt || null
    });

    await deleteCache(`sanliurfa:blacklist:${ipAddress}`);
    logger.warn('IP blacklisted', { ipAddress, reason, severity });
    return true;
  } catch (error) {
    logger.error('Failed to add to blacklist', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Remove IP from whitelist
export async function removeFromWhitelist(ipAddress: string): Promise<boolean> {
  try {
    await queryOne('DELETE FROM ip_whitelist WHERE ip_address = $1', [ipAddress]);
    await deleteCache(`sanliurfa:whitelist:${ipAddress}`);
    logger.info('IP removed from whitelist', { ipAddress });
    return true;
  } catch (error) {
    logger.error('Failed to remove from whitelist', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Remove IP from blacklist
export async function removeFromBlacklist(ipAddress: string): Promise<boolean> {
  try {
    await queryOne('DELETE FROM ip_blacklist WHERE ip_address = $1', [ipAddress]);
    await deleteCache(`sanliurfa:blacklist:${ipAddress}`);
    logger.info('IP removed from blacklist', { ipAddress });
    return true;
  } catch (error) {
    logger.error('Failed to remove from blacklist', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Record API request for rate limiting
export async function recordRequest(userId: string | null, ipAddress: string, endpoint: string, method: string, statusCode: number, responseMsTime: number, requestSize: number, responseSize: number): Promise<void> {
  try {
    await insert('request_metrics', {
      user_id: userId,
      ip_address: ipAddress,
      endpoint: endpoint,
      method: method,
      status_code: statusCode,
      response_time_ms: responseMsTime,
      request_size_bytes: requestSize,
      response_size_bytes: responseSize,
      timestamp: new Date()
    });

    // Update rate limit counter in cache
    const minuteKey = `sanliurfa:ratelimit:${ipAddress}:minute:${Math.floor(Date.now() / 60000)}`;
    const hourKey = `sanliurfa:ratelimit:${ipAddress}:hour:${Math.floor(Date.now() / 3600000)}`;
    const dayKey = `sanliurfa:ratelimit:${ipAddress}:day:${Math.floor(Date.now() / 86400000)}`;

    let minuteCount = await getCache(minuteKey);
    let hourCount = await getCache(hourKey);
    let dayCount = await getCache(dayKey);

    const newMinuteCount = (minuteCount ? parseInt(minuteCount) : 0) + 1;
    const newHourCount = (hourCount ? parseInt(hourCount) : 0) + 1;
    const newDayCount = (dayCount ? parseInt(dayCount) : 0) + 1;

    await setCache(minuteKey, newMinuteCount.toString(), 60);
    await setCache(hourKey, newHourCount.toString(), 3600);
    await setCache(dayKey, newDayCount.toString(), 86400);
  } catch (error) {
    logger.error('Failed to record request', error instanceof Error ? error : new Error(String(error)));
  }
}

// Check rate limit for IP or user
export async function checkRateLimit(ipAddress: string, userId?: string, endpoint?: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  try {
    // Check if IP is whitelisted
    const whitelisted = await isIPWhitelisted(ipAddress);
    if (whitelisted) {
      return { allowed: true, remaining: 999999, resetAt: Date.now() + 3600000 };
    }

    // Check if IP is blacklisted
    const blacklisted = await isIPBlacklisted(ipAddress);
    if (blacklisted) {
      return { allowed: false, remaining: 0, resetAt: Date.now() + 3600000 };
    }

    // Get rate limit rule for this IP/endpoint
    let rule = null;
    if (userId && endpoint) {
      rule = await queryOne(
        'SELECT * FROM api_rate_limits WHERE user_id = $1 AND endpoint_pattern = $2 AND is_active = true',
        [userId, endpoint]
      );
    }

    if (!rule) {
      rule = await queryOne(
        'SELECT * FROM api_rate_limits WHERE ip_address = $1 AND is_active = true',
        [ipAddress]
      );
    }

    // Default limits
    const limits = rule || {
      requests_per_minute: 60,
      requests_per_hour: 1000,
      requests_per_day: 10000
    };

    // Check minute limit
    const minuteKey = `sanliurfa:ratelimit:${ipAddress}:minute:${Math.floor(Date.now() / 60000)}`;
    const minuteCount = parseInt(await getCache(minuteKey) || '0');

    if (minuteCount >= limits.requests_per_minute) {
      return { allowed: false, remaining: 0, resetAt: Date.now() + 60000 };
    }

    // Check hour limit
    const hourKey = `sanliurfa:ratelimit:${ipAddress}:hour:${Math.floor(Date.now() / 3600000)}`;
    const hourCount = parseInt(await getCache(hourKey) || '0');

    if (hourCount >= limits.requests_per_hour) {
      return { allowed: false, remaining: 0, resetAt: Date.now() + 3600000 };
    }

    // Check day limit
    const dayKey = `sanliurfa:ratelimit:${ipAddress}:day:${Math.floor(Date.now() / 86400000)}`;
    const dayCount = parseInt(await getCache(dayKey) || '0');

    if (dayCount >= limits.requests_per_day) {
      return { allowed: false, remaining: 0, resetAt: Date.now() + 86400000 };
    }

    const remaining = Math.min(
      limits.requests_per_minute - minuteCount,
      limits.requests_per_hour - hourCount,
      limits.requests_per_day - dayCount
    );

    return { allowed: true, remaining, resetAt: Date.now() + 60000 };
  } catch (error) {
    logger.error('Failed to check rate limit', error instanceof Error ? error : new Error(String(error)));
    return { allowed: true, remaining: 100, resetAt: Date.now() + 60000 }; // Fail open
  }
}

// Get rate limit status for dashboard
export async function getRateLimitStatus(ipAddress: string): Promise<any> {
  try {
    const minuteKey = `sanliurfa:ratelimit:${ipAddress}:minute:${Math.floor(Date.now() / 60000)}`;
    const hourKey = `sanliurfa:ratelimit:${ipAddress}:hour:${Math.floor(Date.now() / 3600000)}`;
    const dayKey = `sanliurfa:ratelimit:${ipAddress}:day:${Math.floor(Date.now() / 86400000)}`;

    const minuteCount = parseInt(await getCache(minuteKey) || '0');
    const hourCount = parseInt(await getCache(hourKey) || '0');
    const dayCount = parseInt(await getCache(dayKey) || '0');

    return {
      ip_address: ipAddress,
      requests_minute: minuteCount,
      requests_hour: hourCount,
      requests_day: dayCount,
      is_whitelisted: await isIPWhitelisted(ipAddress),
      is_blacklisted: await isIPBlacklisted(ipAddress)
    };
  } catch (error) {
    logger.error('Failed to get rate limit status', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

// Detect DDoS attempt
export async function detectDDoSAttempt(ipAddress: string, endpoint: string): Promise<boolean> {
  try {
    const timeWindow = Math.floor(Date.now() / 1000) - 60; // Last 60 seconds
    const attempts = await queryRows(
      'SELECT COUNT(*) as count FROM request_metrics WHERE ip_address = $1 AND endpoint = $2 AND EXTRACT(EPOCH FROM timestamp) > $3',
      [ipAddress, endpoint, timeWindow]
    );

    const count = parseInt(attempts[0]?.count || '0');

    if (count > 100) {
      // Potential DDoS attack
      const existing = await queryOne(
        'SELECT * FROM ddos_attempts WHERE ip_address = $1 AND is_mitigated = false',
        [ipAddress]
      );

      if (existing) {
        await update('ddos_attempts', { ip_address: ipAddress }, {
          request_count: existing.request_count + count,
          last_attempt_at: new Date(),
          severity: count > 500 ? 'high' : 'medium'
        });
      } else {
        await insert('ddos_attempts', {
          ip_address: ipAddress,
          endpoint: endpoint,
          request_count: count,
          severity: count > 500 ? 'high' : 'medium',
          first_attempt_at: new Date(),
          last_attempt_at: new Date()
        });

        // Auto-blacklist on high severity
        if (count > 500) {
          await addToBlacklist(ipAddress, 'Automatic DDoS protection', 'high', 'system', new Date(Date.now() + 3600000));
        }
      }

      logger.warn('DDoS attempt detected', { ipAddress, endpoint, count });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to detect DDoS', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Get request statistics
export async function getRequestStatistics(hours: number = 24): Promise<any> {
  try {
    const since = new Date(Date.now() - hours * 3600000);

    const stats = await queryRows(`
      SELECT
        endpoint,
        method,
        COUNT(*) as total_requests,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
      FROM request_metrics
      WHERE timestamp > $1
      GROUP BY endpoint, method
      ORDER BY total_requests DESC
      LIMIT 20
    `, [since]);

    return stats;
  } catch (error) {
    logger.error('Failed to get request statistics', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

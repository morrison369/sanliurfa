/**
 * Security Library
 * Audit logging, session management, device tracking, and data encryption
 */

import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';
import crypto from 'crypto';

interface SecurityEvent {
  id: string;
  user_id?: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip_address: string;
  description: string;
  is_suspicious: boolean;
}

interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_name: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  is_mobile: boolean;
  is_trusted: boolean;
  last_activity_at: Date;
  expires_at: Date;
  invalidated_at?: Date;
}

// Log security event
export async function logSecurityEvent(userId: string | null, eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', ipAddress: string, description: string, metadata?: any): Promise<SecurityEvent | null> {
  try {
    // Check for suspicious patterns
    const isSuspicious = await checkSuspiciousPattern(userId, eventType, ipAddress);

    const result = await insert('security_events', {
      user_id: userId,
      event_type: eventType,
      severity: severity,
      ip_address: ipAddress,
      description: description,
      metadata: metadata || {},
      is_suspicious: isSuspicious,
      is_reviewed: false,
      created_at: new Date()
    });

    if (isSuspicious) {
      logger.warn('Suspicious security event logged', { userId, eventType, severity, ipAddress });
    } else {
      logger.info('Security event logged', { userId, eventType, severity });
    }

    // Clear cache
    if (userId) {
      await deleteCache(`sanliurfa:user:security:${userId}`);
    }

    return result;
  } catch (error) {
    logger.error('Failed to log security event', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

// Check for suspicious patterns
async function checkSuspiciousPattern(userId: string | null, eventType: string, ipAddress: string): Promise<boolean> {
  try {
    // Check for multiple failed login attempts
    if (eventType === 'login_failed') {
      const failedLogins = await queryRows(
        'SELECT COUNT(*) as count FROM login_history WHERE user_id = $1 AND is_successful = false AND created_at > NOW() - INTERVAL \'30 minutes\'',
        [userId]
      );

      if (parseInt(failedLogins[0]?.count || '0') > 5) {
        return true;
      }
    }

    // Check for unusual IP addresses
    if (userId) {
      const recentIPs = await queryRows(
        'SELECT DISTINCT ip_address FROM login_history WHERE user_id = $1 AND created_at > NOW() - INTERVAL \'7 days\' LIMIT 10',
        [userId]
      );

      const knownIPs = recentIPs.map((r: any) => r.ip_address);
      if (knownIPs.length > 0 && !knownIPs.includes(ipAddress)) {
        // New IP address
        const geoDistant = await isIPGeographicallyDistant(knownIPs[0], ipAddress);
        if (geoDistant) {
          return true;
        }
      }
    }

    // Check for unusual access patterns
    if (eventType === 'unauthorized_access_attempt') {
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to check suspicious pattern', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

async function isIPGeographicallyDistant(ip1: string, ip2: string): Promise<boolean> {
  // In production, use a real GeoIP service
  // For now, return false (not distant)
  return false;
}

// Get suspicious activities for user
export async function getSuspiciousActivities(userId: string, limit: number = 20): Promise<SecurityEvent[]> {
  try {
    const cacheKey = `sanliurfa:user:security:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const events = await queryRows(
      'SELECT * FROM security_events WHERE user_id = $1 AND is_suspicious = true ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );

    await setCache(cacheKey, JSON.stringify(events), 300);
    return events;
  } catch (error) {
    logger.error('Failed to get suspicious activities', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

// Get security events audit trail
export async function getSecurityEvents(userId: string | null, eventType?: string, limit: number = 50): Promise<SecurityEvent[]> {
  try {
    let query = 'SELECT * FROM security_events WHERE';
    const params: any[] = [];

    if (userId) {
      query += ' user_id = $1';
      params.push(userId);
    } else {
      query += ' user_id IS NULL';
    }

    if (eventType) {
      query += ` AND event_type = $${params.length + 1}`;
      params.push(eventType);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const events = await queryRows(query, params);
    return events;
  } catch (error) {
    logger.error('Failed to get security events', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

// Create user session
export async function createUserSession(userId: string, deviceName: string, deviceType: string, browser: string, os: string, ipAddress: string, location: string, isMobile: boolean): Promise<UserSession | null> {
  try {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 3600000); // 24 hours

    const result = await insert('user_sessions', {
      user_id: userId,
      session_token: sessionToken,
      device_name: deviceName,
      device_type: deviceType,
      browser: browser,
      os: os,
      ip_address: ipAddress,
      location: location,
      is_mobile: isMobile,
      is_trusted: false,
      last_activity_at: new Date(),
      expires_at: expiresAt,
      invalidated_at: null
    });

    await deleteCache(`sanliurfa:user:sessions:${userId}`);
    logger.info('User session created', { userId, sessionToken: sessionToken.substring(0, 8), deviceType });

    // Log login event
    await insert('login_history', {
      user_id: userId,
      ip_address: ipAddress,
      location: location,
      device_type: deviceType,
      browser: browser,
      os: os,
      login_method: 'email_password',
      is_successful: true,
      failure_reason: null,
      created_at: new Date()
    });

    return result;
  } catch (error) {
    logger.error('Failed to create user session', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

// Get user sessions
export async function getUserSessions(userId: string): Promise<UserSession[]> {
  try {
    const cacheKey = `sanliurfa:user:sessions:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const sessions = await queryRows(
      'SELECT * FROM user_sessions WHERE user_id = $1 AND invalidated_at IS NULL ORDER BY last_activity_at DESC',
      [userId]
    );

    await setCache(cacheKey, JSON.stringify(sessions), 600);
    return sessions;
  } catch (error) {
    logger.error('Failed to get user sessions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

// Validate session token
export async function validateSession(sessionToken: string): Promise<UserSession | null> {
  try {
    const session = await queryOne(
      'SELECT * FROM user_sessions WHERE session_token = $1 AND invalidated_at IS NULL AND expires_at > NOW()',
      [sessionToken]
    );

    if (session) {
      // Update last activity
      await update('user_sessions', { session_token: sessionToken }, {
        last_activity_at: new Date()
      });
    }

    return session || null;
  } catch (error) {
    logger.error('Failed to validate session', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

// Invalidate session
export async function invalidateSession(sessionToken: string): Promise<boolean> {
  try {
    const session = await queryOne(
      'SELECT * FROM user_sessions WHERE session_token = $1',
      [sessionToken]
    );

    if (!session) return false;

    await update('user_sessions', { session_token: sessionToken }, {
      invalidated_at: new Date()
    });

    await deleteCache(`sanliurfa:user:sessions:${session.user_id}`);
    logger.info('Session invalidated', { userId: session.user_id });
    return true;
  } catch (error) {
    logger.error('Failed to invalidate session', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Mark device as trusted
export async function trustDevice(userId: string, deviceId: string, deviceName: string, userAgent: string, ipAddress: string): Promise<boolean> {
  try {
    const deviceFingerprint = crypto.createHash('sha256').update(userAgent).digest('hex');

    await insert('trusted_devices', {
      user_id: userId,
      device_id: deviceId,
      device_name: deviceName,
      device_fingerprint: deviceFingerprint,
      ip_address: ipAddress,
      user_agent: userAgent,
      is_active: true,
      expires_at: new Date(Date.now() + 90 * 24 * 3600000), // 90 days
      last_used_at: new Date()
    });

    await deleteCache(`sanliurfa:user:trusted_devices:${userId}`);
    logger.info('Device marked as trusted', { userId, deviceId });
    return true;
  } catch (error) {
    logger.error('Failed to trust device', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Check if device is trusted
export async function isDeviceTrusted(userId: string, deviceId: string): Promise<boolean> {
  try {
    const device = await queryOne(
      'SELECT * FROM trusted_devices WHERE user_id = $1 AND device_id = $2 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())',
      [userId, deviceId]
    );

    if (device) {
      await update('trusted_devices', { device_id: deviceId }, { last_used_at: new Date() });
    }

    return !!device;
  } catch (error) {
    logger.error('Failed to check device trust', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Encryption key management
export async function getActiveEncryptionKey(): Promise<any | null> {
  try {
    const cacheKey = 'sanliurfa:encryption:active_key';
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const key = await queryOne(
      'SELECT * FROM encryption_keys WHERE is_active = true ORDER BY key_version DESC LIMIT 1',
      []
    );

    if (key) {
      await setCache(cacheKey, JSON.stringify(key), 3600);
    }

    return key || null;
  } catch (error) {
    logger.error('Failed to get encryption key', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

// Rotate encryption key
export async function rotateEncryptionKey(): Promise<any | null> {
  try {
    // Deactivate current key
    await queryOne(
      'UPDATE encryption_keys SET is_active = false WHERE is_active = true',
      []
    );

    // Create new key
    const keyMaterial = crypto.randomBytes(32).toString('base64');
    const result = await insert('encryption_keys', {
      key_version: await getNextKeyVersion(),
      key_material: keyMaterial,
      algorithm: 'aes-256-gcm',
      is_active: true,
      is_rotated: false,
      rotation_date: new Date()
    });

    await deleteCache('sanliurfa:encryption:active_key');
    logger.info('Encryption key rotated', { keyVersion: result.key_version });
    return result;
  } catch (error) {
    logger.error('Failed to rotate encryption key', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

async function getNextKeyVersion(): Promise<number> {
  const latest = await queryOne(
    'SELECT MAX(key_version) as max_version FROM encryption_keys',
    []
  );
  return (parseInt(latest?.max_version || '0') + 1);
}

// Encrypt sensitive data
export function encryptData(data: string, keyMaterial: string): { ciphertext: string; iv: string } {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(keyMaterial, 'base64'), iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted + ':' + authTag.toString('hex'),
      iv: iv.toString('hex')
    };
  } catch (error) {
    logger.error('Encryption failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Decrypt sensitive data
export function decryptData(ciphertext: string, iv: string, keyMaterial: string): string {
  try {
    const [encrypted, authTag] = ciphertext.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyMaterial, 'base64'), Buffer.from(iv, 'hex'));

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Log failed login attempt
export async function logFailedLoginAttempt(email: string, ipAddress: string, reason: string): Promise<void> {
  try {
    const user = await queryOne(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    await insert('login_history', {
      user_id: user?.id || null,
      ip_address: ipAddress,
      location: null,
      login_method: 'email_password',
      is_successful: false,
      failure_reason: reason,
      created_at: new Date()
    });

    if (user) {
      await logSecurityEvent(user.id, 'login_failed', 'medium', ipAddress, `Failed login: ${reason}`);
    }
  } catch (error) {
    logger.error('Failed to log failed login', error instanceof Error ? error : new Error(String(error)));
  }
}

// Get login history
export async function getLoginHistory(userId: string, limit: number = 20): Promise<any[]> {
  try {
    return await queryRows(
      'SELECT * FROM login_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
  } catch (error) {
    logger.error('Failed to get login history', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

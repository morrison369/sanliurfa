/**
 * Two-Factor Authentication Library
 * TOTP, Email, SMS, and recovery codes for 2FA
 */

import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';
import { sendEmail } from './email';
import crypto from 'crypto';
import { createHmac } from 'crypto';

interface TwoFAMethod {
  id: string;
  user_id: string;
  method_type: 'totp' | 'email' | 'sms';
  method_identifier: string;
  secret_key: string;
  is_verified: boolean;
  is_primary: boolean;
  is_active: boolean;
  backup_codes: string[];
}

interface TwoFASession {
  id: string;
  user_id: string;
  session_token: string;
  method_id: string;
  verified_at: Date | null;
  expires_at: Date;
}

function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function getVerificationCacheKey(methodId: string): string {
  return `sanliurfa:2fa:verification:${methodId}`;
}

// TOTP secret generation (32 chars base32)
export function generateTOTPSecret(): string {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

// Base32 encoding for TOTP
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

// TOTP verification
export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  try {
    const secretBuffer = base32Decode(secret);
    const time = Math.floor(Date.now() / 1000 / 30);

    for (let i = -window; i <= window; i++) {
      const hmac = createHmac('sha1', secretBuffer);
      const counter = Buffer.alloc(8);
      counter.writeBigInt64BE(BigInt(time + i), 0);
      hmac.update(counter);

      const digest = hmac.digest();
      const offset = digest[digest.length - 1] & 0xf;
      const code = (digest[offset] & 0x7f) << 24
        | (digest[offset + 1] & 0xff) << 16
        | (digest[offset + 2] & 0xff) << 8
        | (digest[offset + 3] & 0xff);

      const totp = (code % 1000000).toString().padStart(6, '0');

      if (totp === token) {
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error('TOTP verification failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Base32 decoding
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const result: number[] = [];

  for (let i = 0; i < encoded.length; i++) {
    const index = alphabet.indexOf(encoded[i].toUpperCase());
    if (index === -1) throw new Error('Invalid base32 character');

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      result.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(result);
}

// Generate backup codes
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.substring(0, 4)}-${code.substring(4)}`);
  }
  return codes;
}

// Hash backup code for storage
function hashBackupCode(code: string): string {
  return createHmac('sha256', process.env.JWT_SECRET || 'secret')
    .update(code)
    .digest('hex');
}

export async function create2FAMethod(userId: string, methodType: 'totp' | 'email' | 'sms', methodIdentifier: string): Promise<TwoFAMethod | null> {
  try {
    const secretKey = methodType === 'totp' ? generateTOTPSecret() : '';

    const result = await insert('user_2fa_methods', {
      user_id: userId,
      method_type: methodType,
      method_identifier: methodIdentifier,
      secret_key: secretKey,
      is_verified: false,
      is_primary: false,
      is_active: false,
      backup_codes: generateBackupCodes()
    });

    await deleteCache(`sanliurfa:user:2fa:${userId}`);

    if (methodType === 'email' || methodType === 'sms') {
      await send2FAVerificationCode(
        withVerificationTarget(
          toTwoFAMethodRecord(result),
          methodType,
          methodIdentifier
        )
      );
    }

    logger.info('2FA method created', { userId, methodType });
    return result;
  } catch (error) {
    logger.error('Failed to create 2FA method', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

function toTwoFAMethodRecord(method: unknown): TwoFAMethod {
  const record = method as Record<string, unknown>;

  return {
    id: String(record.id),
    user_id: String(record.user_id),
    method_type: record.method_type as TwoFAMethod['method_type'],
    method_identifier: String(record.method_identifier || ''),
    secret_key: String(record.secret_key || ''),
    is_verified: Boolean(record.is_verified),
    is_primary: Boolean(record.is_primary),
    is_active: Boolean(record.is_active),
    backup_codes: Array.isArray(record.backup_codes) ? (record.backup_codes as string[]) : []
  };
}

function withVerificationTarget(method: TwoFAMethod, methodType: 'email' | 'sms', methodIdentifier: string): TwoFAMethod {
  return {
    ...method,
    method_type: methodType,
    method_identifier: methodIdentifier || method.method_identifier
  };
}

async function send2FAVerificationCode(method: TwoFAMethod): Promise<void> {
  const code = generateVerificationCode();
  const payload = JSON.stringify({
    userId: method.user_id,
    methodId: method.id,
    methodType: method.method_type,
    code,
    generatedAt: new Date().toISOString()
  });

  await setCache(getVerificationCacheKey(method.id), payload, 600);

  if (method.method_type === 'email') {
    await sendEmail(
      method.method_identifier,
      'Şanlıurfa.com 2FA Doğrulama Kodu',
      `<p>İki faktörlü doğrulama kodunuz: <strong>${code}</strong></p><p>Bu kod 10 dakika boyunca geçerlidir.</p>`
    );
    logger.info('2FA email verification code sent', { userId: method.user_id, methodId: method.id });
    return;
  }

  if (method.method_type === 'sms') {
    await insert('sms_messages', {
      user_id: method.user_id,
      phone_number: method.method_identifier,
      content: `Sanliurfa.com doğrulama kodunuz: ${code}`,
      status: 'queued',
      provider: 'internal',
      created_at: new Date().toISOString()
    });
    logger.info('2FA SMS verification code queued', { userId: method.user_id, methodId: method.id });
  }
}

export async function get2FAMethods(userId: string): Promise<TwoFAMethod[]> {
  try {
    const cacheKey = `sanliurfa:user:2fa:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const methods = await queryRows(
      'SELECT id, user_id, method_type, method_identifier, is_verified, is_primary, is_active, created_at, updated_at FROM user_2fa_methods WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC',
      [userId]
    );

    await setCache(cacheKey, JSON.stringify(methods), 600);
    return methods;
  } catch (error) {
    logger.error('Failed to get 2FA methods', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function verify2FAMethod(methodId: string, code: string): Promise<boolean> {
  try {
    const method = await queryOne(
      'SELECT * FROM user_2fa_methods WHERE id = $1',
      [methodId]
    );

    if (!method) return false;

    if (method.method_type === 'totp') {
      const isValid = verifyTOTP(method.secret_key, code);
      if (isValid) {
        await update('user_2fa_methods', { id: methodId }, { is_verified: true });
        await deleteCache(`sanliurfa:user:2fa:${method.user_id}`);
      }
      return isValid;
    }

    const isValid = await verify2FAVerificationCode(method.user_id, methodId, code);
    if (isValid) {
      await update('user_2fa_methods', { id: methodId }, { is_verified: true });
      await deleteCache(`sanliurfa:user:2fa:${method.user_id}`);
    }
    return isValid;
  } catch (error) {
    logger.error('Failed to verify 2FA method', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function activate2FAMethod(methodId: string): Promise<boolean> {
  try {
    const method = await queryOne(
      'SELECT * FROM user_2fa_methods WHERE id = $1',
      [methodId]
    );

    if (!method || !method.is_verified) {
      return false;
    }

    // Deactivate other methods if making primary
    await queryOne(
      'UPDATE user_2fa_methods SET is_primary = false WHERE user_id = $1 AND id != $2',
      [method.user_id, methodId]
    );

    await update('user_2fa_methods', { id: methodId }, { is_active: true, is_primary: true });
    await deleteCache(`sanliurfa:user:2fa:${method.user_id}`);

    logger.info('2FA method activated', { methodId });
    return true;
  } catch (error) {
    logger.error('Failed to activate 2FA method', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function remove2FAMethod(methodId: string, userId: string): Promise<boolean> {
  try {
    const method = await queryOne(
      'SELECT * FROM user_2fa_methods WHERE id = $1 AND user_id = $2',
      [methodId, userId]
    );

    if (!method) return false;

    // Don't allow removing if it's the only active method
    const activeCount = await queryOne(
      'SELECT COUNT(*) as count FROM user_2fa_methods WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    if (method.is_active && activeCount?.count <= 1) {
      return false;
    }

    await queryOne('DELETE FROM user_2fa_methods WHERE id = $1', [methodId]);
    await deleteCache(`sanliurfa:user:2fa:${userId}`);

    logger.info('2FA method removed', { methodId, userId });
    return true;
  } catch (error) {
    logger.error('Failed to remove 2FA method', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function create2FASession(userId: string, methodId: string, ipAddress: string, userAgent: string): Promise<TwoFASession | null> {
  try {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const result = await insert('user_2fa_sessions', {
      user_id: userId,
      session_token: sessionToken,
      method_id: methodId,
      ip_address: ipAddress,
      user_agent: userAgent,
      verified_at: null,
      expires_at: expiresAt
    });

    logger.info('2FA session created', { userId, sessionToken: sessionToken.substring(0, 8) });
    return result;
  } catch (error) {
    logger.error('Failed to create 2FA session', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function verify2FASession(sessionToken: string, code: string): Promise<any | null> {
  try {
    const session = await queryOne(
      'SELECT s.*, m.method_type, m.secret_key FROM user_2fa_sessions s JOIN user_2fa_methods m ON s.method_id = m.id WHERE s.session_token = $1 AND s.expires_at > NOW() AND s.verified_at IS NULL',
      [sessionToken]
    );

    if (!session) return null;

    // Verify code based on method type
    let isValid = false;
    if (session.method_type === 'totp') {
      isValid = verifyTOTP(session.secret_key, code);
    } else if (session.method_type === 'email' || session.method_type === 'sms') {
      isValid = await verify2FAVerificationCode(session.user_id, session.method_id, code);
    }

    if (isValid) {
      await update('user_2fa_sessions', { session_token: sessionToken }, { verified_at: new Date() });
      return session;
    }

    // Track failed attempt
    await recordFailedAttempt(session.id, session.user_id);
    return null;
  } catch (error) {
    logger.error('Failed to verify 2FA session', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

async function verify2FAVerificationCode(userId: string, methodId: string, code: string): Promise<boolean> {
  try {
    const cached = await getCache(getVerificationCacheKey(methodId));
    if (!cached) {
      return false;
    }

    const payload = JSON.parse(cached) as {
      userId: string;
      methodId: string;
      code: string;
    };

    if (payload.userId !== userId || payload.methodId !== methodId || payload.code !== code) {
      return false;
    }

    await deleteCache(getVerificationCacheKey(methodId));
    return true;
  } catch (error) {
    logger.error('Failed to verify 2FA verification code', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

async function recordFailedAttempt(sessionId: string, userId: string): Promise<void> {
  try {
    const attempt = await queryOne(
      'SELECT * FROM two_fa_verification_attempts WHERE session_id = $1',
      [sessionId]
    );

    if (attempt) {
      const newCount = attempt.attempt_count + 1;
      const isLocked = newCount >= 5;
      const lockedUntil = isLocked ? new Date(Date.now() + 30 * 60 * 1000) : null; // 30 min lockout

      await update('two_fa_verification_attempts', { session_id: sessionId }, {
        attempt_count: newCount,
        last_attempt_at: new Date(),
        is_locked: isLocked,
        locked_until: lockedUntil
      });
    } else {
      await insert('two_fa_verification_attempts', {
        session_id: sessionId,
        user_id: userId,
        attempt_count: 1,
        is_locked: false
      });
    }
  } catch (error) {
    logger.error('Failed to record failed attempt', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function generateRecoveryCodes(methodId: string): Promise<string[]> {
  try {
    const method = await queryOne(
      'SELECT * FROM user_2fa_methods WHERE id = $1',
      [methodId]
    );

    if (!method) return [];

    const codes = generateBackupCodes();
    const codeHashes = codes.map(code => ({
      code_hash: hashBackupCode(code),
      user_id: method.user_id
    }));

    // Insert recovery codes
    for (const codeData of codeHashes) {
      await insert('two_fa_recovery_codes', {
        ...codeData,
        is_used: false,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
    }

    logger.info('Recovery codes generated', { methodId });
    return codes;
  } catch (error) {
    logger.error('Failed to generate recovery codes', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function useRecoveryCode(userId: string, code: string): Promise<boolean> {
  try {
    const codeHash = hashBackupCode(code);
    const recoveryCode = await queryOne(
      'SELECT * FROM two_fa_recovery_codes WHERE user_id = $1 AND code_hash = $2 AND is_used = false',
      [userId, codeHash]
    );

    if (!recoveryCode) return false;

    await update('two_fa_recovery_codes', { id: recoveryCode.id }, {
      is_used: true,
      used_at: new Date()
    });

    logger.info('Recovery code used', { userId });
    return true;
  } catch (error) {
    logger.error('Failed to use recovery code', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function get2FAStatus(userId: string): Promise<any> {
  try {
    const methods = await get2FAMethods(userId);
    const activeMethods = methods.filter(m => m.is_active);

    return {
      is_enabled: activeMethods.length > 0,
      methods: methods,
      active_method: activeMethods[0] || null
    };
  } catch (error) {
    logger.error('Failed to get 2FA status', error instanceof Error ? error : new Error(String(error)));
    return { is_enabled: false, methods: [], active_method: null };
  }
}

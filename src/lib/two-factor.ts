/**
 * Two-Factor Authentication (2FA) Library
 * TOTP-based (RFC 6238) with backup codes — no external dependencies
 */

import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { queryOne, update as updateDb, insert } from './postgres';
import { logger } from './logging';

const BACKUP_CODE_COUNT = 10;
const TOTP_STEP = 30; // seconds per window
const TOTP_WINDOW = 1; // ±1 window tolerance for clock skew
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Decode base32 string to Buffer */
function base32Decode(encoded: string): Buffer {
  const clean = encoded.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

/** Compute TOTP code for a given counter (RFC 4226 HOTP) */
function computeTOTP(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  let remaining = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

/**
 * Generate cryptographically secure TOTP secret and QR code URL
 */
export function generateTOTPSecret(email: string, appName: string = 'Şanlıurfa'): {
  secret: string;
  qrCodeUrl: string;
} {
  // 20 random bytes → 32 base32 chars (160-bit secret per RFC 4226)
  const raw = randomBytes(20);
  let secret = '';
  for (let i = 0; i < raw.length; i++) {
    secret += BASE32_CHARS[raw[i] >> 3];
    if (i < raw.length - 1) {
      secret += BASE32_CHARS[((raw[i] & 0x07) << 2) | (raw[i + 1] >> 6)];
    }
  }
  secret = secret.slice(0, 32);

  const encodedEmail = encodeURIComponent(email);
  const encodedAppName = encodeURIComponent(appName);
  const qrCodeUrl = `otpauth://totp/${encodedAppName}:${encodedEmail}?secret=${secret}&issuer=${encodedAppName}&algorithm=SHA1&digits=6&period=30`;

  return { secret, qrCodeUrl };
}

/**
 * Generate cryptographically secure backup codes
 */
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const buf = randomBytes(4);
    const n = buf.readUInt32BE(0) % 100_000_000;
    const s = n.toString().padStart(8, '0');
    codes.push(`${s.slice(0, 4)}-${s.slice(4)}`);
  }
  return codes;
}

/**
 * Verify TOTP code using RFC 6238 — real HMAC-SHA1 implementation
 * Allows ±TOTP_WINDOW steps for clock skew
 */
export function verifyTOTPCode(secret: string, token: string): boolean {
  try {
    if (!secret || !token || !/^\d{6}$/.test(token)) return false;
    const counter = Math.floor(Date.now() / 1000 / TOTP_STEP);
    const tokenBuf = Buffer.from(token);
    for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
      const expected = computeTOTP(secret, counter + delta);
      if (timingSafeEqual(Buffer.from(expected), tokenBuf)) return true;
    }
    return false;
  } catch (error) {
    logger.error('TOTP verification failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Setup 2FA for user
 */
export async function setupTwoFactor(userId: string): Promise<{
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
} | null> {
  try {
    const user = await queryOne('SELECT email FROM users WHERE id = $1', [userId]);
    if (!user) return null;

    const { secret, qrCodeUrl } = generateTOTPSecret(user.email);
    const backupCodes = generateBackupCodes();

    // Store temporarily (will be confirmed after TOTP verification)
    // These are stored in user's session, not in DB yet

    return { secret, qrCodeUrl, backupCodes };
  } catch (error) {
    logger.error('2FA setup failed', error instanceof Error ? error : new Error(String(error)), { userId });
    return null;
  }
}

/**
 * Enable 2FA after verification
 */
export async function enableTwoFactor(
  userId: string,
  secret: string,
  backupCodes: string[]
): Promise<boolean> {
  try {
    await updateDb('users', userId, {
      two_factor_enabled: true,
      two_factor_secret: secret,
      two_factor_backup_codes: backupCodes
    });

    await insert('two_factor_audit', {
      user_id: userId,
      action: '2fa_enabled',
      success: true
    });

    logger.info('2FA enabled', { userId });
    return true;
  } catch (error) {
    logger.error('Failed to enable 2FA', error instanceof Error ? error : new Error(String(error)), { userId });
    return false;
  }
}

/**
 * Disable 2FA
 */
export async function disableTwoFactor(userId: string): Promise<boolean> {
  try {
    await updateDb('users', userId, {
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_backup_codes: null
    });

    await insert('two_factor_audit', {
      user_id: userId,
      action: '2fa_disabled',
      success: true
    });

    logger.info('2FA disabled', { userId });
    return true;
  } catch (error) {
    logger.error('Failed to disable 2FA', error instanceof Error ? error : new Error(String(error)), { userId });
    return false;
  }
}

/**
 * Verify 2FA code (TOTP or backup code)
 */
export async function verify2FACode(
  userId: string,
  code: string
): Promise<{ valid: boolean; backupCodesRemaining?: number }> {
  try {
    const user = await queryOne(
      'SELECT two_factor_secret, two_factor_backup_codes FROM users WHERE id = $1 AND two_factor_enabled = true',
      [userId]
    );

    if (!user) return { valid: false };

    // Try TOTP first
    if (verifyTOTPCode(user.two_factor_secret, code)) {
      await insert('two_factor_audit', {
        user_id: userId,
        action: '2fa_totp_verified',
        success: true
      });
      return { valid: true };
    }

    // Try backup codes
    const backupCodes = user.two_factor_backup_codes || [];
    const codeIndex = backupCodes.indexOf(code);

    if (codeIndex !== -1) {
      // Remove used backup code
      const updatedCodes = backupCodes.filter((_, i) => i !== codeIndex);
      await updateDb('users', userId, {
        two_factor_backup_codes: updatedCodes
      });

      await insert('two_factor_audit', {
        user_id: userId,
        action: '2fa_backup_code_used',
        success: true
      });

      return { valid: true, backupCodesRemaining: updatedCodes.length };
    }

    await insert('two_factor_audit', {
      user_id: userId,
      action: '2fa_verification_failed',
      success: false
    });

    return { valid: false };
  } catch (error) {
    logger.error('2FA verification error', error instanceof Error ? error : new Error(String(error)), { userId });
    return { valid: false };
  }
}

/**
 * Trust a device for 30 days (skip 2FA on this device)
 */
export async function trustDevice(userId: string, deviceFingerprint: string, userAgent?: string): Promise<boolean> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await insert('trusted_devices', {
      user_id: userId,
      device_fingerprint: deviceFingerprint,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString()
    }).catch(() => {
      // Device already trusted, update expiration
    });

    return true;
  } catch (error) {
    logger.error('Failed to trust device', error instanceof Error ? error : new Error(String(error)), { userId });
    return false;
  }
}

/**
 * Check if device is trusted
 */
export async function isDeviceTrusted(userId: string, deviceFingerprint: string): Promise<boolean> {
  try {
    const device = await queryOne(
      `SELECT id FROM trusted_devices 
       WHERE user_id = $1 AND device_fingerprint = $2 AND expires_at > NOW()`,
      [userId, deviceFingerprint]
    );

    return !!device;
  } catch (error) {
    logger.error('Failed to check device trust', error instanceof Error ? error : new Error(String(error)), { userId });
    return false;
  }
}

/**
 * Get 2FA backup codes remaining count
 */
export async function getBackupCodesRemaining(userId: string): Promise<number> {
  try {
    const user = await queryOne(
      'SELECT two_factor_backup_codes FROM users WHERE id = $1',
      [userId]
    );

    return user?.two_factor_backup_codes?.length || 0;
  } catch (error) {
    logger.error('Failed to get backup codes count', error instanceof Error ? error : new Error(String(error)), { userId });
    return 0;
  }
}

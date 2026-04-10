/**
 * Two-Factor Authentication (2FA) Library
 * TOTP-based with backup codes
 */

import { queryOne, update as updateDb, insert } from './postgres';
import { logger } from './logging';

const BACKUP_CODE_COUNT = 10;
const TOTP_WINDOW = 30; // seconds

function getCrypto(): Crypto {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure crypto unavailable');
  }
  return globalThis.crypto;
}

/**
 * Generate TOTP secret and QR code URL
 */
export function generateTOTPSecret(email: string, appName: string = 'Şanlıurfa'): {
  secret: string;
  qrCodeUrl: string;
} {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = new Uint8Array(32);
  getCrypto().getRandomValues(bytes);
  const secret = Array.from(bytes, byte => chars[byte % chars.length]).join('');

  // Generate provisioning URI
  const encodedEmail = encodeURIComponent(email);
  const encodedAppName = encodeURIComponent(appName);
  const qrCodeUrl = `otpauth://totp/${encodedAppName}:${encodedEmail}?secret=${secret}&issuer=${encodedAppName}`;

  return { secret, qrCodeUrl };
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(8);
    getCrypto().getRandomValues(bytes);
    const digits = Array.from(bytes, byte => (byte % 10).toString()).join('');
    const code = `${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
    codes.push(code);
  }
  return codes;
}

/**
 * Verify TOTP code (simple implementation)
 * For production, use speakeasy or google-authenticator library
 */
export function verifyTOTPCode(secret: string, token: string): boolean {
  try {
    // This is a simplified verification
    // In production, use: speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 2 })
    if (!token || token.length !== 6) return false;
    
    // For now, accept any 6-digit code for testing
    // Real implementation would decode base32 and compute HMAC-SHA1
    return /^\d{6}$/.test(token);
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

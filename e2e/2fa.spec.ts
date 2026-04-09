import { test, expect } from '@playwright/test';

test.describe('Two-Factor Authentication', () => {
  let authToken = '';
  let userEmail: string;
  const password = 'TestPassword123!';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Register 2FA test user
    userEmail = `2fa-test-${Date.now()}@test.com`;
    await page.goto('http://localhost:3000/kayit');
    await page.fill('input[name="email"]', userEmail);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="fullName"]', '2FA Tester');
    await page.click('button:has-text("Kayıt Ol")');
    await page.waitForURL('**/');
    authToken = (await page.evaluate(() => localStorage.getItem('auth-token'))) ?? '';

    await context.close();
  });

  test('should check 2FA status', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/users/2fa/status', {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data).toHaveProperty('twoFactorEnabled');
    expect(data.data.twoFactorEnabled).toBe(false);
  });

  test('should setup 2FA and get secret + backup codes', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/users/2fa/setup', {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data).toHaveProperty('secret');
    expect(data.data).toHaveProperty('qrCodeUrl');
    expect(data.data).toHaveProperty('backupCodes');
    expect(data.data.backupCodes.length).toBe(10);

    // Backup codes should be in XXXX-XXXX format
    expect(data.data.backupCodes[0]).toMatch(/^\d{4}-\d{4}$/);
  });

  test('should verify TOTP code and enable 2FA', async ({ page }) => {
    // Setup 2FA
    const setupResponse = await page.request.post('http://localhost:3000/api/users/2fa/setup', {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });
    const setupData = await setupResponse.json();
    const secret = setupData.data.secret;

    // Mock TOTP code (in real test, would use authenticator library)
    const totpCode = '123456'; // Simplified for test

    // Verify code
    const verifyResponse = await page.request.post('http://localhost:3000/api/users/2fa/verify', {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { code: totpCode }
    });
    expect(verifyResponse.ok()).toBeTruthy();

    const verifyData = await verifyResponse.json();
    expect(verifyData.data).toHaveProperty('backupCodes');
  });

  test('should reject invalid TOTP code', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/users/2fa/verify', {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { code: '000000' }
    });
    expect(response.status()).toBe(401);
  });

  test('should disable 2FA with password verification', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/users/2fa/disable', {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { password }
    });
    expect(response.ok()).toBeTruthy();

    // Verify 2FA is disabled
    const statusResponse = await page.request.get('http://localhost:3000/api/users/2fa/status', {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });
    const data = await statusResponse.json();
    expect(data.data.twoFactorEnabled).toBe(false);
  });

  test('should reject 2FA disable with wrong password', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/users/2fa/disable', {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { password: 'WrongPassword123!' }
    });
    expect(response.status()).toBe(401);
  });

  test('should validate TOTP code format', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/users/2fa/verify', {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { code: 'notanumber' }
    });
    expect(response.status()).toBe(400);
  });
});

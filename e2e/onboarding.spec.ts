import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('User Onboarding', () => {
  test('Complete user onboarding', async ({ page, context }) => {
    // Fresh registration
    await page.goto(`${BASE_URL}/kayit`);

    const email = `user-${Date.now()}@example.com`;

    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'TestPass123!@#');
    await page.fill('input[name="passwordConfirm"]', 'TestPass123!@#');
    await page.check('input[name="terms"]');

    await page.click('button[type="submit"]');

    // Check onboarding status
    await expect(page.locator('text=Onboarding')).toBeVisible();

    // Progress bar visible
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
  });

  test('Email verification step', async ({ page, context }) => {
    // Login with unverified user
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'unverified-user-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/onboarding`);

    // Email verification prompt visible
    await expect(page.locator('text=E-postanı Doğrula')).toBeVisible();

    // Email verification step shown
    await expect(page.locator('[data-testid="email-verify-step"]')).toBeVisible();
  });

  test('Profile completion step', async ({ page, context }) => {
    // Login with email-verified user
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'verified-user-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/onboarding`);

    // Profile completion form visible
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('textarea[name="bio"]')).toBeVisible();

    // Fill profile
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('textarea[name="bio"]', 'Merhaba, ben bir test kullanıcısıyım.');

    // Submit
    await page.click('button[type="submit"]');

    // Success
    await expect(page.locator('text=Profil tamamlandı')).toBeVisible();
  });

  test('Vendor onboarding', async ({ page, context }) => {
    // Login
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'vendor-user-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/vendor/onboarding`);

    // Vendor form visible
    await expect(page.locator('input[name="businessName"]')).toBeVisible();
    await expect(page.locator('input[name="businessPhone"]')).toBeVisible();

    // Fill vendor info
    await page.fill('input[name="businessName"]', 'My Restaurant');
    await page.fill('input[name="businessPhone"]', '+905551234567');
    await page.selectOption('select[name="category"]', 'restaurant');

    // Submit
    await page.click('button:has-text("Sonraki")');

    // Next step visible
    await expect(page.locator('[data-testid="vendor-step-2"]')).toBeVisible();
  });
});

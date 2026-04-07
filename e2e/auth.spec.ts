import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Authentication Flow', () => {
  test('User registration', async ({ page }) => {
    await page.goto(`${BASE_URL}/kayit`);

    // Fill registration form
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TestPass123!@#');
    await page.fill('input[name="passwordConfirm"]', 'TestPass123!@#');

    // Accept terms
    await page.check('input[name="terms"]');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for success
    await expect(page).toHaveURL(/.*kayit-basarili|giriş/);
  });

  test('User login', async ({ page }) => {
    await page.goto(`${BASE_URL}/giris`);

    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!@#');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect
    await expect(page).toHaveURL(/.*dashboard|profil/);
  });

  test('User logout', async ({ page, context }) => {
    // Set auth cookie
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'valid-jwt-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('button:has-text("Çıkış")');

    // Redirected to home
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  test('Password reset flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/sifremi-unuttum`);

    // Enter email
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // Success message
    await expect(page.locator('text=E-posta gönderildi')).toBeVisible();
  });

  test('Protected route requires authentication', async ({ page }) => {
    // Try to access protected route
    await page.goto(`${BASE_URL}/dashboard`);

    // Redirected to login
    await expect(page).toHaveURL(/.*giris/);
  });
});

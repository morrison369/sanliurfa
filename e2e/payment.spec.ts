import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Payment & Subscription', () => {
  test('View pricing page', async ({ page }) => {
    await page.goto(`${BASE_URL}/uyelik`);

    // Pricing tiers visible
    await expect(page.locator('text=Premium')).toBeVisible();
    await expect(page.locator('text=Pro')).toBeVisible();

    // Prices displayed
    await expect(page.locator('text=₺2.99')).toBeVisible();
    await expect(page.locator('text=₺5.99')).toBeVisible();
  });

  test('Start subscription - Premium', async ({ page, context }) => {
    // Login first
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'valid-jwt-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/uyelik`);

    // Click upgrade button
    await page.click('button:has-text("Premium Yükselт")');

    // Checkout page loads
    await expect(page).toHaveURL(/.*checkout|payment/);

    // Payment form visible
    await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
  });

  test('View subscription status', async ({ page, context }) => {
    // Login with premium user
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'premium-user-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/dashboard`);

    // Subscription status visible
    await expect(page.locator('text=Aktif Abonelik')).toBeVisible();

    // Next billing date visible
    await expect(page.locator('text=Sonraki Ödeme')).toBeVisible();
  });

  test('Manage subscription', async ({ page, context }) => {
    // Login with premium user
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'premium-user-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/dashboard`);

    // Click manage subscription
    await page.click('button:has-text("Yönet")');

    // Management page loads
    await expect(page).toHaveURL(/.*yonetim|manage/);

    // Actions visible
    await expect(page.locator('button:has-text("Yükselt")')).toBeVisible();
    await expect(page.locator('button:has-text("İptal")')).toBeVisible();
  });

  test('Downgrade subscription', async ({ page, context }) => {
    // Login with pro user
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'pro-user-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/dashboard`);

    // Click manage
    await page.click('button:has-text("Yönet")');

    // Downgrade option visible
    await expect(page.locator('button:has-text("İndir")')).toBeVisible();

    // Confirm downgrade
    await page.click('button:has-text("İndir")');
    await page.click('button:has-text("Onayla")');

    // Success message
    await expect(page.locator('text=Başarılı')).toBeVisible();
  });

  test('Cancel subscription', async ({ page, context }) => {
    // Login with premium user
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'premium-user-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/dashboard`);

    // Click manage
    await page.click('button:has-text("Yönet")');

    // Cancel option visible
    await expect(page.locator('button:has-text("İptal")')).toBeVisible();

    // Confirm cancellation
    await page.click('button:has-text("İptal")');
    await page.click('button:has-text("Evet, İptal Et")');

    // Success message
    await expect(page.locator('text=Abonelik iptal edildi')).toBeVisible();
  });
});

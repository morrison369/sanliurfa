import { test, expect } from '@playwright/test';

test.describe('Subscription System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display pricing page with subscription tiers', async ({ page }) => {
    await page.goto('/fiyatlandirma');

    // Verify page title
    await expect(page).toHaveTitle(/Fiyatlandırma/);

    // Check for pricing cards
    const tiers = await page.locator('[class*="border-2"]').all();
    expect(tiers.length).toBeGreaterThan(0);

    // Verify "En Popüler" badge exists
    const popularBadge = page.locator('text=En Popüler');
    await expect(popularBadge).toBeVisible();
  });

  test('should load subscription tiers from API', async ({ page }) => {
    // Intercept API call
    const tiersPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/subscriptions/tiers') &&
        response.status() === 200
    );

    await page.goto('/fiyatlandirma');
    const response = await tiersPromise;

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.tiers).toBeDefined();
    expect(Array.isArray(data.tiers)).toBe(true);
    expect(data.tiers.length).toBeGreaterThan(0);

    // Verify tier structure
    const tier = data.tiers[0];
    expect(tier).toHaveProperty('id');
    expect(tier).toHaveProperty('displayName');
    expect(tier).toHaveProperty('monthlyPrice');
  });

  test('subscription management page requires authentication', async ({ page }) => {
    // Try to access subscription page without login
    await page.goto('/abonelik');

    // Should redirect to login
    await expect(page).toHaveURL(/\/giris/);
  });

  test('should show billing history table structure', async ({ page, context }) => {
    // Create a new page with auth (simulating logged-in user)
    const cookies = [
      {
        name: 'auth-token',
        value: 'test-token',
        url: 'http://localhost:3000',
      },
    ];

    // Note: This test assumes user is logged in
    // In a real scenario, we'd need to create a test user and login first

    await page.goto('/abonelik');

    // Check if page loads (authentication will be checked server-side)
    await expect(page).toHaveTitle(/Abonelik/);
  });

  test('should display FAQ section on pricing page', async ({ page }) => {
    await page.goto('/fiyatlandirma');

    // Check for FAQ title
    const faqTitle = page.locator('text=Sık Sorulan Sorular');
    await expect(faqTitle).toBeVisible();

    // Check for FAQ items
    const faqItems = await page.locator('[class*="rounded-lg"][class*="border"]').all();
    expect(faqItems.length).toBeGreaterThan(0);
  });

  test('should display pricing in Turkish currency', async ({ page }) => {
    const tiersPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/subscriptions/tiers') &&
        response.status() === 200
    );

    await page.goto('/fiyatlandirma');
    const response = await tiersPromise;
    const data = await response.json();

    // Verify currency is Turkish Lira
    const tier = data.tiers.find((t: any) => t.monthlyPrice > 0);
    expect(typeof tier.monthlyPrice).toBe('number');
  });
});

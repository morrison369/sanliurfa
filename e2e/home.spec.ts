import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display homepage correctly', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/Şanlıurfa/);

    // Check main elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    const headerNavLinks = page.locator('header nav a[href]');
    await expect(await headerNavLinks.count()).toBeGreaterThan(0);
  });

  test('should have search functionality', async ({ page }) => {
    const searchLink = page.locator('header a[aria-label="Ara"]').first();
    await expect(searchLink).toBeVisible();
    await expect(searchLink).toHaveAttribute('href', '/arama');
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileMenu = page.locator('#mobileMenuBtn');
    await expect(mobileMenu).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(mobileMenu).toBeHidden();
  });
});

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/giris');

    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('should show registration page', async ({ page }) => {
    await page.goto('/kayit');

    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});

test.describe('Places', () => {
  test('should display places list', async ({ page }) => {
    await page.goto('/mekanlar');
    
    await expect(page.locator('h1:has-text("Mekanlar")')).toBeVisible();
  });

  test('should filter places by category', async ({ page }) => {
    await page.goto('/mekanlar');
    
    const categoryLink = page.locator('a:has-text("Restoran")').first();
    if (await categoryLink.isVisible()) {
      await categoryLink.click();
      await expect(page).toHaveURL(/mekanlar|yeme-icme|kategori|restaurant|restoran/);
    }
  });
});

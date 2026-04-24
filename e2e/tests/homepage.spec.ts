import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Şanlıurfa/);
  });

  test('should have working navigation', async ({ page }) => {
    const navLinks = page.locator('header a:visible');
    await expect(navLinks.first()).toBeVisible();
    expect(await navLinks.count()).toBeGreaterThan(3);
  });

  test('should display hero section', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Şanlıurfa/);
  });

  test('should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('header')).toBeVisible();
    
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('header')).toBeVisible();
  });
});

test.describe('Places', () => {
  test('should display places list', async ({ page }) => {
    await page.goto('/mekanlar');
    await expect(page).toHaveURL(/\/mekanlar/);
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/giris');
    await expect(page).toHaveURL(/\/giris/);
    await expect(page.locator('form input[type="email"], form input[name="email"]').first()).toBeVisible();
  });
});

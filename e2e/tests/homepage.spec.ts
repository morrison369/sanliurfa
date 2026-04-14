import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Şanlıurfa/);
  });

  test('should have working navigation', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Mekanlar/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Etkinlikler/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Blog/i })).toBeVisible();
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
    await page.goto('/places');
    await expect(page.locator('h1')).toContainText(/Mekanlar/);
  });
});

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/giris');
    await expect(page.locator('h1')).toContainText(/Giriş/);
  });
});

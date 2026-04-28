import { test, expect } from '@playwright/test';

test.describe('Places Pages', () => {
  test('should display places list', async ({ page }) => {
    await page.goto('/mekanlar');
    await expect(page).toHaveTitle(/Mekanlar/);
    await expect(page.locator('.place-card').first()).toBeVisible();
  });

  test('should filter places by category', async ({ page }) => {
    await page.goto('/mekanlar');
    await page.click('[data-category="tarihi-yerler"]');
    await expect(page.url()).toContain('kategori=tarihi-yerler');
  });

  test('should display place details', async ({ page }) => {
    await page.goto('/mekan/gobeklitepe');
    await expect(page.locator('h1')).toContainText('Göbeklitepe');
    await expect(page.locator('.place-rating')).toBeVisible();
  });

  test('should search places', async ({ page }) => {
    await page.goto('/mekanlar');
    await page.fill('[data-testid="search-input"]', 'göbekli');
    await page.press('[data-testid="search-input"]', 'Enter');
    await expect(page.locator('.search-results')).toBeVisible();
  });
});

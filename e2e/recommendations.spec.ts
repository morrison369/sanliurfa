import { test, expect } from '@playwright/test';

test.describe('Recommendations System', () => {
  test('View recommendations on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Önerilen Mekanlar');

    // Verify recommendations are displayed
    await expect(page.locator('text=Size Önerilen')).toBeVisible();
    
    // Check if places are shown
    const places = page.locator('[href*="/mekan/"]');
    expect(await places.count()).toBeGreaterThan(0);
  });

  test('Switch recommendation types', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button:has-text("Tüm Öneriler")');

    // Click different recommendation types
    await page.click('button:has-text("Sosyal")');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("Trend")');
    await page.waitForLoadState('networkidle');

    // Verify content loaded
    await expect(page.locator('[href*="/mekan/"]')).toBeVisible();
  });

  test('Recommendations update after interactions', async ({ page }) => {
    await page.goto('/giris');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button:has-text("Giriş Yap")');

    // Add to favorites
    await page.goto('/mekan/1');
    await page.click('text=Favorilere Ekle');
    await expect(page.locator('text=Eklendi')).toBeVisible();

    // Check recommendations updated
    await page.goto('/');
    await expect(page.locator('text=İçerik Tabanlı')).toBeVisible();
  });

  test('View trending places', async ({ page }) => {
    await page.goto('/');
    
    // Click trending section
    await page.click('text=Trend');
    await page.waitForLoadState('networkidle');

    // Verify trending places displayed
    const places = page.locator('[href*="/mekan/"]');
    expect(await places.count()).toBeGreaterThan(0);
  });
});

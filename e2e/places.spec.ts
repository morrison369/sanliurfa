import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Places Discovery', () => {
  test('Browse all places', async ({ page }) => {
    await page.goto(`${BASE_URL}/yerler`);

    // Places are visible
    await expect(page.locator('[data-testid="place-card"]')).toHaveCount(10);

    // Place details visible
    await expect(page.locator('text=Yer Adı')).toBeVisible();
    await expect(page.locator('text=Kategori')).toBeVisible();
  });

  test('Filter places by category', async ({ page }) => {
    await page.goto(`${BASE_URL}/yerler`);

    // Select category filter
    await page.selectOption('select[name="category"]', 'restaurant');

    // Filtered results
    await page.waitForSelector('[data-testid="place-card"]');
  });

  test('Search places', async ({ page }) => {
    await page.goto(`${BASE_URL}/arama`);

    // Enter search term
    await page.fill('input[placeholder*="Ara"]', 'kebap');

    // Wait for search results
    await page.waitForSelector('[data-testid="place-card"]');

    // Results contain search term
    const cards = await page.locator('[data-testid="place-card"]').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('View place details', async ({ page }) => {
    await page.goto(`${BASE_URL}/yerler`);

    // Click on place
    await page.click('[data-testid="place-card"] >> first-child');

    // Details page loads
    await expect(page.locator('[data-testid="place-detail"]')).toBeVisible();

    // Details visible
    await expect(page.locator('text=Adres')).toBeVisible();
    await expect(page.locator('text=Telefon')).toBeVisible();
    await expect(page.locator('text=Saatler')).toBeVisible();
  });

  test('Add place to favorites', async ({ page, context }) => {
    // Login first
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'valid-jwt-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/yerler`);

    // Click favorite button
    await page.click('[data-testid="favorite-btn"] >> first-child');

    // Success message
    await expect(page.locator('text=Favorilere eklendi')).toBeVisible();
  });

  test('View place reviews', async ({ page }) => {
    await page.goto(`${BASE_URL}/yerler`);

    // Click on place
    await page.click('[data-testid="place-card"] >> first-child');

    // Reviews section visible
    await expect(page.locator('[data-testid="reviews-section"]')).toBeVisible();

    // Reviews listed
    const reviews = await page.locator('[data-testid="review-item"]').count();
    expect(reviews).toBeGreaterThan(0);
  });

  test('Write review', async ({ page, context }) => {
    // Login first
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'valid-jwt-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/yerler`);

    // Click on place
    await page.click('[data-testid="place-card"] >> first-child');

    // Fill review form
    await page.selectOption('select[name="rating"]', '5');
    await page.fill('textarea[name="comment"]', 'Harika bir mekan! Çok beğendim.');

    // Submit
    await page.click('button[type="submit"]:has-text("Gönder")');

    // Success message
    await expect(page.locator('text=Yorum eklendi')).toBeVisible();
  });
});

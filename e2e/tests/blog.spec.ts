import { test, expect } from '@playwright/test';

test.describe('Blog Pages', () => {
  test('should display blog list', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveTitle(/Blog/);
    await expect(page.locator('.blog-post').first()).toBeVisible();
  });

  test('should display blog post details', async ({ page }) => {
    await page.goto('/blog/tarihi-yerler-rehberi');
    await expect(page.locator('article')).toBeVisible();
    await expect(page.locator('.blog-content')).toBeVisible();
  });

  test('should filter by category', async ({ page }) => {
    await page.goto('/blog');
    await page.click('[data-testid="category-filter"]:has-text("Tarih")');
    await expect(page.url()).toContain('kategori=');
  });
});

test.describe('Homepage', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Şanlıurfa/);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should navigate to featured places', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="featured-place"]').first();
    await expect(page.url()).toContain('/mekan/');
  });
});

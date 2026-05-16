import { expect, test } from '@playwright/test';

test.describe('Release smoke', () => {
  test('homepage, search, places and auth surfaces respond', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Şanlıurfa/);
    await expect(page.locator('#main-content, main').first()).toBeVisible();

    const searchInput = page.locator('[data-testid="homepage-search-input"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('göbeklitepe');
    await page.locator('[data-testid="homepage-search-submit"]').click();
    await expect(page).toHaveURL(/\/arama/);

    await page.goto('/mekanlar');
    await expect(page.locator('main').first()).toBeVisible();

    await page.goto('/giris');
    await expect(page.locator('form input[type="email"], form input[name="email"]').first()).toBeVisible();
  });
});

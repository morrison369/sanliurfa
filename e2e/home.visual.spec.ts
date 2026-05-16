import { expect, test } from '@playwright/test';

test.describe('Homepage visual regression', () => {
  test('should match desktop homepage visual baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 2200 });
    await page.goto('/');
    await expect(page).toHaveScreenshot('home-desktop.png', { fullPage: true });
  });

  test('should match mobile homepage visual baseline', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1900 });
    await page.goto('/');
    await expect(page).toHaveScreenshot('home-mobile.png', { fullPage: true });
  });
});

import { test, expect } from '@playwright/test';

test.describe('Photo Upload and Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/giris');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button:has-text("Giriş Yap")');
    await page.waitForURL('/');
  });

  test('Upload photo to a place', async ({ page }) => {
    // Navigate to a place
    await page.goto('/mekan/1');
    await page.waitForSelector('text=Fotoğraf Yükle');

    // Upload photo
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/photo.jpg');
    await page.fill('input[placeholder="Fotoğrafın açıklaması"]', 'Test photo');
    await page.click('button:has-text("Fotoğrafı Yükle")');

    // Verify upload success
    await expect(page.locator('text=Yükleme başarılı')).toBeVisible();
    await expect(page.locator('text=Test photo')).toBeVisible();
  });

  test('Vote on a photo as helpful', async ({ page }) => {
    await page.goto('/mekan/1');
    await page.waitForSelector('[class*="photo"]');

    // Click helpful button
    const helpfulButton = page.locator('button:has-text("👍")').first();
    await helpfulButton.click();

    // Verify vote registered
    await expect(helpfulButton).toHaveClass(/bg-green/);
  });

  test('Delete uploaded photo', async ({ page }) => {
    await page.goto('/mekan/1');
    await page.waitForSelector('[class*="photo"]');

    // Click delete button
    const deleteButton = page.locator('button:has-text("🗑️")').first();
    await deleteButton.click();

    // Confirm deletion
    await page.click('button:has-text("Sil")');

    // Verify deletion
    await expect(page.locator('text=Fotoğraf silindi')).toBeVisible();
  });

  test('Set photo as featured', async ({ page }) => {
    await page.goto('/mekan/1');
    await page.waitForSelector('[class*="photo"]');

    // Click featured button
    const featuredButton = page.locator('button:has-text("⭐")').first();
    await featuredButton.click();

    // Verify featured status
    await expect(page.locator('text=Öne Çıkartılmış')).toBeVisible();
  });
});

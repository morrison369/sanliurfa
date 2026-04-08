import { test, expect } from '@playwright/test';

test.describe('Collections Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/giris');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button:has-text("Giriş Yap")');
    await page.waitForURL('/');
  });

  test('Create a new collection', async ({ page }) => {
    await page.goto('/koleksiyonlar');
    await page.waitForSelector('text=Yeni Koleksiyon Oluştur');

    // Fill form
    await page.fill('input[placeholder="Örn: Favori Restoranlar"]', 'Test Koleksiyonu');
    await page.fill('textarea[placeholder="Bu koleksiyon hakkında..."]', 'Test açıklaması');
    await page.click('button:has-text("Koleksiyon Oluştur")');

    // Verify creation
    await expect(page.locator('text=Test Koleksiyonu')).toBeVisible();
  });

  test('View collection details', async ({ page }) => {
    await page.goto('/koleksiyonlar');
    
    // Click on first collection
    await page.click('a:has-text("Aç")');
    await page.waitForSelector('text=Mekanlar');

    // Verify collection page loaded
    expect(page.url()).toContain('/koleksiyonlar/');
  });

  test('Add place to collection', async ({ page }) => {
    await page.goto('/mekan/1');
    await page.waitForSelector('text=Koleksiyonlara Ekle');

    // Add to collection (if exists)
    const addButton = page.locator('text=Koleksiyonlara Ekle').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(page.locator('text=Eklendi')).toBeVisible();
    }
  });

  test('Delete a collection', async ({ page }) => {
    await page.goto('/koleksiyonlar');
    await page.waitForSelector('text=Sil');

    // Click delete on first collection
    const deleteButton = page.locator('button:has-text("Sil")').first();
    await deleteButton.click();

    // Confirm deletion
    await page.click('button:has-text("Sil")');

    // Verify deletion
    await expect(page.locator('text=Koleksiyon silindi')).toBeVisible();
  });

  test('Toggle collection visibility', async ({ page }) => {
    await page.goto('/koleksiyonlar');
    await page.waitForSelector('[type="checkbox"]');

    // Toggle public visibility
    const checkbox = page.locator('[type="checkbox"]').first();
    await checkbox.click();

    // Verify change
    await expect(page.locator('text=Herkese açık')).toBeVisible();
  });
});

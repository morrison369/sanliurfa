import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display homepage correctly', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/Şanlıurfa/);

    // Check main elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    // Test navigation links
    const navLinks = [
      { text: 'Mekanlar', href: '/places' },
      { text: 'Blog', href: '/blog' },
      { text: 'Hakkında', href: '/hakkinda' },
    ];

    for (const link of navLinks) {
      const navLink = page.locator(`nav a:has-text("${link.text}")`);
      await expect(navLink).toBeVisible();
      await expect(navLink).toHaveAttribute('href', link.href);
    }
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[type="search"]').first();
    await expect(searchInput).toBeVisible();
    
    await searchInput.fill('Göbeklitepe');
    await searchInput.press('Enter');
    
    await expect(page).toHaveURL(/arama/);
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileMenu = page.locator('#mobile-menu-trigger');
    await expect(mobileMenu).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(mobileMenu).not.toBeVisible();
  });
});

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/giris');
    
    await expect(page.locator('h2:has-text("Giriş")')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show registration page', async ({ page }) => {
    await page.goto('/kayit');
    
    await expect(page.locator('h2:has-text("Hesap")')).toBeVisible();
    await expect(page.locator('input[name="full_name"]')).toBeVisible();
  });
});

test.describe('Places', () => {
  test('should display places list', async ({ page }) => {
    await page.goto('/places');
    
    await expect(page.locator('h1:has-text("Mekanlar")')).toBeVisible();
  });

  test('should filter places by category', async ({ page }) => {
    await page.goto('/places');
    
    const categoryLink = page.locator('a:has-text("Restoran")').first();
    if (await categoryLink.isVisible()) {
      await categoryLink.click();
      await expect(page).toHaveURL(/category=restaurant/);
    }
  });
});

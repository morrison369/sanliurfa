import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads successfully with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Şanlıurfa/);
    await expect(page).toHaveURL('/');
  });

  test('hero section is visible with main heading', async ({ page }) => {
    const hero = page.locator('section').filter({ hasText: /Şanlıurfa|Tarihin|Keşfet/ }).first();
    await expect(hero).toBeVisible();

    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Şanlıurfa/);
  });

  test('search bar is functional', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="Ara"], input[placeholder*="ara"]').first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill('göbeklitepe');
    await expect(searchInput).toHaveValue('göbeklitepe');

    await searchInput.press('Enter');
    await expect(page).toHaveURL(/ara|search|places/);
  });

  test('navigation menu is present', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    const navLinks = nav.locator('a');
    await expect(navLinks.first()).toBeVisible();
  });

  test('categories section is displayed', async ({ page }) => {
    const categoriesSection = page.locator('section').filter({ hasText: /Kategori|kategori|Category/ }).first();
    await expect(categoriesSection).toBeVisible();

    const categoryItems = page.locator('[data-testid="category"], a[href*="kategori"], a[href*="category"]');
    const count = await categoryItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('featured places or content is visible', async ({ page }) => {
    const featuredSection = page.locator('section').filter({ hasText: /Öne Çıkan|öne çıkan|Featured|Popüler|popüler/ }).first();
    await expect(featuredSection).toBeVisible();

    const placeCards = page.locator('[data-testid="place-card"], article, .place-card');
    const count = await placeCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('footer is visible with site information', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const footerLinks = footer.locator('a');
    const count = await footerLinks.count();
    expect(count).toBeGreaterThan(0);

    await expect(footer).toContainText(/Şanlıurfa|sanliurfa\.com/i);
  });

  test('homepage is responsive and mobile-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const hero = page.locator('h1');
    await expect(hero).toBeVisible();

    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('main navigation links navigate correctly', async ({ page }) => {
    const placesLink = page.locator('a:has-text("Mekanlar"), a[href*="places"]');
    await expect(placesLink.first()).toBeVisible();

    const blogLink = page.locator('a:has-text("Blog"), a[href*="blog"]');
    await expect(blogLink.first()).toBeVisible();
  });

  test('quick links to login and registration are visible', async ({ page }) => {
    const loginLink = page.locator('a[href*="giris"], a:has-text("Giriş")').first();
    await expect(loginLink).toBeVisible();

    const registerLink = page.locator('a[href*="kayit"], a:has-text("Kayıt")').first();
    await expect(registerLink).toBeVisible();
  });
});

test.describe('Homepage - Content Loading', () => {
  test('images load without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter((img: HTMLImageElement) => img.naturalWidth === 0 && !img.closest('noscript')).length;
    });
    expect(brokenImages).toBeLessThan(count);
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors.length).toBeLessThan(3);
  });
});

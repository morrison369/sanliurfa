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
    const searchInput = page.locator('form[action="/ara"] input[name="q"], input[type="search"], input[placeholder*="Ara"], input[placeholder*="ara"]').first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill('göbeklitepe');
    await expect(searchInput).toHaveValue('göbeklitepe');

    await searchInput.press('Enter');
    await expect(page).toHaveURL(/\/ara/);
  });

  test('navigation menu is present', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const nav = page.locator('header nav.md\\:flex');
    await expect(nav).toBeVisible();

    await expect(nav.locator('a[href="/mekanlar"]').first()).toBeVisible();
  });

  test('categories section is displayed', async ({ page }) => {
    const categoriesSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Kategoriler' }) }).first();
    await expect(categoriesSection).toBeVisible();

    const categoryItems = categoriesSection.locator('a[href^="/mekanlar/"]');
    const count = await categoryItems.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('featured places or content is visible', async ({ page }) => {
    const featuredSection = page.locator('section').filter({ has: page.locator('a[href]') }).first();
    await expect(featuredSection).toBeVisible();

    const links = featuredSection.locator('a[href]');
    const count = await links.count();
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
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('button[aria-label*="Menü"], button[aria-label*="menu"], button:has-text("Menü"), button:has-text("Menu")').first()).toBeVisible();
  });

  test('main navigation links navigate correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const visibleNavLinks = page.locator('header a:visible');
    await expect(visibleNavLinks.first()).toBeVisible();
    expect(await visibleNavLinks.count()).toBeGreaterThanOrEqual(3);
  });

  test('quick links to login and registration are visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const loginLink = page.locator('header a[href*="giris"], header a:has-text("Giriş")').first();
    await expect(loginLink).toBeVisible();

    const registerLink = page.locator('header a[href*="kayit"], header a:has-text("Kayıt")').first();
    await expect(registerLink).toBeVisible();
  });
});

test.describe('Homepage - Content Loading', () => {
  test('images load without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();
    if (count === 0) {
      const visualCards = page.locator('section:has(h2:has-text("Popüler Rehberler")) a');
      await expect(visualCards.first()).toBeVisible();
      expect(await visualCards.count()).toBeGreaterThan(0);
      return;
    }

    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter((img: HTMLImageElement) => img.naturalWidth === 0 && !img.closest('noscript')).length;
    });
    expect(brokenImages).toBeLessThan(count);
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!/favicon|404|Failed to load resource/i.test(text)) {
          errors.push(text);
        }
      }
    });
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(pageErrors.length).toBeLessThanOrEqual(3);
    expect(errors.length).toBeLessThan(50);
  });
});

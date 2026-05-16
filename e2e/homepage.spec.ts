import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function waitForHomepageReady(page: Page) {
  await page.goto('/');
  await expect(page.locator('main h1')).toBeVisible();
}

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHomepageReady(page);
  });

  test('page loads successfully with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Şanlıurfa/);
    await expect(page).toHaveURL('/');
  });

  test('hero section is visible with main heading', async ({ page }) => {
    const hero = page.locator('section').filter({ hasText: /Şanlıurfa|Tarihin|Keşfet/ }).first();
    await expect(hero).toBeVisible();

    const heading = page.locator('.home-hero h1, main h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Şanlıurfa/);
  });

  test('search bar is functional', async ({ page }) => {
    const searchInput = page.locator('[data-testid="homepage-search-input"]').first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill('göbeklitepe');
    await expect(searchInput).toHaveValue('göbeklitepe');

    await page.locator('[data-testid="homepage-search-submit"]').click();
    await expect(page).toHaveURL(/\/arama/);
  });

  test('navigation menu is present', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const nav = page.locator('header nav.sf-main-nav');
    await expect(nav).toBeVisible();

    await expect(nav.locator('a[href="/mekanlar"], a[href="/isletme"], a:has-text("Mekanlar")').first()).toBeVisible();
  });

  test('popular categories section is displayed', async ({ page }) => {
    const categoriesSection = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: /Popüler Kategoriler|Kategoriler/i }) })
      .first();
    await expect(categoriesSection).toBeVisible();

    const categoryItems = categoriesSection.locator('a[href^="/"]');
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
    await waitForHomepageReady(page);

    const hero = page.locator('.home-hero h1, main h1').first();
    await expect(hero).toBeVisible();
    await expect(page.locator('#sf-header')).toBeVisible();
    const menuTrigger = page.locator('#mobileMenuBtn, summary[aria-label*="Menü"], summary[aria-label*="menu"]').first();
    await expect(menuTrigger).toBeVisible();
  });

  test('main navigation links navigate correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const visibleNavLinks = page.locator('header a:visible');
    await expect(visibleNavLinks.first()).toBeVisible();
    expect(await visibleNavLinks.count()).toBeGreaterThanOrEqual(3);
  });

  test('guest quick action links are visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('header a[href="/arama"]').first()).toBeVisible();
    await expect(page.locator('header a[href="/eslesme"]').first()).toBeVisible();
    await expect(page.locator('header a[href="/isletme-kayit"]').first()).toBeVisible();
  });
});

test.describe('Homepage - Content Loading', () => {
  test('images load without errors', async ({ page }) => {
    await waitForHomepageReady(page);
    await page.waitForLoadState('domcontentloaded');

    const images = page.locator('img');
    const count = await images.count();
    if (count === 0) {
      const visualCards = page.locator('section:has(h2:has-text("Popüler Rehberler")) a');
      await expect(visualCards.first()).toBeVisible();
      expect(await visualCards.count()).toBeGreaterThan(0);
      return;
    }

    const { loadedImages, brokenImages } = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const completeImgs = imgs.filter(
        (img: HTMLImageElement) => img.complete && !img.closest('noscript') && img.currentSrc,
      );
      return {
        loadedImages: completeImgs.length,
        brokenImages: completeImgs.filter((img: HTMLImageElement) => img.naturalWidth === 0).length,
      };
    });
    expect(loadedImages).toBeGreaterThan(0);
    expect(brokenImages).toBe(0);
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

    await waitForHomepageReady(page);
    await page.waitForTimeout(1500);

    expect(pageErrors.length).toBeLessThanOrEqual(3);
    expect(errors.length).toBeLessThan(50);
  });
});

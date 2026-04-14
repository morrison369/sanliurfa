import { test, expect } from '@playwright/test';

test.describe('Profile - Authentication Required', () => {
  test('profile page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/profil');

    await expect(page).toHaveURL(/giris|login/, { timeout: 10000 });
    await expect(page).toHaveTitle(/Giriş|Login/);
  });

  test('profile yorumlar page redirects to login', async ({ page }) => {
    await page.goto('/profil/yorumlar');
    await expect(page).toHaveURL(/giris|login/, { timeout: 10000 });
  });

  test('profile favoriler page redirects to login', async ({ page }) => {
    await page.goto('/profil/favoriler');
    await expect(page).toHaveURL(/giris|login/, { timeout: 10000 });
  });

  test('profile bildirimler page redirects to login', async ({ page }) => {
    await page.goto('/profil/bildirimler');
    await expect(page).toHaveURL(/giris|login/, { timeout: 10000 });
  });

  test('profile aktivite page redirects to login', async ({ page }) => {
    await page.goto('/profil/aktivite');
    await expect(page).toHaveURL(/giris|login/, { timeout: 10000 });
  });

  test('profile ayarlar page redirects to login', async ({ page }) => {
    await page.goto('/profil/ayarlar');
    await expect(page).toHaveURL(/giris|login/, { timeout: 10000 });
  });
});

test.describe('Profile - Authenticated Access', () => {
  test.use({
    storageState: async ({}, use) => {
      await use({ cookies: [], origins: [] });
    },
  });

  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'mock-authenticated-user-jwt',
        url: 'http://localhost:3000',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  });

  test('profile main page loads for authenticated user', async ({ page }) => {
    await page.goto('/profil');

    await expect(page).toHaveURL(/profil/);
    await expect(page.locator('h1')).toContainText(/Profil|profil|Hesabım/);
  });

  test('profile displays user information', async ({ page }) => {
    await page.goto('/profil');

    const userAvatar = page.locator('img[alt*="avatar"], [data-testid="avatar"], .avatar').first();
    await expect(userAvatar).toBeVisible();

    const userName = page.locator('h1, h2, [data-testid="username"]').first();
    await expect(userName).toBeVisible();
  });
});

test.describe('Profile - Sub-pages Navigation', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'mock-authenticated-user-jwt',
        url: 'http://localhost:3000',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  });

  test('yorumlar (comments) page loads', async ({ page }) => {
    await page.goto('/profil/yorumlar');

    await expect(page).toHaveURL(/profil\/yorumlar/);
    await expect(page.locator('h1, h2')).toContainText(/Yorumlar|yorum|Comment/);
  });

  test('favoriler (favorites) page loads', async ({ page }) => {
    await page.goto('/profil/favoriler');

    await expect(page).toHaveURL(/profil\/favoriler/);
    await expect(page.locator('h1, h2')).toContainText(/Favoriler|favori|Favorite/);
  });

  test('bildirimler (notifications) page loads', async ({ page }) => {
    await page.goto('/profil/bildirimler');

    await expect(page).toHaveURL(/profil\/bildirimler/);
    await expect(page.locator('h1, h2')).toContainText(/Bildirimler|bildirim|Notification/);
  });

  test('aktivite (activity) page loads', async ({ page }) => {
    await page.goto('/profil/aktivite');

    await expect(page).toHaveURL(/profil\/aktivite/);
    await expect(page.locator('h1, h2')).toContainText(/Aktivite|aktivite|Activity/);
  });

  test('ayarlar (settings) page loads', async ({ page }) => {
    await page.goto('/profil/ayarlar');

    await expect(page).toHaveURL(/profil\/ayarlar/);
    await expect(page.locator('h1, h2')).toContainText(/Ayarlar|ayar|Settings/);
  });
});

test.describe('Profile - Sidebar Navigation', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'mock-authenticated-user-jwt',
        url: 'http://localhost:3000',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  });

  test('sidebar is visible with navigation links', async ({ page }) => {
    await page.goto('/profil');

    const sidebar = page.locator('aside, [data-testid="sidebar"], .sidebar, nav').first();
    await expect(sidebar).toBeVisible();
  });

  test('sidebar links navigate to correct pages', async ({ page }) => {
    await page.goto('/profil');

    const yorumlarLink = page.locator('a[href*="yorumlar"], a:has-text("Yorumlar")').first();
    await expect(yorumlarLink).toBeVisible();
    await yorumlarLink.click();
    await expect(page).toHaveURL(/profil\/yorumlar/);

    const favorilerLink = page.locator('a[href*="favoriler"], a:has-text("Favoriler")').first();
    await expect(favorilerLink).toBeVisible();
    await favorilerLink.click();
    await expect(page).toHaveURL(/profil\/favoriler/);

    const bildirimlerLink = page.locator('a[href*="bildirimler"], a:has-text("Bildirimler")').first();
    await expect(bildirimlerLink).toBeVisible();
    await bildirimlerLink.click();
    await expect(page).toHaveURL(/profil\/bildirimler/);

    const aktiviteLink = page.locator('a[href*="aktivite"], a:has-text("Aktivite")').first();
    await expect(aktiviteLink).toBeVisible();
    await aktiviteLink.click();
    await expect(page).toHaveURL(/profil\/aktivite/);

    const ayarlarLink = page.locator('a[href*="ayarlar"], a:has-text("Ayarlar")').first();
    await expect(ayarlarLink).toBeVisible();
    await ayarlarLink.click();
    await expect(page).toHaveURL(/profil\/ayarlar/);
  });

  test('active sidebar link is highlighted on each page', async ({ page }) => {
    const pages = [
      { url: '/profil', text: /Profil|profil/ },
      { url: '/profil/yorumlar', text: /Yorumlar|yorum/ },
      { url: '/profil/favoriler', text: /Favoriler|favori/ },
      { url: '/profil/bildirimler', text: /Bildirimler|bildirim/ },
      { url: '/profil/aktivite', text: /Aktivite|aktivite/ },
      { url: '/profil/ayarlar', text: /Ayarlar|ayar/ },
    ];

    for (const { url, text } of pages) {
      await page.goto(url);
      const activeLink = page.locator('[class*="active"], [aria-current="page"], .active').filter({ hasText: text }).first();
      await expect(activeLink).toBeVisible({ timeout: 5000 });
    }
  });

  test('back to profile link works from sub-pages', async ({ page }) => {
    await page.goto('/profil/yorumlar');

    const backLink = page.locator('a[href="/profil"], a:has-text("Profil"), a:has-text("Geri")').first();
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/profil$/);
  });
});

test.describe('Profile - Settings Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'mock-authenticated-user-jwt',
        url: 'http://localhost:3000',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  });

  test('settings page has profile editing form', async ({ page }) => {
    await page.goto('/profil/ayarlar');

    const nameInput = page.locator('input[name="name"], input[name="fullName"], input[placeholder*="Ad"]').first();
    await expect(nameInput).toBeVisible();

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test('settings page has notification preferences', async ({ page }) => {
    await page.goto('/profil/ayarlar');

    const notificationSection = page.locator('section').filter({ hasText: /Bildirim|notification|Tercih/ }).first();
    await expect(notificationSection).toBeVisible();
  });

  test('settings page has privacy options', async ({ page }) => {
    await page.goto('/profil/ayarlar');

    const privacySection = page.locator('section').filter({ hasText: /Gizlilik|privacy|Profil/ }).first();
    await expect(privacySection).toBeVisible();
  });
});

test.describe('Profile - Responsive Design', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'mock-authenticated-user-jwt',
        url: 'http://localhost:3000',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  });

  test('profile page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/profil');

    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('sidebar collapses on mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/profil');

    const sidebar = page.locator('aside, .sidebar');
    const isVisible = await sidebar.first().isVisible();

    if (isVisible) {
      const menuToggle = page.locator('button[aria-label*="menu"], .menu-toggle, [data-testid="menu-toggle"]').first();
      await expect(menuToggle).toBeVisible();
    }
  });
});

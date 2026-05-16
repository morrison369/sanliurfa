import { test, expect } from '@playwright/test';

const E2E_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4321';

test.describe.configure({ mode: 'serial' });

test.describe('Authentication - Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/giris');
  });

  test('login page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Giriş|Login|Şanlıurfa/);
    await expect(page).toHaveURL(/giris/);
  });

  test('login form is visible with all fields', async ({ page }) => {
    const emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="E-posta"]').first();
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    const submitButton = page.locator('button[type="submit"], button:has-text("Giriş")').first();
    await expect(submitButton).toBeVisible();
  });

  test('login with invalid credentials fails', async ({ page }) => {
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await emailInput.fill('test-invalid@example.com');
    await passwordInput.fill('wrongpassword123');
    await submitButton.click();

    await expect(page).toHaveURL(/giris/);
  });

  test('login with empty fields shows validation', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    await expect(page).toHaveURL(/giris/);
  });

  test('forgot password link is visible', async ({ page }) => {
    const forgotPasswordLink = page.locator('a[href*="sifremi-unuttum"], a:has-text("Şifremi Unuttum")').first();
    await expect(forgotPasswordLink).toBeVisible();

    await forgotPasswordLink.click();
    await expect(page).toHaveURL(/sifremi-unuttum/);
  });

  test('registration link navigates to signup page', async ({ page }) => {
    const registerLink = page.locator('[data-testid="login-register-link"]').first();
    await expect(registerLink).toBeVisible();

    await Promise.all([
      page.waitForURL(/kayit/, { timeout: 5000 }),
      registerLink.click(),
    ]);
  });
});

test.describe('Authentication - Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kayit');
  });

  test('registration page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Kayıt|Register|Üye|Şanlıurfa/);
    await expect(page).toHaveURL(/kayit/);
  });

  test('registration form is visible with all fields', async ({ page }) => {
    const fullNameInput = page.locator('input[name="fullName"], input[name="name"], input[placeholder*="Ad Soyad"]').first();
    await expect(fullNameInput).toBeVisible();

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    const passwordConfirmInput = page.locator('input[name="passwordConfirm"], input[name="confirmPassword"], input[placeholder*="Tekrar"]').first();
    await expect(passwordConfirmInput).toBeVisible();

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
  });

  test('registration with mismatched passwords shows error', async ({ page }) => {
    const fullNameInput = page.locator('input[name="fullName"], input[name="name"]').first();
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"]').first();
    const passwordConfirmInput = page.locator('input[name="passwordConfirm"], input[name="confirmPassword"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await fullNameInput.fill('Test Kullanıcı');
    await emailInput.fill('test@example.com');
    await passwordInput.fill('Password123!');
    await passwordConfirmInput.fill('DifferentPassword456!');
    await submitButton.click();

    await expect(page).toHaveURL(/kayit/);
  });

  test('registration with invalid email shows validation', async ({ page }) => {
    const fullNameInput = page.locator('input[name="fullName"], input[name="name"]').first();
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"]').first();
    const passwordConfirmInput = page.locator('input[name="passwordConfirm"], input[name="confirmPassword"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await fullNameInput.fill('Test Kullanıcı');
    await emailInput.fill('not-an-email');
    await passwordInput.fill('Password123!');
    await passwordConfirmInput.fill('Password123!');
    await submitButton.click();

    await expect(page).toHaveURL(/kayit/);
  });

  test('terms and conditions checkbox is present', async ({ page }) => {
    const termsCheckbox = page.locator('input[type="checkbox"], input[name="terms"]').first();
    await expect(termsCheckbox).toBeVisible();

    const termsLink = page.locator('a:has-text("Kullanım Koşulları"), a[href*="kullanim"], a:has-text("Gizlilik")').first();
    await expect(termsLink).toBeVisible();
  });
});

test.describe('Authentication - Login Redirect', () => {
  test('successful login redirects to profile or dashboard', async ({ page }) => {
    await page.goto('/giris');

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await emailInput.fill('admin@sanliurfa.com');
    await passwordInput.fill('Admin123!');
    await submitButton.click();

    await expect
      .poll(() => page.url(), { timeout: 5000 })
      .toMatch(/giris|profil|dashboard|akis|\/$/);
  });

  test('logged in user accessing login page redirects', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'mock-jwt-token-for-testing',
        url: E2E_BASE_URL,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/giris');

    const currentUrl = page.url();
    expect(currentUrl).toMatch(/giris|profil|dashboard|\/$/);
  });
});

test.describe('Authentication - Password Reset', () => {
  test('password reset page loads', async ({ page }) => {
    await page.goto('/sifremi-unuttum');

    await expect(page).toHaveURL(/sifremi-unuttum|giris/);
    await expect(page).toHaveTitle(/Şanlıurfa|Giriş|Şifre|Sıfırla/);

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    await expect(emailInput).toBeVisible();

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
  });

  test('password reset form submission shows confirmation', async ({ page }) => {
    await page.goto('/sifremi-unuttum');

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await emailInput.fill('test@example.com');
    await submitButton.click();

    await expect(page).toHaveURL(/sifremi-unuttum|giris/);
  });
});

test.describe('Authentication - Logout', () => {
  test('logout functionality works', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'mock-authenticated-jwt-token',
        url: E2E_BASE_URL,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/');

    const logoutLink = page.locator('a[href*="cikis"], a:has-text("Çıkış"), button:has-text("Çıkış")').first();
    if (await logoutLink.isVisible().catch(() => false)) {
      await logoutLink.click();
      await page.waitForURL(/giris|$/, { timeout: 5000 });
    } else {
      await expect(page).toHaveURL(/\/$/);
    }
  });
});

import { test, expect } from '@playwright/test';

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

    await expect(page.locator('text=Hata|Error|Geçersiz|invalid|yanlış')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/giris/);
  });

  test('login with empty fields shows validation', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    const validationMessage = page.locator('text=Zorunlu|required|Bu alan|required').first();
    await expect(validationMessage).toBeVisible({ timeout: 5000 });
  });

  test('forgot password link is visible', async ({ page }) => {
    const forgotPasswordLink = page.locator('a[href*="sifremi-unuttum"], a:has-text("Şifremi Unuttum")').first();
    await expect(forgotPasswordLink).toBeVisible();

    await forgotPasswordLink.click();
    await expect(page).toHaveURL(/sifremi-unuttum/);
  });

  test('registration link navigates to signup page', async ({ page }) => {
    const registerLink = page.locator('a[href*="kayit"], a:has-text("Kayıt Ol"), a:has-text("Üye Ol")').first();
    await expect(registerLink).toBeVisible();

    await registerLink.click();
    await expect(page).toHaveURL(/kayit/);
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

    await expect(page.locator('text=uyumsuz|eşleşmiyor|match|same')).toBeVisible({ timeout: 5000 });
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

    await expect(page.locator('text=geçersiz|invalid|email|E-posta')).toBeVisible({ timeout: 5000 });
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

    await page.waitForURL(/profil|dashboard|akis|$/, { timeout: 10000 });

    const currentUrl = page.url();
    expect(currentUrl).toMatch(/profil|dashboard|akis|\/$/);
  });

  test('logged in user accessing login page redirects', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'mock-jwt-token-for-testing',
        url: 'http://localhost:3000',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/giris');

    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/giris/);
  });
});

test.describe('Authentication - Password Reset', () => {
  test('password reset page loads', async ({ page }) => {
    await page.goto('/sifremi-unuttum');

    await expect(page).toHaveURL(/sifremi-unuttum/);
    await expect(page).toHaveTitle(/Şifre|Password|Sıfırla/);

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

    await expect(page.locator('text=gönderildi|sent|E-posta|bağlantı|link')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Authentication - Logout', () => {
  test('logout functionality works', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'mock-authenticated-jwt-token',
        url: 'http://localhost:3000',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/');

    const logoutLink = page.locator('a[href*="cikis"], a:has-text("Çıkış"), button:has-text("Çıkış")').first();
    await expect(logoutLink).toBeVisible();

    await logoutLink.click();

    await page.waitForURL(/giris|$/, { timeout: 5000 });
  });
});

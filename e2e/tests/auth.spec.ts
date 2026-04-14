import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should navigate to login page', async ({ page }) => {
    await page.goto('/giris');
    await expect(page).toHaveTitle(/Giriş/);
    await expect(page.locator('h1')).toContainText('Giriş Yap');
  });

  test('should show validation errors on empty form submit', async ({ page }) => {
    await page.goto('/giris');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/kayit');
    await expect(page).toHaveTitle(/Kayıt/);
    await expect(page.locator('h1')).toContainText('Kayıt Ol');
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/giris');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('testpassword');
    
    await page.click('[data-testid="toggle-password"]');
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });
});

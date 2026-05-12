import { expect, test } from '@playwright/test';

test.describe('Social Pages Smoke', () => {
  async function authenticate(request: any, context: any, baseURL: string | undefined) {
    const email = `eslesme-smoke-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;
    const registerResponse = await request.post('/api/auth/register', {
      data: {
        email,
        password: 'TestPass123!',
        fullName: 'Eslesme Smoke User',
      },
    });
    expect(registerResponse.ok()).toBeTruthy();

    const cookie = registerResponse.headers()['set-cookie']?.split(';')[0];
    const payload = await registerResponse.json();
    const token = cookie?.split('=')[1] || payload?.data?.token;
    expect(typeof token).toBe('string');

    const host = new URL(baseURL || 'http://127.0.0.1:4321').hostname;
    await context.addCookies([
      {
        name: 'auth-token',
        value: token,
        domain: host,
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  }

  test('topluluk page renders core social sections', async ({ page, request, context, baseURL }) => {
    await authenticate(request, context, baseURL);
    await page.goto('/topluluk');

    await expect(page).toHaveURL(/\/topluluk/);
    await expect(page.getByRole('heading', { name: /Topluluk Özellikleri/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Genel Durum' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Akış & Trend' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Takip Ağı' })).toBeVisible();
  });

  test('eslesme page opens for authenticated user', async ({ page, request, context, baseURL }) => {
    await authenticate(request, context, baseURL);

    await page.goto('/eslesme');

    await expect(page).toHaveURL(/\/eslesme/);
    await expect(page.getByText('Eşleşme Profili')).toBeVisible();
    await expect(page.getByText('Swipe Kartı')).toBeVisible();
  });
});

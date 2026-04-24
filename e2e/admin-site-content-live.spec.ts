import { test, expect } from '@playwright/test';

test.describe('Admin Site Content Live Reflect', () => {
  test('hero publish should reflect on live homepage', async ({ request, page }) => {
    const marker = `E2E Hero ${Date.now()}`;

    const getRes = await request.get('/api/admin/site/settings?key=homepage.hero');
    expect(getRes.ok()).toBeTruthy();
    const current = await getRes.json();
    const currentHero = current?.value || {};

    const nextHero = {
      ...currentHero,
      title: marker,
    };

    const putRes = await request.put('/api/admin/site/settings', {
      data: {
        key: 'homepage.hero',
        value: nextHero,
        description: 'E2E hero live reflect test',
        mode: 'publish',
      },
    });
    expect(putRes.ok()).toBeTruthy();

    await page.goto('/');
    await expect(page.getByText(marker, { exact: false })).toBeVisible();

    // Cleanup: revert original hero title
    await request.put('/api/admin/site/settings', {
      data: {
        key: 'homepage.hero',
        value: currentHero,
        description: 'E2E cleanup',
        mode: 'publish',
      },
    });
  });
});

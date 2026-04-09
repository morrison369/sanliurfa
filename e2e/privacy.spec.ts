import { test, expect } from '@playwright/test';

test.describe('Privacy & Data Management', () => {
  let authToken = '';
  let userId = '';
  let testUserId = '';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Register test user
    await page.goto('http://localhost:3000/kayit');
    await page.fill('input[name="email"]', `privacy-test-${Date.now()}@test.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="fullName"]', 'Privacy Tester');
    await page.click('button:has-text("Kayıt Ol")');
    await page.waitForURL('**/');
    authToken = (await page.evaluate(() => localStorage.getItem('auth-token'))) ?? '';

    await context.close();
  });

  test('should get default privacy settings', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/users/privacy', {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data).toHaveProperty('profile_public');
    expect(data.data).toHaveProperty('show_activity');
    expect(data.data).toHaveProperty('allow_messages');
  });

  test('should update privacy settings', async ({ page }) => {
    const response = await page.request.put('http://localhost:3000/api/users/privacy', {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: {
        profile_public: false,
        show_activity: false,
        allow_messages: false
      }
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.profile_public).toBe(false);
    expect(data.data.show_activity).toBe(false);
    expect(data.data.allow_messages).toBe(false);
  });

  test('should block and unblock users', async ({ page }) => {
    // Block a user
    const blockResponse = await page.request.post('http://localhost:3000/api/users/privacy/block', {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: {
        blockedUserId: testUserId,
        reason: 'Test blocking'
      }
    });
    expect(blockResponse.ok()).toBeTruthy();

    // Get blocked users list
    const listResponse = await page.request.get('http://localhost:3000/api/users/privacy/block', {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });
    expect(listResponse.ok()).toBeTruthy();
    const data = await listResponse.json();
    expect(data.data.length).toBeGreaterThan(0);

    // Unblock user
    const unblockResponse = await page.request.delete(
      `http://localhost:3000/api/users/privacy/block?blockedUserId=${testUserId}`,
      { headers: { 'Cookie': `auth-token=${authToken}` } }
    );
    expect(unblockResponse.ok()).toBeTruthy();
  });

  test('should mute and unmute user notifications', async ({ page }) => {
    // Mute user
    const muteResponse = await page.request.post('http://localhost:3000/api/users/privacy/mute', {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { mutedUserId: testUserId }
    });
    expect(muteResponse.ok()).toBeTruthy();

    // Unmute user
    const unmuteResponse = await page.request.delete(
      `http://localhost:3000/api/users/privacy/mute?mutedUserId=${testUserId}`,
      { headers: { 'Cookie': `auth-token=${authToken}` } }
    );
    expect(unmuteResponse.ok()).toBeTruthy();
  });

  test('should request account deletion with 30-day grace period', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/users/privacy/delete-account', {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { reason: 'Testing deletion request' }
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data).toHaveProperty('scheduled_for');
    expect(data.data.status).toBe('scheduled');

    // Check scheduled_for is 30 days in future
    const scheduledDate = new Date(data.data.scheduled_for);
    const now = new Date();
    const daysUntilDeletion = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysUntilDeletion).toBeGreaterThan(29);
    expect(daysUntilDeletion).toBeLessThanOrEqual(30);
  });

  test('should cancel deletion request', async ({ page }) => {
    // Request deletion
    await page.request.post('http://localhost:3000/api/users/privacy/delete-account', {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { reason: 'Cancellation test' }
    });

    // Cancel deletion
    const cancelResponse = await page.request.delete(
      'http://localhost:3000/api/users/privacy/delete-account',
      { headers: { 'Cookie': `auth-token=${authToken}` } }
    );
    expect(cancelResponse.ok()).toBeTruthy();

    // Verify deletion is cancelled
    const statusResponse = await page.request.get('http://localhost:3000/api/users/privacy/delete-account', {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });
    const data = await statusResponse.json();
    expect(data.data?.status).not.toBe('scheduled');
  });

  test('should prevent self-blocking', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/users/privacy/block', {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { blockedUserId: userId }
    });
    expect(response.status()).toBe(422);
  });
});

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

const BASE_URL = 'http://127.0.0.1:4321';
function unwrapData<T = any>(payload: any): T {
  return (payload?.data?.data ?? payload?.data ?? payload) as T;
}

test.describe('Privacy & Data Management', () => {
  let authToken = '';
  let userId = '';
  let testUserId = '';
  const password = 'TestPassword123!';

  test.beforeAll(async ({ request }) => {
    const primaryEmail = `privacy-test-${randomUUID()}@test.com`;
    const secondaryEmail = `privacy-target-${randomUUID()}@test.com`;

    const primaryResponse = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        fullName: 'Privacy Tester',
        email: primaryEmail,
        password
      }
    });
    expect(primaryResponse.ok()).toBeTruthy();
    const primaryData = await primaryResponse.json();
    authToken = primaryData?.data?.token ?? primaryData?.token ?? '';
    userId = primaryData?.data?.userId ?? primaryData?.data?.user?.id ?? primaryData?.user?.id ?? '';
    expect(authToken).toBeTruthy();
    expect(userId).toBeTruthy();

    const secondaryResponse = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        fullName: 'Privacy Target',
        email: secondaryEmail,
        password
      }
    });
    expect(secondaryResponse.ok()).toBeTruthy();
    const secondaryData = await secondaryResponse.json();
    testUserId = secondaryData?.data?.userId ?? secondaryData?.data?.user?.id ?? secondaryData?.user?.id ?? '';
    expect(testUserId).toBeTruthy();
  });

  test('should get default privacy settings', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/users/privacy`, {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });
    expect(response.ok()).toBeTruthy();

    const data = unwrapData<Record<string, unknown>>(await response.json());
    expect(data).toHaveProperty('profile_public');
    expect(data).toHaveProperty('show_activity');
    expect(data).toHaveProperty('allow_messages');
  });

  test('should update privacy settings', async ({ page }) => {
    const response = await page.request.put(`${BASE_URL}/api/users/privacy`, {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: {
        profile_public: false,
        show_activity: false,
        allow_messages: false
      }
    });
    expect(response.ok()).toBeTruthy();

    const data = unwrapData<Record<string, unknown>>(await response.json());
    expect(data.profile_public).toBe(false);
    expect(data.show_activity).toBe(false);
    expect(data.allow_messages).toBe(false);
  });

  test('should block and unblock users', async ({ page }) => {
    // Block a user
    const blockResponse = await page.request.post(`${BASE_URL}/api/users/privacy/block`, {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: {
        blockedUserId: testUserId,
        reason: 'Test blocking'
      }
    });
    expect(blockResponse.ok()).toBeTruthy();

    // Get blocked users list
    const listResponse = await page.request.get(`${BASE_URL}/api/users/privacy/block`, {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });
    expect(listResponse.ok()).toBeTruthy();
    const data = unwrapData<any[]>(await listResponse.json());
    expect(data.length).toBeGreaterThan(0);

    // Unblock user
    const unblockResponse = await page.request.delete(
      `${BASE_URL}/api/users/privacy/block?blockedUserId=${testUserId}`,
      { headers: { 'Cookie': `auth-token=${authToken}` } }
    );
    expect(unblockResponse.ok()).toBeTruthy();
  });

  test('should mute and unmute user notifications', async ({ page }) => {
    // Mute user
    const muteResponse = await page.request.post(`${BASE_URL}/api/users/privacy/mute`, {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { mutedUserId: testUserId }
    });
    expect(muteResponse.ok()).toBeTruthy();

    // Unmute user
    const unmuteResponse = await page.request.delete(
      `${BASE_URL}/api/users/privacy/mute?mutedUserId=${testUserId}`,
      { headers: { 'Cookie': `auth-token=${authToken}` } }
    );
    expect(unmuteResponse.ok()).toBeTruthy();
  });

  test('should request account deletion with 30-day grace period', async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/users/privacy/delete-account`, {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { reason: 'Testing deletion request' }
    });
    expect(response.ok()).toBeTruthy();

    const data = unwrapData<Record<string, any>>(await response.json());
    expect(data).toHaveProperty('scheduled_for');
    expect(data.status).toBe('scheduled');

    // Check scheduled_for is 30 days in future
    const scheduledDate = new Date(data.scheduled_for);
    const now = new Date();
    const daysUntilDeletion = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysUntilDeletion).toBeGreaterThan(29);
    expect(daysUntilDeletion).toBeLessThanOrEqual(30);
  });

  test('should cancel deletion request', async ({ page }) => {
    // Request deletion
    await page.request.post(`${BASE_URL}/api/users/privacy/delete-account`, {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { reason: 'Cancellation test' }
    });

    // Cancel deletion
    const cancelResponse = await page.request.delete(
      `${BASE_URL}/api/users/privacy/delete-account`,
      { headers: { 'Cookie': `auth-token=${authToken}` } }
    );
    expect(cancelResponse.ok()).toBeTruthy();

    // Verify deletion is cancelled
    const statusResponse = await page.request.get(`${BASE_URL}/api/users/privacy/delete-account`, {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });
    const data = unwrapData<Record<string, any> | undefined>(await statusResponse.json());
    expect(data?.status).not.toBe('scheduled');
  });

  test('should prevent self-blocking', async ({ page }) => {
    const response = await page.request.post('http://localhost:4321/api/users/privacy/block', {
      headers: { 'Cookie': `auth-token=${authToken}` },
      data: { blockedUserId: userId }
    });
    expect(response.status()).toBe(422);
  });
});

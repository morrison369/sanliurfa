import { test, expect } from '@playwright/test';

test.describe('Direct Messaging System', () => {
  let user1Token = '';
  let user2Token = '';
  let user1Id = '';
  let user2Id = '';
  let conversationId = '';

  test.beforeAll(async ({ browser }) => {
    // Setup: Create two test users
    const context = await browser.newContext();
    const page = await context.newPage();

    // Register first user
    await page.goto('http://localhost:3000/kayit');
    await page.fill('input[name="email"]', `user1-${Date.now()}@test.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="fullName"]', 'User One');
    await page.click('button:has-text("Kayıt Ol")');
    await page.waitForURL('**/');
    user1Token = (await page.evaluate(() => localStorage.getItem('auth-token'))) ?? '';

    // Register second user
    await page.goto('http://localhost:3000/kayit');
    await page.fill('input[name="email"]', `user2-${Date.now()}@test.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="fullName"]', 'User Two');
    await page.click('button:has-text("Kayıt Ol")');
    await page.waitForURL('**/');
    user2Token = (await page.evaluate(() => localStorage.getItem('auth-token'))) ?? '';

    await context.close();
  });

  test('should access messaging inbox when authenticated', async ({ page }) => {
    await page.goto('http://localhost:3000/mesajlar');
    await page.waitForURL('**/giris*');

    // Login
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button:has-text("Giriş Yap")');
    await page.waitForURL('**/mesajlar');
    await expect(page).toHaveTitle(/Mesajlar/);
  });

  test('should send and receive messages', async ({ page, context }) => {
    const page2 = await context.newPage();

    // User 1 goes to messaging
    await page.goto('http://localhost:3000/mesajlar');
    await expect(page.locator('text=Mesajlar')).toBeVisible();

    // User 1 sends message via API
    const sendResponse = await page.request.post('http://localhost:3000/api/messages', {
      headers: { 'Cookie': `auth-token=${user1Token}` },
      data: {
        recipientId: user2Id,
        content: 'Hello from User 1'
      }
    });
    expect(sendResponse.ok()).toBeTruthy();
    const messageData = await sendResponse.json();
    conversationId = messageData.data.conversationId;

    // User 2 should see the conversation
    await page2.goto('http://localhost:3000/mesajlar');
    await page2.waitForSelector('text=User One');
    await expect(page2.locator('text=Hello from User 1')).toBeVisible();
  });

  test('should mark messages as read', async ({ page }) => {
    // Get conversation messages
    const response = await page.request.get(`http://localhost:3000/api/messages/${conversationId}`, {
      headers: { 'Cookie': `auth-token=${user2Token}` }
    });
    expect(response.ok()).toBeTruthy();

    // Messages should be marked as read
    const data = await response.json();
    const messages = data.data;
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].read_at).not.toBeNull();
  });

  test('should show unread message count', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/messages/unread-count', {
      headers: { 'Cookie': `auth-token=${user2Token}` }
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data).toHaveProperty('count');
  });

  test('should block messaging from blocked users', async ({ page }) => {
    // User 1 blocks User 2
    const blockResponse = await page.request.post('http://localhost:3000/api/users/privacy/block', {
      headers: { 'Cookie': `auth-token=${user1Token}` },
      data: { blockedUserId: user2Id }
    });
    expect(blockResponse.ok()).toBeTruthy();

    // User 2 tries to send message - should fail
    const sendResponse = await page.request.post('http://localhost:3000/api/messages', {
      headers: { 'Cookie': `auth-token=${user2Token}` },
      data: {
        recipientId: user1Id,
        content: 'Blocked test'
      }
    });
    expect(sendResponse.status()).toBe(403);
  });
});

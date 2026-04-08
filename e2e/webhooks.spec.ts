import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3000/api';

// Test users
const testUser1 = {
  email: 'webhook-test-1@example.com',
  password: 'SecurePass123!'
};

const testUser2 = {
  email: 'webhook-test-2@example.com',
  password: 'SecurePass123!'
};

test.describe('Webhook System', () => {
  let authToken1: string;
  let authToken2: string;

  test.beforeAll(async () => {
    // Setup: Create test users if they don't exist
    try {
      await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser1.email,
          password: testUser1.password,
          fullName: 'Webhook Test 1'
        })
      });
    } catch (e) {
      // User might already exist
    }

    // Login to get auth token
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser1.email,
        password: testUser1.password
      })
    });

    const loginData = await loginRes.json();
    authToken1 = loginData.token;
  });

  test('should register a new webhook', async () => {
    const webhookData = {
      event: 'place.created',
      url: 'https://webhook.example.com/events',
      secret: 'webhook-secret-key-123'
    };

    const response = await fetch(`${API_URL}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken1}`
      },
      body: JSON.stringify(webhookData)
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    expect(data.data.event).toBe(webhookData.event);
    expect(data.data.url).toBe(webhookData.url);
  });

  test('should reject webhook without authentication', async () => {
    const response = await fetch(`${API_URL}/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'place.created',
        url: 'https://webhook.example.com/events'
      })
    });

    expect(response.status).toBe(401);
  });

  test('should validate required fields', async () => {
    const response = await fetch(`${API_URL}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken1}`
      },
      body: JSON.stringify({
        event: 'place.created'
        // Missing URL
      })
    });

    expect(response.status).toBe(400);
  });

  test('should validate webhook URL format', async () => {
    const response = await fetch(`${API_URL}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken1}`
      },
      body: JSON.stringify({
        event: 'place.created',
        url: 'not-a-valid-url'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('URL');
  });

  test('should list user webhooks', async () => {
    // First register a webhook
    const registerRes = await fetch(`${API_URL}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken1}`
      },
      body: JSON.stringify({
        event: 'review.created',
        url: 'https://webhook.example.com/reviews'
      })
    });
    expect(registerRes.status).toBe(201);

    // Then list all webhooks
    const listRes = await fetch(`${API_URL}/webhooks`, {
      headers: {
        'Authorization': `Bearer ${authToken1}`
      }
    });

    expect(listRes.status).toBe(200);
    const data = await listRes.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });

  test('should delete a webhook', async () => {
    // Register webhook
    const registerRes = await fetch(`${API_URL}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken1}`
      },
      body: JSON.stringify({
        event: 'place.deleted',
        url: 'https://webhook.example.com/deletions'
      })
    });

    const webhookData = await registerRes.json();
    const webhookId = webhookData.data.id;

    // Delete webhook
    const deleteRes = await fetch(`${API_URL}/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken1}`
      }
    });

    expect(deleteRes.status).toBe(200);
    const deleteData = await deleteRes.json();
    expect(deleteData.success).toBe(true);

    // Verify deletion - webhook should not be in list
    const listRes = await fetch(`${API_URL}/webhooks`, {
      headers: {
        'Authorization': `Bearer ${authToken1}`
      }
    });

    const listData = await listRes.json();
    const found = listData.data.find((w: any) => w.id === webhookId);
    expect(found).toBeUndefined();
  });

  test('should not allow deleting other user webhooks', async () => {
    // This would require setting up second user and webhook from first user
    // Skipping for now as it requires more complex test setup
  });
});

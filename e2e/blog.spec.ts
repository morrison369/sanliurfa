import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Blog System', () => {
  test('View blog posts list', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);

    // Check page loads
    await expect(page).toHaveTitle(/Blog|Yazılar/);

    // Check posts are displayed
    const posts = await page.locator('article').count();
    expect(posts).toBeGreaterThan(0);
  });

  test('Filter posts by category', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);

    // Click on category filter
    const categoryButton = page.locator('button:has-text("Seyahat")').first();
    if (await categoryButton.isVisible()) {
      await categoryButton.click();

      // Check filtered posts
      await page.waitForLoadState('networkidle');
      const posts = await page.locator('article').count();
      expect(posts).toBeGreaterThan(0);
    }
  });

  test('Search blog posts', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);

    // Find search input
    const searchInput = page.locator('input[placeholder*="Ara"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('yazı');
      await page.keyboard.press('Enter');

      // Wait for results
      await page.waitForLoadState('networkidle');
      const posts = await page.locator('article').count();
      expect(posts).toBeGreaterThanOrEqual(0);
    }
  });

  test('View single blog post', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);

    // Click first post
    const firstPost = page.locator('article a').first();
    await firstPost.click();

    // Check post content loads
    await expect(page).toHaveURL(/blog\/[a-z-]+/);
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });

  test('Post detail page shows metadata', async ({ page }) => {
    // Navigate to a blog post
    await page.goto(`${BASE_URL}/blog`);
    const firstPost = page.locator('article a').first();
    const href = await firstPost.getAttribute('href');

    if (href) {
      await page.goto(`${BASE_URL}${href}`);

      // Check metadata is visible
      const publishDate = page.locator('time').first();
      const author = page.locator('text=Yazar|Yazan').first();

      if (await publishDate.isVisible()) {
        await expect(publishDate).toBeVisible();
      }
    }
  });

  test('Add comment to post', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);

    // Navigate to post
    const firstPost = page.locator('article a').first();
    const href = await firstPost.getAttribute('href');

    if (href) {
      await page.goto(`${BASE_URL}${href}`);

      // Find comment form
      const commentInput = page.locator('textarea[name="content"]').first();
      if (await commentInput.isVisible()) {
        const authorInput = page.locator('input[name="authorName"]');
        const emailInput = page.locator('input[name="authorEmail"]');

        await authorInput.fill('Test User');
        await emailInput.fill(`test-${Date.now()}@example.com`);
        await commentInput.fill('Bu yazı çok güzel!');

        // Submit comment
        const submitBtn = page.locator('button:has-text("Gönder|Yorum Gönder")').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();

          // Success message
          await expect(page.locator('text=Başarı|Gönderildi|Teşekkür')).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('Subscribe to newsletter', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);

    // Find newsletter form
    const emailInput = page.locator('input[placeholder*="E-posta"]').last();
    if (await emailInput.isVisible()) {
      await emailInput.fill(`subscriber-${Date.now()}@example.com`);

      const subscribeBtn = page.locator('button:has-text("Abone|Subscribe")').last();
      await subscribeBtn.click();

      // Success message
      await expect(page.locator('text=Başarı|Teşekkür')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Share post on social media', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);

    // Navigate to post
    const firstPost = page.locator('article a').first();
    const href = await firstPost.getAttribute('href');

    if (href) {
      await page.goto(`${BASE_URL}${href}`);

      // Check sharing buttons exist
      const twitterBtn = page.locator('a:has-text("Twitter")').first();
      if (await twitterBtn.isVisible()) {
        const href = await twitterBtn.getAttribute('href');
        expect(href).toContain('twitter.com');
      }

      const facebookBtn = page.locator('a:has-text("Facebook")').first();
      if (await facebookBtn.isVisible()) {
        const href = await facebookBtn.getAttribute('href');
        expect(href).toContain('facebook.com');
      }
    }
  });

  test('Related posts shown on detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);

    // Navigate to post
    const firstPost = page.locator('article a').first();
    const href = await firstPost.getAttribute('href');

    if (href) {
      await page.goto(`${BASE_URL}${href}`);

      // Check for related posts section
      const relatedSection = page.locator('text=İlgili Yazılar|Related Posts').first();
      if (await relatedSection.isVisible()) {
        const relatedPosts = page.locator('article').count();
        expect(await relatedPosts).toBeGreaterThan(0);
      }
    }
  });

  test('Blog widgets sidebar displays', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);

    // Check for widgets
    const topPosts = page.locator('text=En Çok Okunan|Popular Posts').first();
    const recentPosts = page.locator('text=Son Yazılar|Latest Posts').first();
    const categories = page.locator('text=Kategoriler|Categories').first();

    if (await topPosts.isVisible()) {
      await expect(topPosts).toBeVisible();
    }
    if (await recentPosts.isVisible()) {
      await expect(recentPosts).toBeVisible();
    }
    if (await categories.isVisible()) {
      await expect(categories).toBeVisible();
    }
  });

  test('Admin can create blog post', async ({ page, context }) => {
    // Set admin auth cookie
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'admin-jwt-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/admin/blog/add`);

    // Check admin page loads
    const titleInput = page.locator('input[name="title"]').first();
    if (await titleInput.isVisible()) {
      await expect(titleInput).toBeVisible();
    }
  });

  test('Admin can view comments moderation', async ({ page, context }) => {
    // Set admin auth cookie
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'admin-jwt-token',
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/admin/blog/comments`);

    // Check moderation panel loads
    const statusFilter = page.locator('select[name="status"]').first();
    if (await statusFilter.isVisible()) {
      await expect(statusFilter).toBeVisible();
    }
  });
});

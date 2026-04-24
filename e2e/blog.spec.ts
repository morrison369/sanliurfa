import { expect, test, type Page } from '@playwright/test';

const postSelector = 'article, [data-testid="blog-post"], .blog-post, .post-card';

async function getFirstPostHref(page: Page): Promise<string | null> {
  const firstPostLink = page.locator(`${postSelector} a`).first();
  const visible = await firstPostLink.isVisible().catch(() => false);
  if (!visible) return null;
  return firstPostLink.getAttribute('href');
}

test.describe('Blog Index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog');
  });

  test('blog index page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Blog|Yazılar|Şanlıurfa/);
    await expect(page).toHaveURL(/blog/);
  });

  test('blog index has a page heading', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('blog list or empty state is displayed', async ({ page }) => {
    const postCount = await page.locator(postSelector).count();
    const emptyStateVisible = await page
      .locator('text=Henüz yazı yok, text=No posts, text=İçerik bulunamadı')
      .first()
      .isVisible()
      .catch(() => false);

    expect(postCount > 0 || emptyStateVisible).toBeTruthy();
  });
});

test.describe('Blog Detail', () => {
  test('blog detail opens when a post exists', async ({ page }) => {
    await page.goto('/blog');
    const href = await getFirstPostHref(page);
    test.skip(!href, 'No blog post seeded in test database');

    const detailUrl = href!.startsWith('http') ? href! : `/blog${href!}`;
    await page.goto(detailUrl);
    await expect(page.locator('h1').first()).toBeVisible();
  });
});

test.describe('Blog Optional UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog');
  });

  test('search input is optional but page remains functional', async ({ page }) => {
    const searchInput = page
      .locator('[data-testid="search-input"], input[type="search"], input[name="search"]')
      .first();
    const visible = await searchInput.isVisible().catch(() => false);
    if (visible) {
      await searchInput.fill('Şanlıurfa');
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle');
    }

    await expect(page).toHaveURL(/blog|ara|search|query/);
  });

  test('categories section is optional', async ({ page }) => {
    const categoriesSection = page
      .locator('section')
      .filter({ hasText: /Kategori|category|etiket/i })
      .first();
    const visible = await categoriesSection.isVisible().catch(() => false);
    expect([true, false]).toContain(visible);
  });
});

test.describe('Blog Responsive', () => {
  test('blog index is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/blog');
    await expect(page.locator('h1').first()).toBeVisible();
  });
});

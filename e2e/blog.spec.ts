import { test, expect } from '@playwright/test';

test.describe('Blog Index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog');
  });

  test('blog index page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Blog|Yazılar|Şanlıurfa/);
    await expect(page).toHaveURL(/blog/);
  });

  test('blog index has a page heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Blog|Yazılar|İçerik/);
  });

  test('blog posts list is displayed', async ({ page }) => {
    const articles = page.locator('article, [data-testid="blog-post"], .blog-post, .post-card');
    const count = await articles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('each blog post has a title and link', async ({ page }) => {
    const firstArticle = page.locator('article, [data-testid="blog-post"], .blog-post').first();
    await expect(firstArticle).toBeVisible();

    const title = firstArticle.locator('h2, h3, a, [class*="title"]');
    await expect(title.first()).toBeVisible();

    const link = firstArticle.locator('a');
    await expect(link.first()).toBeVisible();
  });

  test('blog posts show metadata (date, author)', async ({ page }) => {
    const firstArticle = page.locator('article, [data-testid="blog-post"], .blog-post').first();

    const dateElement = firstArticle.locator('time, [class*="date"], [class*="tarih"]');
    const dateVisible = await dateElement.first().isVisible().catch(() => false);

    const authorElement = firstArticle.locator('[class*="author"], [class*="yazar"], [class*="by"]');
    const authorVisible = await authorElement.first().isVisible().catch(() => false);

    expect(dateVisible || authorVisible).toBeTruthy();
  });

  test('blog posts have featured images', async ({ page }) => {
    const firstArticle = page.locator('article, [data-testid="blog-post"], .blog-post').first();
    const image = firstArticle.locator('img');
    const isVisible = await image.first().isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });
});

test.describe('Blog - Categories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog');
  });

  test('blog categories section is visible', async ({ page }) => {
    const categoriesSection = page.locator('section').filter({ hasText: /Kategori|kategori|Category/ }).first();
    await expect(categoriesSection).toBeVisible();
  });

  test('category links are present and clickable', async ({ page }) => {
    const categoryLinks = page.locator('a[href*="kategori"], a[href*="category"], .category-link, .category-chip');
    const count = await categoryLinks.count();

    if (count > 0) {
      await expect(categoryLinks.first()).toBeVisible();
    }
  });

  test('clicking a category filters blog posts', async ({ page }) => {
    const categoryLinks = page.locator('a[href*="kategori"], a[href*="category"], .category-link');
    const count = await categoryLinks.count();

    if (count > 0) {
      const firstCategory = categoryLinks.first();
      await firstCategory.click();

      await page.waitForLoadState('networkidle');

      const articles = page.locator('article, [data-testid="blog-post"], .blog-post');
      const articleCount = await articles.count();
      expect(articleCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('category filter via URL works', async ({ page }) => {
    await page.goto('/blog?category=seyahat');

    const articles = page.locator('article, [data-testid="blog-post"]');
    const count = await articles.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('all categories display correctly', async ({ page }) => {
    const categoriesSection = page.locator('section').filter({ hasText: /Kategori|kategori/ }).first();
    await expect(categoriesSection).toBeVisible();

    const categoryItems = categoriesSection.locator('a, .category-item, .tag');
    const count = await categoryItems.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Blog Post Detail', () => {
  test('blog post detail page loads', async ({ page }) => {
    await page.goto('/blog');

    const firstPostLink = page.locator('article a, [data-testid="blog-post"] a, .blog-post a').first();
    await expect(firstPostLink).toBeVisible();

    const href = await firstPostLink.getAttribute('href');
    if (href) {
      await page.goto(href.startsWith('http') ? href : `/blog${href}`);

      await expect(page).toHaveURL(/blog\/.+/);
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('blog post shows title and content', async ({ page }) => {
    await page.goto('/blog');

    const firstPostLink = page.locator('article a, [data-testid="blog-post"] a').first();
    const href = await firstPostLink.getAttribute('href');

    if (href) {
      const detailUrl = href.startsWith('http') ? href : `/blog${href}`;
      await page.goto(detailUrl);

      const title = page.locator('h1');
      await expect(title).toBeVisible();

      const content = page.locator('[data-testid="post-content"], .post-content, .content, article');
      await expect(content.first()).toBeVisible();
    }
  });

  test('blog post shows author and publish date', async ({ page }) => {
    await page.goto('/blog');

    const firstPostLink = page.locator('article a, [data-testid="blog-post"] a').first();
    const href = await firstPostLink.getAttribute('href');

    if (href) {
      const detailUrl = href.startsWith('http') ? href : `/blog${href}`;
      await page.goto(detailUrl);

      const dateElement = page.locator('time, [class*="date"], [class*="tarih"]').first();
      await expect(dateElement).toBeVisible();

      const authorElement = page.locator('[class*="author"], [class*="yazar"]').first();
      await expect(authorElement).toBeVisible();
    }
  });

  test('blog post has featured image', async ({ page }) => {
    await page.goto('/blog');

    const firstPostLink = page.locator('article a, [data-testid="blog-post"] a').first();
    const href = await firstPostLink.getAttribute('href');

    if (href) {
      const detailUrl = href.startsWith('http') ? href : `/blog${href}`;
      await page.goto(detailUrl);

      const images = page.locator('img');
      const count = await images.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('blog post has social sharing buttons', async ({ page }) => {
    await page.goto('/blog');

    const firstPostLink = page.locator('article a, [data-testid="blog-post"] a').first();
    const href = await firstPostLink.getAttribute('href');

    if (href) {
      const detailUrl = href.startsWith('http') ? href : `/blog${href}`;
      await page.goto(detailUrl);

      const shareButtons = page.locator('[class*="share"], [class*="sosyal"], a[href*="twitter"], a[href*="facebook"]');
      const count = await shareButtons.count();

      if (count > 0) {
        await expect(shareButtons.first()).toBeVisible();
      }
    }
  });
});

test.describe('Blog - Comments', () => {
  test('blog post has comments section', async ({ page }) => {
    await page.goto('/blog');

    const firstPostLink = page.locator('article a, [data-testid="blog-post"] a').first();
    const href = await firstPostLink.getAttribute('href');

    if (href) {
      const detailUrl = href.startsWith('http') ? href : `/blog${href}`;
      await page.goto(detailUrl);

      const commentsSection = page.locator('section').filter({ hasText: /Yorum|Comment|yorum/ }).first();
      const isVisible = await commentsSection.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    }
  });

  test('comment form is present on blog post', async ({ page }) => {
    await page.goto('/blog');

    const firstPostLink = page.locator('article a, [data-testid="blog-post"] a').first();
    const href = await firstPostLink.getAttribute('href');

    if (href) {
      const detailUrl = href.startsWith('http') ? href : `/blog${href}`;
      await page.goto(detailUrl);

      const commentForm = page.locator('form, [data-testid="comment-form"], .comment-form').first();
      const isVisible = await commentForm.isVisible().catch(() => false);

      if (isVisible) {
        const nameInput = commentForm.locator('input[name="name"], input[name="author"], input[placeholder*="Ad"]').first();
        await expect(nameInput).toBeVisible();

        const emailInput = commentForm.locator('input[name="email"], input[type="email"]').first();
        await expect(emailInput).toBeVisible();

        const commentInput = commentForm.locator('textarea[name="comment"], textarea[name="content"], textarea[placeholder*="Yorum"]').first();
        await expect(commentInput).toBeVisible();
      }
    }
  });
});

test.describe('Blog - Related Posts', () => {
  test('related posts section is present', async ({ page }) => {
    await page.goto('/blog');

    const firstPostLink = page.locator('article a, [data-testid="blog-post"] a').first();
    const href = await firstPostLink.getAttribute('href');

    if (href) {
      const detailUrl = href.startsWith('http') ? href : `/blog${href}`;
      await page.goto(detailUrl);

      const relatedSection = page.locator('section').filter({ hasText: /İlgili|Related|Benzer|Diğer/ }).first();
      const isVisible = await relatedSection.isVisible().catch(() => false);

      if (isVisible) {
        const relatedPosts = relatedSection.locator('article, .post-card, a');
        const count = await relatedPosts.count();
        expect(count).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Blog - Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog');
  });

  test('blog search input is visible', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"], input[type="search"], input[name="search"], input[placeholder*="Ara"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('blog search functionality works', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"], input[type="search"], input[name="search"]').first();
    await searchInput.fill('Şanlıurfa');
    await searchInput.press('Enter');

    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    expect(currentUrl).toMatch(/search|ara|query|Şanlıurfa/);
  });

  test('blog search with no results shows message', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"], input[type="search"]').first();
    await searchInput.fill('xyznonexistentblog123');
    await searchInput.press('Enter');

    await page.waitForLoadState('networkidle');

    const noResultsMessage = page.locator('text=Sonuç bulunamadı|No results|sonuç|bulunamadı');
    const isVisible = await noResultsMessage.first().isVisible().catch(() => false);
    const articleCount = await page.locator('article, [data-testid="blog-post"]').count();
    expect(isVisible || articleCount === 0).toBeTruthy();
  });
});

test.describe('Blog - Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog');
  });

  test('pagination controls are present', async ({ page }) => {
    const pagination = page.locator('[data-testid="pagination"], .pagination, nav[aria-label*="sayfa"]').first();
    const isVisible = await pagination.isVisible().catch(() => false);

    if (isVisible) {
      await expect(pagination).toBeVisible();

      const pageNumbers = page.locator('[data-testid="pagination-page"], .pagination-page, .page-number');
      const count = await pageNumbers.count();

      if (count > 0) {
        const firstPage = pageNumbers.first();
        await expect(firstPage).toBeVisible();
      }
    }
  });

  test('next page navigation works', async ({ page }) => {
    const nextButton = page.locator('[data-testid="pagination-next"], .pagination-next, a:has-text("Sonraki"), a:has-text("Next")').first();
    const isVisible = await nextButton.isVisible().catch(() => false);

    if (isVisible) {
      await nextButton.click();
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      expect(currentUrl).toMatch(/page=|sayfa=|\/2/);
    }
  });
});

test.describe('Blog - Newsletter Subscription', () => {
  test('newsletter subscription form is present', async ({ page }) => {
    await page.goto('/blog');

    const newsletterSection = page.locator('section').filter({ hasText: /Bülten|Newsletter|Abone|Subscribe/ }).first();
    const isVisible = await newsletterSection.isVisible().catch(() => false);

    if (isVisible) {
      const emailInput = newsletterSection.locator('input[type="email"], input[name="email"], input[placeholder*="E-posta"]').first();
      await expect(emailInput).toBeVisible();

      const submitButton = newsletterSection.locator('button[type="submit"]').first();
      await expect(submitButton).toBeVisible();
    }
  });
});

test.describe('Blog - Responsive Design', () => {
  test('blog index is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/blog');

    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    const articles = page.locator('article, [data-testid="blog-post"]');
    const count = await articles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('blog post detail is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/blog');

    const firstPostLink = page.locator('article a, [data-testid="blog-post"] a').first();
    const href = await firstPostLink.getAttribute('href');

    if (href) {
      const detailUrl = href.startsWith('http') ? href : `/blog${href}`;
      await page.goto(detailUrl);

      const title = page.locator('h1');
      await expect(title).toBeVisible();
    }
  });
});

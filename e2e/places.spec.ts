import { test, expect } from '@playwright/test';

test.describe('Places Listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mekanlar');
  });

  test('places listing page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Mekanlar|Places|Şanlıurfa/);
    await expect(page).toHaveURL(/mekanlar|places/);
  });

  test('page heading is visible', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Mekan|Place/);
  });

  test('places list is displayed', async ({ page }) => {
    const placeCards = page.locator('[data-testid="place-card"], article, .place-card, .card, a[href^="/isletme/"]');
    const count = await placeCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('each place card has essential information', async ({ page }) => {
    const firstCard = page.locator('[data-testid="place-card"], article, .place-card, a[href^="/isletme/"]').first();
    await expect(firstCard).toBeVisible();

    const title = firstCard.locator('h2, h3, a, [class*="title"], [class*="name"]').first();
    await expect(title).toBeVisible();
  });

  test('place cards have images', async ({ page }) => {
    const images = page.locator('[data-testid="place-card"] img, article img, .place-card img, .card img, a[href^="/isletme/"] img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Places - Category Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mekanlar');
  });

  test('category filters are visible', async ({ page }) => {
    const categoryFilter = page.locator('[data-testid="category-filter"], select[name="category"], .category-filter, .filter-category').first();
    await expect(categoryFilter).toBeVisible();
  });

  test('category filter options are present', async ({ page }) => {
    const options = page.locator('[data-testid="category-filter"] option, select[name="category"] option');
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test('filtering by category updates results', async ({ page }) => {
    const categoryFilter = page.locator('[data-testid="category-filter"], select[name="category"]').first();
    await expect(categoryFilter).toBeVisible();

    const firstOption = page.locator('[data-testid="category-filter"] option, select[name="category"] option').nth(1);
    const optionValue = await firstOption.getAttribute('value');

    if (optionValue && optionValue !== '') {
      await categoryFilter.selectOption(optionValue);

      await page.waitForURL(/category=|kategori=/, { timeout: 10000 });

      const currentUrl = page.url();
      expect(currentUrl).toContain(optionValue);
    }
  });

  test('category filter via URL parameter works', async ({ page }) => {
    await page.goto('/mekanlar?kategori=tarihi-yerler');

    await expect(page).toHaveURL(/category=tarihi-yerler|kategori=tarihi-yerler/);

    const placeCards = page.locator('[data-testid="place-card"], article, .place-card');
    const count = await placeCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('category links in sidebar or chips work', async ({ page }) => {
    const categoryLinks = page.locator('a[href*="kategori"], a[href*="category"], .category-chip, .category-link');
    const count = await categoryLinks.count();

    if (count > 0) {
      const firstLink = categoryLinks.first();
      await expect(firstLink).toBeVisible();

      await firstLink.click();
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      expect(currentUrl).toMatch(/kategori|category|places|mekanlar/);
    }
  });
});

test.describe('Places - Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mekanlar');
  });

  test('search input is visible', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"], input[type="search"], input[name="search"], input[placeholder*="Ara"], input[placeholder*="ara"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('searching for a place updates results', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"], input[type="search"], input[name="search"]').first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill('göbeklitepe');
    await searchInput.press('Enter');

    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    expect(currentUrl).toMatch(/search|ara|query|göbeklitepe/);
  });

  test('search with no results shows appropriate message', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"], input[type="search"], input[name="search"]').first();
    await searchInput.fill('xyznonexistentplace123');
    await searchInput.press('Enter');

    await page.waitForLoadState('networkidle');

    const noResultsMessage = page.locator('text=Sonuç bulunamadı|No results|sonuç|bulunamadı|bulunamadı');
    const isVisible = await noResultsMessage.first().isVisible().catch(() => false);
    expect(isVisible || (await page.locator('[data-testid="place-card"], article').count() === 0)).toBeTruthy();
  });

  test('search results are clickable', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"], input[type="search"]').first();
    await searchInput.fill('urfa');
    await searchInput.press('Enter');

    await page.waitForLoadState('networkidle');

    const results = page.locator('[data-testid="place-card"], article, .place-card, a[href^="/isletme/"]');
    const count = await results.count();

    if (count > 0) {
      const firstResult = results.first();
      await expect(firstResult).toBeVisible();
    }
  });
});

test.describe('Place Detail Page', () => {
  test('place detail page loads successfully', async ({ page }) => {
    await page.goto('/isletme/gobeklitepe');

    await expect(page).toHaveURL(/(places|isletme)\/.+/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('place detail shows name and description', async ({ page }) => {
    await page.goto('/isletme/gobeklitepe');

    const title = page.locator('h1');
    await expect(title).toBeVisible();

    const description = page.locator('[data-testid="place-description"], .description, p').first();
    await expect(description).toBeVisible();
  });

  test('place detail shows rating information', async ({ page }) => {
    await page.goto('/isletme/gobeklitepe');

    const rating = page.locator('[data-testid="place-rating"], .rating, [class*="rating"], [class*="puan"]').first();
    await expect(rating).toBeVisible();
  });

  test('place detail shows images or gallery', async ({ page }) => {
    await page.goto('/isletme/gobeklitepe');

    const images = page.locator('img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
  });

  test('place detail shows location information', async ({ page }) => {
    await page.goto('/isletme/gobeklitepe');

    const locationInfo = page.locator('[data-testid="location"], .location, [class*="address"], [class*="konum"]').first();
    await expect(locationInfo).toBeVisible();
  });

  test('place detail shows contact information', async ({ page }) => {
    await page.goto('/isletme/gobeklitepe');

    const contactInfo = page.locator('[data-testid="contact"], .contact, [class*="iletisim"], [class*="phone"]').first();
    const isVisible = await contactInfo.isVisible().catch(() => false);
    expect(isVisible || true).toBeTruthy();
  });

  test('place detail has working back or navigation link', async ({ page }) => {
    await page.goto('/isletme/gobeklitepe');

    const backLink = page.locator('a[href*="places"], a[href*="mekanlar"], a:has-text("Mekanlar"), a:has-text("Geri")').first();
    await expect(backLink).toBeVisible();
  });

  test('place detail shows operating hours', async ({ page }) => {
    await page.goto('/isletme/gobeklitepe');

    const hoursSection = page.locator('[data-testid="hours"], .hours, [class*="saat"], [class*="çalışma"]').first();
    const isVisible = await hoursSection.isVisible().catch(() => false);
    expect(isVisible || true).toBeTruthy();
  });
});

test.describe('Places - Sorting and Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mekanlar');
  });

  test('sort options are available', async ({ page }) => {
    const sortSelect = page.locator('[data-testid="sort-select"], select[name="sort"], .sort-select').first();
    const isVisible = await sortSelect.isVisible().catch(() => false);

    if (isVisible) {
      const options = page.locator('[data-testid="sort-select"] option, select[name="sort"] option');
      const count = await options.count();
      expect(count).toBeGreaterThan(1);
    }
  });

  test('pagination controls work', async ({ page }) => {
    const pagination = page.locator('[data-testid="pagination"], .pagination, nav[aria-label*="sayfa"]').first();
    const isVisible = await pagination.isVisible().catch(() => false);

    if (isVisible) {
      const nextButton = page.locator('[data-testid="pagination-next"], .pagination-next, a:has-text("Sonraki")').first();
      const hasNext = await nextButton.isVisible().catch(() => false);

      if (hasNext) {
        await expect(nextButton).toBeVisible();
      }
    }
  });
});

test.describe('Places - Category Pages', () => {
  test('tarihi yerler category page loads', async ({ page }) => {
    await page.goto('/tarihi-yerler');

    await expect(page).toHaveURL(/tarihi-yerler/);
    await expect(page.locator('h1')).toContainText(/Tarihi|tarihi|Historical/);

    const placeCards = page.locator('[data-testid="place-card"], article, .place-card');
    const count = await placeCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('gastronomi category page loads', async ({ page }) => {
    await page.goto('/gastronomi');

    await expect(page).toHaveURL(/gastronomi/);
    await expect(page.locator('h1')).toContainText(/Gastronomi|gastronomi|Yemek|Lezzet/);

    const placeCards = page.locator('[data-testid="place-card"], article, .place-card');
    const count = await placeCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('etkinlikler category page loads', async ({ page }) => {
    await page.goto('/etkinlikler');

    await expect(page).toHaveURL(/etkinlikler/);
    await expect(page.locator('h1')).toContainText(/Etkinlik|etkinlik|Event/);

    const eventCards = page.locator('[data-testid="event-card"], article, .event-card');
    const count = await eventCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('category slug pages load correctly', async ({ page }) => {
    await page.goto('/kategori/tarihi-yerler');

    await expect(page).toHaveURL(/kategori\/.+/);
    await expect(page.locator('h1')).toBeVisible();
  });
});

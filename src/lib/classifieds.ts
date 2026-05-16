import { query, queryOne } from './postgres';
import {
  CLASSIFIED_CATEGORY_TREE,
  CLASSIFIED_CITY,
  CLASSIFIED_DISTRICTS,
  flattenClassifiedCategories,
  isValidClassifiedDistrict,
  type FlatClassifiedCategory,
} from '../data/classified-categories';

export type ClassifiedListing = {
  id: string;
  user_id: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  parent_category_name?: string | null;
  title: string;
  slug: string;
  description: string;
  price: string | number | null;
  currency: string;
  district: string;
  neighborhood: string | null;
  address: string | null;
  city: string;
  phone: string | null;
  images: string[];
  condition: string;
  status: string;
  view_count: number;
  contact_count: number;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  owner_name?: string | null;
  owner_email?: string | null;
  moderation_note?: string | null;
  moderated_by?: string | null;
  moderated_at?: string | null;
};

export type ClassifiedUserSummary = {
  total_count: number;
  active_count: number;
  pending_count: number;
  archived_count: number;
  total_views: number;
  total_contacts: number;
};

export type ClassifiedTrustBenchmark = {
  avg_score: number;
  listing_count: number;
  strong_count: number;
};

type CreateListingInput = {
  categorySlug: string;
  title: string;
  description: string;
  price?: string | number | null;
  district: string;
  neighborhood?: string | null;
  address?: string | null;
  phone?: string | null;
  condition?: string | null;
  images?: string[] | null;
};

type UpdateListingInput = CreateListingInput;

let schemaReady = false;

function slugify(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('i̇', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 180);
}

function normalizeText(value: unknown, max = 1000): string {
  return String(value ?? '').trim().slice(0, max);
}

function normalizePrice(value: unknown): number | null {
  const raw = String(value ?? '').replace(/\./g, '').replace(',', '.').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

function normalizeImages(images: string[] | null | undefined): string[] {
  return (images ?? [])
    .map((image) => image.trim())
    .filter((image) => image.startsWith('/uploads/') || image.startsWith('/images/'))
    .slice(0, 10);
}

export async function ensureClassifiedSchemaAndCategories(): Promise<void> {
  if (schemaReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS classified_categories (
      id SERIAL PRIMARY KEY,
      parent_id INTEGER REFERENCES classified_categories(id) ON DELETE SET NULL,
      name VARCHAR(160) NOT NULL,
      slug VARCHAR(180) NOT NULL UNIQUE,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS classified_listings (
      id TEXT PRIMARY KEY DEFAULT ('cl_' || md5(random()::text || clock_timestamp()::text)),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES classified_categories(id),
      title VARCHAR(180) NOT NULL,
      slug VARCHAR(220) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      price NUMERIC(14,2),
      currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
      district VARCHAR(80) NOT NULL,
      neighborhood VARCHAR(120),
      address TEXT,
      city VARCHAR(80) NOT NULL DEFAULT 'Şanlıurfa',
      phone VARCHAR(30),
      images TEXT[] NOT NULL DEFAULT '{}',
      condition VARCHAR(40) NOT NULL DEFAULT 'belirtilmedi',
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      view_count INTEGER NOT NULL DEFAULT 0,
      contact_count INTEGER NOT NULL DEFAULT 0,
      published_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      moderation_note TEXT,
      moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      moderated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT classified_listings_city_check CHECK (city = 'Şanlıurfa'),
      CONSTRAINT classified_listings_status_check CHECK (status IN ('draft', 'pending', 'active', 'rejected', 'archived', 'expired'))
    );

    CREATE INDEX IF NOT EXISTS idx_classified_categories_parent ON classified_categories(parent_id);
    CREATE INDEX IF NOT EXISTS idx_classified_listings_status ON classified_listings(status);
    CREATE INDEX IF NOT EXISTS idx_classified_listings_category ON classified_listings(category_id);
    CREATE INDEX IF NOT EXISTS idx_classified_listings_district ON classified_listings(district);
    CREATE INDEX IF NOT EXISTS idx_classified_listings_user ON classified_listings(user_id);
    CREATE INDEX IF NOT EXISTS idx_classified_listings_created ON classified_listings(created_at DESC);
  `);

  await query(`
    ALTER TABLE classified_listings
      ADD COLUMN IF NOT EXISTS moderation_note TEXT,
      ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
  `);

  const idBySlug = new Map<string, number>();
  for (const [parentIndex, parent] of CLASSIFIED_CATEGORY_TREE.entries()) {
    const parentRow = await upsertCategory(parent, null, parentIndex);
    idBySlug.set(parent.slug, parentRow.id);
    for (const [childIndex, child] of (parent.children ?? []).entries()) {
      const childRow = await upsertCategory(child, parentRow.id, childIndex);
      idBySlug.set(child.slug, childRow.id);
    }
  }

  schemaReady = true;
}

async function upsertCategory(category: FlatClassifiedCategory | any, parentId: number | null, sortOrder: number) {
  return queryOne<{ id: number }>(
    `
      INSERT INTO classified_categories (name, slug, description, parent_id, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
      RETURNING id
    `,
    [category.name, category.slug, category.description ?? null, parentId, sortOrder],
  ).then((row) => row ?? Promise.reject(new Error(`İlan kategorisi kaydedilemedi: ${category.slug}`)));
}

export function getClassifiedCategoryTree() {
  return CLASSIFIED_CATEGORY_TREE;
}

export function getClassifiedDistricts() {
  return CLASSIFIED_DISTRICTS;
}

export async function getClassifiedCategoryOptions() {
  await ensureClassifiedSchemaAndCategories();
  const rows = await query<{
    id: number;
    name: string;
    slug: string;
    parent_name: string | null;
    parent_slug: string | null;
  }>(`
    SELECT c.id, c.name, c.slug, p.name AS parent_name, p.slug AS parent_slug
    FROM classified_categories c
    LEFT JOIN classified_categories p ON p.id = c.parent_id
    WHERE c.is_active = true
    ORDER BY p.sort_order ASC NULLS FIRST, p.name ASC NULLS FIRST, c.parent_id NULLS FIRST, c.sort_order ASC, c.name ASC
  `);
  return rows.rows;
}

export async function getClassifiedCategoryCounts() {
  await ensureClassifiedSchemaAndCategories();
  const result = await query<{ slug: string; count: number }>(`
    SELECT c.slug, COUNT(l.id)::int AS count
    FROM classified_categories c
    LEFT JOIN classified_listings l ON l.category_id = c.id AND l.status = 'active'
    WHERE c.is_active = true
    GROUP BY c.slug
  `);
  return new Map(result.rows.map((row) => [row.slug, Number(row.count || 0)]));
}

export async function getClassifiedPriceFacetCounts(options: {
  categorySlug?: string | null;
  q?: string | null;
  district?: string | null;
  includePendingForUserId?: string | null;
} = {}) {
  await ensureClassifiedSchemaAndCategories();
  const values: unknown[] = [];
  const where: string[] = ["(l.status = 'active' OR l.user_id::text = $1)"];
  values.push(options.includePendingForUserId ?? '00000000-0000-0000-0000-000000000000');

  if (options.categorySlug) {
    values.push(options.categorySlug);
    where.push('(c.slug = $' + values.length + ' OR pc.slug = $' + values.length + ')');
  }

  if (options.district && isValidClassifiedDistrict(options.district)) {
    values.push(options.district);
    where.push('l.district = $' + values.length);
  }

  const q = normalizeText(options.q, 120);
  if (q) {
    values.push(`%${q}%`);
    where.push('(l.title ILIKE $' + values.length + ' OR l.description ILIKE $' + values.length + ')');
  }

  const result = await query<{
    under_25k: number;
    between_25k_100k: number;
    between_100k_500k: number;
    over_500k: number;
  }>(
    `
      SELECT
        COUNT(*) FILTER (WHERE l.price > 0 AND l.price <= 25000)::int AS under_25k,
        COUNT(*) FILTER (WHERE l.price > 25000 AND l.price <= 100000)::int AS between_25k_100k,
        COUNT(*) FILTER (WHERE l.price > 100000 AND l.price <= 500000)::int AS between_100k_500k,
        COUNT(*) FILTER (WHERE l.price > 500000)::int AS over_500k
      FROM classified_listings l
      JOIN classified_categories c ON c.id = l.category_id
      LEFT JOIN classified_categories pc ON pc.id = c.parent_id
      WHERE ${where.join(' AND ')}
    `,
    values,
  );

  const row = result.rows[0] ?? {
    under_25k: 0,
    between_25k_100k: 0,
    between_100k_500k: 0,
    over_500k: 0,
  };

  return [
    { value: '0-25000', label: '0 - 25.000 TL', count: Number(row.under_25k || 0) },
    { value: '25001-100000', label: '25.001 - 100.000 TL', count: Number(row.between_25k_100k || 0) },
    { value: '100001-500000', label: '100.001 - 500.000 TL', count: Number(row.between_100k_500k || 0) },
    { value: '500001-plus', label: '500.000 TL+', count: Number(row.over_500k || 0) },
  ].filter((item) => item.count > 0);
}

export async function listClassifieds(options: {
  categorySlug?: string | null;
  q?: string | null;
  district?: string | null;
  priceBand?: string | null;
  includePendingForUserId?: string | null;
  limit?: number;
  offset?: number;
} = {}) {
  await ensureClassifiedSchemaAndCategories();
  const limit = Math.min(Math.max(Number(options.limit ?? 24), 1), 60);
  const offset = Math.max(Number(options.offset ?? 0), 0);
  const values: unknown[] = [];
  const where: string[] = ["(l.status = 'active' OR l.user_id::text = $1)"];
  values.push(options.includePendingForUserId ?? '00000000-0000-0000-0000-000000000000');

  if (options.categorySlug) {
    values.push(options.categorySlug);
    where.push('(c.slug = $' + values.length + ' OR pc.slug = $' + values.length + ')');
  }

  if (options.district && isValidClassifiedDistrict(options.district)) {
    values.push(options.district);
    where.push('l.district = $' + values.length);
  }

  if (options.priceBand) {
    if (options.priceBand === '0-25000') {
      where.push('COALESCE(l.price, 0) > 0 AND l.price <= 25000');
    } else if (options.priceBand === '25001-100000') {
      where.push('l.price > 25000 AND l.price <= 100000');
    } else if (options.priceBand === '100001-500000') {
      where.push('l.price > 100000 AND l.price <= 500000');
    } else if (options.priceBand === '500001-plus') {
      where.push('l.price > 500000');
    }
  }

  const q = normalizeText(options.q, 120);
  if (q) {
    values.push(`%${q}%`);
    where.push('(l.title ILIKE $' + values.length + ' OR l.description ILIKE $' + values.length + ')');
  }

  values.push(limit, offset);
  const result = await query<ClassifiedListing>(
    `
      SELECT l.*, c.name AS category_name, c.slug AS category_slug,
        pc.name AS parent_category_name,
        COALESCE(u.full_name, u.name, u.email) AS owner_name,
        u.email AS owner_email
      FROM classified_listings l
      JOIN classified_categories c ON c.id = l.category_id
      LEFT JOIN classified_categories pc ON pc.id = c.parent_id
      LEFT JOIN users u ON u.id = l.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY l.published_at DESC NULLS LAST, l.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values,
  );
  return result.rows;
}

export async function getClassifiedBySlug(slug: string, viewerUserId?: string | null) {
  await ensureClassifiedSchemaAndCategories();
  const result = await queryOne<ClassifiedListing>(
    `
      SELECT l.*, c.name AS category_name, c.slug AS category_slug,
        pc.name AS parent_category_name,
        COALESCE(u.full_name, u.name, u.email) AS owner_name,
        u.email AS owner_email
      FROM classified_listings l
      JOIN classified_categories c ON c.id = l.category_id
      LEFT JOIN classified_categories pc ON pc.id = c.parent_id
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.slug = $1 AND (l.status = 'active' OR l.user_id::text = $2)
      LIMIT 1
    `,
    [slug, viewerUserId ?? '00000000-0000-0000-0000-000000000000'],
  );
  return result;
}

export async function listRelatedClassifieds(
  listing: Pick<ClassifiedListing, 'id' | 'category_slug' | 'district' | 'user_id'>,
  limit = 6,
) {
  await ensureClassifiedSchemaAndCategories();
  const result = await query<ClassifiedListing>(
    `
      SELECT l.*, c.name AS category_name, c.slug AS category_slug,
        pc.name AS parent_category_name,
        COALESCE(u.full_name, u.name, u.email) AS owner_name,
        u.email AS owner_email
      FROM classified_listings l
      JOIN classified_categories c ON c.id = l.category_id
      LEFT JOIN classified_categories pc ON pc.id = c.parent_id
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.id <> $1
        AND l.status = 'active'
        AND (c.slug = $2 OR l.district = $3)
      ORDER BY
        CASE WHEN c.slug = $2 THEN 0 ELSE 1 END,
        CASE WHEN l.district = $3 THEN 0 ELSE 1 END,
        l.published_at DESC NULLS LAST,
        l.created_at DESC
      LIMIT $4
    `,
    [listing.id, listing.category_slug, listing.district, Math.min(Math.max(Number(limit), 1), 12)],
  );
  return result.rows;
}

export async function listDistrictClassifieds(
  listing: Pick<ClassifiedListing, 'id' | 'district'>,
  limit = 6,
) {
  await ensureClassifiedSchemaAndCategories();
  const result = await query<ClassifiedListing>(
    `
      SELECT l.*, c.name AS category_name, c.slug AS category_slug,
        pc.name AS parent_category_name,
        COALESCE(u.full_name, u.name, u.email) AS owner_name,
        u.email AS owner_email
      FROM classified_listings l
      JOIN classified_categories c ON c.id = l.category_id
      LEFT JOIN classified_categories pc ON pc.id = c.parent_id
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.id <> $1
        AND l.status = 'active'
        AND l.district = $2
      ORDER BY l.published_at DESC NULLS LAST, l.created_at DESC
      LIMIT $3
    `,
    [listing.id, listing.district, Math.min(Math.max(Number(limit), 1), 12)],
  );
  return result.rows;
}

export async function listPriceBandClassifieds(
  listing: Pick<ClassifiedListing, 'id' | 'price' | 'district'>,
  limit = 6,
) {
  await ensureClassifiedSchemaAndCategories();
  const priceValue = Number(listing.price || 0);
  if (!Number.isFinite(priceValue) || priceValue <= 0) {
    return [];
  }

  const minPrice = Math.max(priceValue * 0.75, 0);
  const maxPrice = priceValue * 1.25;
  const result = await query<ClassifiedListing>(
    `
      SELECT l.*, c.name AS category_name, c.slug AS category_slug,
        pc.name AS parent_category_name,
        COALESCE(u.full_name, u.name, u.email) AS owner_name,
        u.email AS owner_email
      FROM classified_listings l
      JOIN classified_categories c ON c.id = l.category_id
      LEFT JOIN classified_categories pc ON pc.id = c.parent_id
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.id <> $1
        AND l.status = 'active'
        AND l.price IS NOT NULL
        AND l.price BETWEEN $2 AND $3
        AND l.district = $4
      ORDER BY
        ABS(COALESCE(l.price, 0) - $5) ASC,
        l.published_at DESC NULLS LAST,
        l.created_at DESC
      LIMIT $6
    `,
    [listing.id, minPrice, maxPrice, listing.district, priceValue, Math.min(Math.max(Number(limit), 1), 12)],
  );
  return result.rows;
}

export async function getClassifiedTrustBenchmark(categorySlug: string) {
  await ensureClassifiedSchemaAndCategories();
  const slug = normalizeText(categorySlug, 180);
  if (!slug) {
    return {
      avg_score: 0,
      listing_count: 0,
      strong_count: 0,
    } satisfies ClassifiedTrustBenchmark;
  }

  const result = await query<ClassifiedTrustBenchmark>(
    `
      WITH scored AS (
        SELECT
          (
            CASE WHEN COALESCE(array_length(l.images, 1), 0) > 0 THEN 25 ELSE 0 END +
            CASE WHEN NULLIF(TRIM(COALESCE(l.phone, '')), '') IS NOT NULL THEN 25 ELSE 0 END +
            CASE WHEN NULLIF(TRIM(COALESCE(l.address, '')), '') IS NOT NULL THEN 20 ELSE 0 END +
            CASE WHEN NULLIF(TRIM(COALESCE(u.full_name, u.name, u.email, '')), '') IS NOT NULL THEN 15 ELSE 0 END +
            CASE WHEN COALESCE(l.contact_count, 0) > 0 THEN 15 ELSE 0 END
          )::numeric AS trust_score
        FROM classified_listings l
        JOIN classified_categories c ON c.id = l.category_id
        LEFT JOIN classified_categories pc ON pc.id = c.parent_id
        LEFT JOIN users u ON u.id = l.user_id
        WHERE l.status = 'active'
          AND (c.slug = $1 OR pc.slug = $1)
      )
      SELECT
        COALESCE(ROUND(AVG(trust_score)), 0)::int AS avg_score,
        COUNT(*)::int AS listing_count,
        COUNT(*) FILTER (WHERE trust_score >= 80)::int AS strong_count
      FROM scored
    `,
    [slug],
  );

  return (
    result.rows[0] ?? {
      avg_score: 0,
      listing_count: 0,
      strong_count: 0,
    }
  );
}

export async function incrementClassifiedView(id: string) {
  await query('UPDATE classified_listings SET view_count = view_count + 1 WHERE id = $1', [id]).catch(() => null);
}

export async function incrementClassifiedContact(id: string, viewerUserId: string) {
  await ensureClassifiedSchemaAndCategories();
  await query(
    `
      UPDATE classified_listings
      SET contact_count = contact_count + 1
      WHERE id = $1 AND status = 'active' AND user_id::text <> $2
    `,
    [id, viewerUserId],
  ).catch(() => null);
}

export async function listUserClassifieds(userId: string) {
  await ensureClassifiedSchemaAndCategories();
  const result = await query<ClassifiedListing>(
    `
      SELECT l.*, c.name AS category_name, c.slug AS category_slug,
        pc.name AS parent_category_name,
        COALESCE(u.full_name, u.name, u.email) AS owner_name,
        u.email AS owner_email
      FROM classified_listings l
      JOIN classified_categories c ON c.id = l.category_id
      LEFT JOIN classified_categories pc ON pc.id = c.parent_id
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.user_id::text = $1
      ORDER BY l.created_at DESC
    `,
    [userId],
  );
  return result.rows;
}

export async function getUserClassifiedSummary(userId: string) {
  await ensureClassifiedSchemaAndCategories();
  const row = await queryOne<ClassifiedUserSummary>(
    `
      SELECT
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'archived')::int AS archived_count,
        COALESCE(SUM(view_count), 0)::int AS total_views,
        COALESCE(SUM(contact_count), 0)::int AS total_contacts
      FROM classified_listings
      WHERE user_id::text = $1
    `,
    [userId],
  );
  return row ?? {
    total_count: 0,
    active_count: 0,
    pending_count: 0,
    archived_count: 0,
    total_views: 0,
    total_contacts: 0,
  };
}

export async function archiveUserClassified(userId: string, listingId: string) {
  await ensureClassifiedSchemaAndCategories();
  const row = await queryOne<ClassifiedListing>(
    `
      UPDATE classified_listings
      SET status = 'archived', updated_at = NOW()
      WHERE id = $1 AND user_id::text = $2 AND status IN ('draft', 'pending', 'active', 'rejected', 'expired')
      RETURNING *
    `,
    [listingId, userId],
  );
  if (!row) throw new Error('İlan bulunamadı veya arşivlenemedi.');
  return row;
}

export async function touchUserClassifiedForReview(userId: string, listingId: string) {
  await ensureClassifiedSchemaAndCategories();
  const row = await queryOne<ClassifiedListing>(
    `
      UPDATE classified_listings
      SET status = 'pending',
        moderation_note = NULL,
        moderated_by = NULL,
        moderated_at = NULL,
        updated_at = NOW()
      WHERE id = $1 AND user_id::text = $2 AND status IN ('rejected', 'archived', 'expired')
      RETURNING *
    `,
    [listingId, userId],
  );
  if (!row) throw new Error('İlan tekrar incelemeye gönderilemedi.');
  return row;
}

export async function getUserClassifiedById(userId: string, listingId: string) {
  await ensureClassifiedSchemaAndCategories();
  const row = await queryOne<ClassifiedListing>(
    `
      SELECT l.*, c.name AS category_name, c.slug AS category_slug,
        pc.name AS parent_category_name,
        COALESCE(u.full_name, u.name, u.email) AS owner_name,
        u.email AS owner_email
      FROM classified_listings l
      JOIN classified_categories c ON c.id = l.category_id
      LEFT JOIN classified_categories pc ON pc.id = c.parent_id
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.id = $1 AND l.user_id::text = $2
      LIMIT 1
    `,
    [listingId, userId],
  );
  return row;
}

export async function updateUserClassified(userId: string, listingId: string, input: UpdateListingInput) {
  await ensureClassifiedSchemaAndCategories();
  const title = normalizeText(input.title, 180);
  const description = normalizeText(input.description, 6000);
  const district = normalizeText(input.district, 80);
  const categorySlug = normalizeText(input.categorySlug, 180);

  if (title.length < 8) throw new Error('İlan başlığı en az 8 karakter olmalı.');
  if (description.length < 30) throw new Error('İlan açıklaması en az 30 karakter olmalı.');
  if (!isValidClassifiedDistrict(district)) throw new Error('İlan sadece Şanlıurfa ilçeleri için eklenebilir.');

  const category = await queryOne<{ id: number }>(
    'SELECT id FROM classified_categories WHERE slug = $1 AND parent_id IS NOT NULL AND is_active = true',
    [categorySlug],
  );
  if (!category) throw new Error('Geçerli bir alt kategori seçilmelidir.');

  const existing = await getUserClassifiedById(userId, listingId);
  if (!existing) throw new Error('İlan bulunamadı.');
  if (existing.status === 'archived') throw new Error('Arşivlenmiş ilan düzenlenemez. Önce tekrar incelemeye gönderin.');

  const images = normalizeImages(input.images);
  const condition = normalizeText(input.condition || 'belirtilmedi', 40) || 'belirtilmedi';
  const row = await queryOne<ClassifiedListing>(
    `
      UPDATE classified_listings
      SET category_id = $1,
        title = $2,
        description = $3,
        price = $4,
        district = $5,
        neighborhood = $6,
        address = $7,
        city = $8,
        phone = $9,
        images = $10,
        condition = $11,
        status = 'pending',
        moderation_note = NULL,
        moderated_by = NULL,
        moderated_at = NULL,
        published_at = CASE WHEN status = 'active' THEN NULL ELSE published_at END,
        updated_at = NOW()
      WHERE id = $12 AND user_id::text = $13
      RETURNING *
    `,
    [
      category.id,
      title,
      description,
      normalizePrice(input.price),
      district,
      normalizeText(input.neighborhood, 120) || null,
      normalizeText(input.address, 600) || null,
      CLASSIFIED_CITY,
      normalizeText(input.phone, 30) || null,
      images,
      condition,
      listingId,
      userId,
    ],
  );
  if (!row) throw new Error('İlan güncellenemedi.');
  return row;
}

export async function createClassifiedListing(userId: string, input: CreateListingInput) {
  await ensureClassifiedSchemaAndCategories();
  const title = normalizeText(input.title, 180);
  const description = normalizeText(input.description, 6000);
  const district = normalizeText(input.district, 80);
  const categorySlug = normalizeText(input.categorySlug, 180);

  if (title.length < 8) throw new Error('İlan başlığı en az 8 karakter olmalı.');
  if (description.length < 30) throw new Error('İlan açıklaması en az 30 karakter olmalı.');
  if (!isValidClassifiedDistrict(district)) throw new Error('İlan sadece Şanlıurfa ilçeleri için eklenebilir.');

  const category = await queryOne<{ id: number }>(
    'SELECT id FROM classified_categories WHERE slug = $1 AND parent_id IS NOT NULL AND is_active = true',
    [categorySlug],
  );
  if (!category) throw new Error('Geçerli bir alt kategori seçilmelidir.');

  const baseSlug = slugify(title) || 'ilan';
  const slug = `${baseSlug}-${Date.now().toString(36)}`;
  const price = normalizePrice(input.price);
  const images = normalizeImages(input.images);
  const condition = normalizeText(input.condition || 'belirtilmedi', 40) || 'belirtilmedi';

  const row = await queryOne<ClassifiedListing>(
    `
      INSERT INTO classified_listings (
        user_id, category_id, title, slug, description, price, currency, district,
        neighborhood, address, city, phone, images, condition, status, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'TRY', $7, $8, $9, $10, $11, $12, $13, 'pending', NOW() + INTERVAL '90 days')
      RETURNING *
    `,
    [
      userId,
      category.id,
      title,
      slug,
      description,
      price,
      district,
      normalizeText(input.neighborhood, 120) || null,
      normalizeText(input.address, 600) || null,
      CLASSIFIED_CITY,
      normalizeText(input.phone, 30) || null,
      images,
      condition,
    ],
  );

  if (!row) throw new Error('İlan kaydedilemedi.');
  return row;
}

export function getFlatClassifiedCategories() {
  return flattenClassifiedCategories();
}

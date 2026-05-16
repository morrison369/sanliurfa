import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';

type CommandResult = {
  type: string;
  label: string;
  description: string;
  href: string;
  adminHref: string;
};

async function searchSafe(sql: string, params: unknown[], mapper: (row: any) => CommandResult): Promise<CommandResult[]> {
  try {
    const result = await query(sql, params);
    return result.rows.map(mapper);
  } catch {
    return [];
  }
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user || !locals.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
  }

  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return new Response(JSON.stringify({ success: true, results: [] }), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  const like = `%${q}%`;

  const groups = await Promise.all([
    searchSafe(
      `SELECT id, name, slug, category, status FROM places
       WHERE name ILIKE $1 OR slug ILIKE $1 OR category ILIKE $1
       ORDER BY updated_at DESC NULLS LAST LIMIT 8`,
      [like],
      (row) => ({
        type: 'İşletme',
        label: row.name || row.slug,
        description: [row.category, row.status].filter(Boolean).join(' · ') || 'Mekan kaydı',
        href: row.slug ? `/isletme/${row.slug}` : '/admin/businesses',
        adminHref: row.id ? `/admin/places/edit/${row.id}` : '/admin/businesses',
      }),
    ),
    searchSafe(
      `SELECT id, email, full_name, role FROM users
       WHERE email ILIKE $1 OR full_name ILIKE $1
       ORDER BY created_at DESC LIMIT 6`,
      [like],
      (row) => ({
        type: 'Kullanıcı',
        label: row.full_name || row.email,
        description: row.role || 'Üye',
        href: '/admin/community/users',
        adminHref: '/admin/community/users',
      }),
    ),
    searchSafe(
      `SELECT id, name, slug, is_active FROM categories
       WHERE name ILIKE $1 OR slug ILIKE $1
       ORDER BY name LIMIT 6`,
      [like],
      (row) => ({
        type: 'Kategori',
        label: row.name || row.slug,
        description: row.is_active === false ? 'Pasif kategori' : 'Aktif kategori',
        href: row.slug ? `/mekanlar/${row.slug}` : '/admin/categories',
        adminHref: '/admin/categories',
      }),
    ),
    searchSafe(
      `SELECT id, title, slug, status FROM events
       WHERE title ILIKE $1 OR slug ILIKE $1
       ORDER BY start_date DESC NULLS LAST LIMIT 6`,
      [like],
      (row) => ({
        type: 'Etkinlik',
        label: row.title || row.slug,
        description: row.status || 'Etkinlik',
        href: row.slug ? `/etkinlikler/${row.slug}` : '/admin/events',
        adminHref: row.id ? `/admin/events/edit/${row.id}` : '/admin/events',
      }),
    ),
    searchSafe(
      `SELECT id, title, slug, status FROM blog_posts
       WHERE title ILIKE $1 OR slug ILIKE $1
       ORDER BY updated_at DESC NULLS LAST LIMIT 6`,
      [like],
      (row) => ({
        type: 'Blog',
        label: row.title || row.slug,
        description: row.status || 'Blog yazısı',
        href: row.slug ? `/blog/${row.slug}` : '/admin/blog',
        adminHref: row.id ? `/admin/blog/edit/${row.id}` : '/admin/blog',
      }),
    ),
    searchSafe(
      `SELECT id, name, slug FROM districts
       WHERE name ILIKE $1 OR slug ILIKE $1
       ORDER BY name LIMIT 6`,
      [like],
      (row) => ({
        type: 'İlçe',
        label: row.name || row.slug,
        description: 'Şanlıurfa ilçe sayfası',
        href: row.slug ? `/ilceler/${row.slug}` : '/admin/locations/districts',
        adminHref: '/admin/locations/districts',
      }),
    ),
    searchSafe(
      `SELECT id, name, address, phone FROM pharmacies
       WHERE name ILIKE $1 OR address ILIKE $1 OR phone ILIKE $1
       ORDER BY updated_at DESC NULLS LAST LIMIT 6`,
      [like],
      (row) => ({
        type: 'Eczane',
        label: row.name,
        description: row.address || row.phone || 'Eczane kaydı',
        href: '/saglik/nobetci-eczaneler',
        adminHref: '/admin/pharmacies',
      }),
    ),
    searchSafe(
      `SELECT id, title, status FROM advertisements
       WHERE title ILIKE $1
       ORDER BY updated_at DESC NULLS LAST LIMIT 6`,
      [like],
      (row) => ({
        type: 'Reklam',
        label: row.title || row.id,
        description: row.status || 'Reklam alanı',
        href: '/admin/ads',
        adminHref: '/admin/ads',
      }),
    ),
    searchSafe(
      `SELECT
         pc.id,
         COALESCE(p.name, pc.contact_name, pc.contact_email, 'İşletme başvurusu') AS business_name,
         pc.status,
         pc.contact_email
       FROM place_claims pc
       LEFT JOIN places p ON p.id = pc.place_id
       WHERE p.name ILIKE $1 OR pc.contact_name ILIKE $1 OR pc.contact_email ILIKE $1
       ORDER BY pc.created_at DESC LIMIT 6`,
      [like],
      (row) => ({
        type: 'Başvuru',
        label: row.business_name || row.contact_email || row.id,
        description: row.status || 'İşletme başvurusu',
        href: '/admin/submissions',
        adminHref: '/admin/submissions',
      }),
    ),
  ]);

  const results = groups.flat().slice(0, 30);
  return new Response(JSON.stringify({ success: true, results }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};

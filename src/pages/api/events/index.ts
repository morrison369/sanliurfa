import type { APIRoute } from 'astro';
import { getCuratedEvents, searchCuratedEvents } from '../../../data/curated-events';
import { query, queryOne } from '../../../lib/postgres';

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Content-Language': 'tr',
};

const toPositiveInt = (value: string | null, fallback: number, max: number) => {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
};

const normalizeEvent = (event: any) => ({
  id: event.id,
  slug: event.slug,
  title: event.title || event.name,
  description: event.description || '',
  category: event.category || 'diger',
  location: event.location || 'Şanlıurfa',
  image_url: event.image_url || event.image || '/images/placeholder-event.jpg',
  start_date: event.start_date || event.date || event.created_at,
  end_date: event.end_date || null,
  start_time: event.start_time || null,
  is_featured: Boolean(event.is_featured),
  status: event.status || 'published',
  creator_name: event.creator_name || event.organizer || 'sanliurfa.com editörleri',
});

export const GET: APIRoute = async ({ url }) => {
  const queryText = url.searchParams.get('q') || url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';
  const limit = toPositiveInt(url.searchParams.get('limit'), 20, 100);
  const offset = Math.max(Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

  let events: any[] = [];
  let total = 0;

  try {
    const values: any[] = [];
    let where = "WHERE status IN ('published', 'active')";

    if (queryText.trim()) {
      values.push(`%${queryText.trim()}%`);
      where += ` AND (title ILIKE $${values.length} OR description ILIKE $${values.length} OR location ILIKE $${values.length})`;
    }

    if (category) {
      values.push(category);
      where += ` AND category = $${values.length}`;
    }

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM events ${where}`,
      values,
    );
    total = Number.parseInt(countResult?.count || '0', 10) || 0;

    const dataResult = await query(
      `SELECT *
       FROM events
       ${where}
       ORDER BY is_featured DESC, start_date ASC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    events = dataResult.rows.map(normalizeEvent);
  } catch {
    events = [];
    total = 0;
  }

  if (events.length === 0) {
    const curated = queryText.trim() ? searchCuratedEvents(queryText) : getCuratedEvents();
    const filtered = category ? curated.filter((event) => event.category === category) : curated;
    total = filtered.length;
    events = filtered.slice(offset, offset + limit).map(normalizeEvent);
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        events,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    }),
    { status: 200, headers: jsonHeaders },
  );
};

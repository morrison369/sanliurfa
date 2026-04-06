// API: Mekan listesi (PostgreSQL)
import type { APIRoute } from 'astro';
import { query, insert } from '../../../lib/postgres';

export const GET: APIRoute = async ({ url }) => {
  try {
    const params = url.searchParams;
    const category = params.get('category');
    const search = params.get('search');
    const limit = parseInt(params.get('limit') || '20');
    const offset = parseInt(params.get('offset') || '0');
    const featured = params.get('featured') === 'true';

    let sql = 'SELECT * FROM places WHERE status = $1';
    let countSql = 'SELECT COUNT(*) FROM places WHERE status = $1';
    const values: any[] = ['active'];
    let paramIndex = 2;

    if (category) {
      sql += ` AND category = $${paramIndex}`;
      countSql += ` AND category = $${paramIndex}`;
      values.push(category);
      paramIndex++;
    }

    if (featured) {
      sql += ` AND is_featured = true`;
      countSql += ` AND is_featured = true`;
    }

    if (search) {
      sql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR tags::text ILIKE $${paramIndex})`;
      countSql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR tags::text ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY rating DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      query(sql, values),
      query(countSql, values.slice(0, paramIndex - 1)),
    ]);

    const count = parseInt(countResult.rows[0]?.count || '0');

    return new Response(
      JSON.stringify({ 
        data: dataResult.rows, 
        count,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < count
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Places fetch error:', err);
    return new Response(
      JSON.stringify({ error: 'Mekanlar getirilirken bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Create new place
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    
    // Check authentication
    if (!locals.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await insert('places', {
      ...body,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ data, message: 'Mekan başarıyla eklendi' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Place create error:', err);
    return new Response(
      JSON.stringify({ error: 'Mekan eklenirken bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

import type { APIRoute } from 'astro';
import { query, insert } from '../../../lib/postgres';

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const result = await query(
    `SELECT r.*, p.name as place_name, p.images as place_images 
     FROM reservations r 
     JOIN places p ON r.place_id = p.id 
     WHERE r.user_id = $1 
     ORDER BY r.created_at DESC`,
    [user.id]
  );

  return new Response(JSON.stringify({ data: result.rows }), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await request.json();
  const { place_id, date, time, guests, notes } = body;

  const result = await insert('reservations', {
    place_id,
    user_id: user.id,
    date,
    time,
    guests,
    notes,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ data: result }), { status: 201 });
};

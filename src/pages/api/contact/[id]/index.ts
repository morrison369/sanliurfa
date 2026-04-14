import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { authenticateUser } from '../../../../lib/auth/middleware';

export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = context.params;

    const result = await query(
      `SELECT t.*, p.name as place_name
       FROM support_tickets t
       LEFT JOIN places p ON t.place_id = p.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Ticket not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const responses = await query(
      `SELECT r.*, u.name as responder_name
       FROM ticket_responses r
       LEFT JOIN users u ON r.responder_id = u.id
       WHERE r.ticket_id = $1
       ORDER BY r.created_at ASC`,
      [id]
    );

    return new Response(JSON.stringify({
      success: true,
      ticket: result.rows[0],
      responses: responses.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get ticket error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = context.params;
    const body = await context.request.json();

    const result = await query(
      `UPDATE support_tickets 
       SET status = $1, updated_at = NOW(), assigned_to = $2
       WHERE id = $3
       RETURNING *`,
      [body.status, auth.user.id, id]
    );

    return new Response(JSON.stringify({
      success: true,
      ticket: result.rows[0]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update ticket error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = context.params;
    const body = await context.request.json();

    await query(
      `INSERT INTO ticket_responses (ticket_id, responder_id, message)
       VALUES ($1, $2, $3)`,
      [id, auth.user.id, body.message]
    );

    if (body.status) {
      await query(
        `UPDATE support_tickets 
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [body.status, id]
      );
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Reply added'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Add reply error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

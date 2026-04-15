import type { APIRoute } from 'astro';
import { query } from '../../lib/postgres';
import { sendEmail } from '../../lib/email';
import { logger } from '../../lib/logging';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const { name, email, subject, message, type = 'general', placeId } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        fields: ['name', 'email', 'subject', 'message']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create ticket
    const result = await query(
      `INSERT INTO support_tickets (
        name, email, subject, message, type, place_id, status, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, 'open', 'medium')
      RETURNING id, ticket_number`,
      [name, email, subject, message, type, placeId || null]
    );

    const ticket = result.rows[0];

    // Notify admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sanliurfa.com';
    await sendEmail({
      to: adminEmail,
      subject: `[Destek] ${subject} - #${ticket.ticket_number}`,
      html: `<p>Yeni destek talebi:</p>
<ul>
  <li><strong>Ad Soyad:</strong> ${name}</li>
  <li><strong>E-posta:</strong> ${email}</li>
  <li><strong>Konu:</strong> ${subject}</li>
  <li><strong>Mesaj:</strong> ${message}</li>
  <li><strong>Talep No:</strong> #${ticket.ticket_number}</li>
</ul>`,
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Mesajınız başarıyla gönderildi',
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticket_number
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Contact form error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// List tickets (admin only)
export const GET: APIRoute = async (context) => {
  try {
    const auth = await context.locals.auth?.();
    if (!auth?.user?.role === 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(context.request.url);
    const status = url.searchParams.get('status') || 'open';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM support_tickets 
       WHERE status = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM support_tickets WHERE status = $1',
      [status]
    );

    return new Response(JSON.stringify({
      success: true,
      tickets: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('List tickets error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

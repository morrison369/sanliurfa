import { sendEmail } from '../email';
import { logger } from '../logging';
import { query } from '../postgres';

export interface ContactSubmissionInput {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  type?: string | null;
  placeId?: string | null;
}

export interface ContactSubmissionResult {
  success: true;
  message: string;
  ticket: {
    id: string;
    ticketNumber: string | null;
  };
}

const CONTACT_TYPES = new Set([
  'general',
  'business_inquiry',
  'technical_support',
  'complaint',
  'suggestion',
  'partnership',
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function submitContactRequest(
  input: ContactSubmissionInput,
): Promise<ContactSubmissionResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const subject = input.subject.trim();
  const message = input.message.trim();
  const type = CONTACT_TYPES.has(input.type || '') ? input.type || 'general' : 'general';

  if (!name || !email || !subject || !message) {
    throw new Error('Zorunlu alanlar eksik.');
  }

  const result = await query(
    `INSERT INTO support_tickets (
      name, email, phone, subject, message, type, place_id, status, priority
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', 'medium')
    RETURNING id, ticket_number`,
    [
      name,
      email,
      input.phone?.trim() || null,
      subject,
      message,
      type,
      input.placeId || null,
    ],
  );

  const ticket = result.rows[0];
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sanliurfa.com';

  const mailResult = await sendEmail({
    to: adminEmail,
    subject: `[Destek] ${subject} - #${ticket.ticket_number || ticket.id}`,
    html: `<p>Yeni destek talebi:</p>
<ul>
  <li><strong>Ad Soyad:</strong> ${escapeHtml(name)}</li>
  <li><strong>E-posta:</strong> ${escapeHtml(email)}</li>
  <li><strong>Telefon:</strong> ${escapeHtml(input.phone?.trim() || '-')}</li>
  <li><strong>Konu:</strong> ${escapeHtml(subject)}</li>
  <li><strong>Mesaj:</strong> ${escapeHtml(message)}</li>
  <li><strong>Talep No:</strong> #${escapeHtml(ticket.ticket_number || ticket.id)}</li>
</ul>`,
  });

  if (!mailResult.success) {
    logger.warn('Contact admin notification email failed', { ticketId: ticket.id, adminEmail, error: mailResult.error });
  }

  logger.info('Contact request submitted', { ticketId: ticket.id, email, type, mailTier: mailResult.tier });

  return {
    success: true,
    message: 'Mesajınız başarıyla gönderildi.',
    ticket: {
      id: ticket.id,
      ticketNumber: ticket.ticket_number || null,
    },
  };
}

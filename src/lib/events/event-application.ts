/**
 * Üye-tarafından etkinlik öneri akışı.
 *
 * Pattern: place-application.ts ile aynı (idempotent, transaction).
 * event_submissions tablosuna yazar — admin onay sonrası events'e kopyalanır.
 */
import { logger } from '../logging';
import { query } from '../postgres';

export interface EventApplicationInput {
  title: string;
  description: string;
  category?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startDate: string; // ISO datetime
  endDate?: string | null;
  imageUrl?: string | null;
  organizerName: string;
  organizerEmail: string;
  organizerPhone?: string | null;
  contactUrl?: string | null;
  ticketUrl?: string | null;
  isFree?: boolean;
  /** authenticated submitter (locals.user.id) */
  authenticatedUserId?: string | null;
}

export interface EventApplicationResult {
  success: true;
  message: string;
  submission: {
    id: string;
    status: 'pending';
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits || null;
}

function parseDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function submitEventApplication(
  input: EventApplicationInput,
): Promise<EventApplicationResult> {
  const title = input.title.trim();
  const description = input.description.trim();
  const organizerName = input.organizerName.trim();
  const organizerEmail = input.organizerEmail.trim().toLowerCase();
  const phone = normalizePhone(input.organizerPhone);
  const startDate = parseDate(input.startDate);
  const endDate = input.endDate ? parseDate(input.endDate) : null;

  if (!title || title.length < 4) throw new Error('Etkinlik başlığı en az 4 karakter olmalı.');
  if (!description || description.length < 50) throw new Error('Açıklama en az 50 karakter olmalı.');
  if (!organizerName || organizerName.length < 2) throw new Error('Organizatör adı en az 2 karakter olmalı.');
  if (!isValidEmail(organizerEmail)) throw new Error('Geçersiz organizatör e-posta adresi.');
  if (!startDate) throw new Error('Başlangıç tarihi geçersiz.');
  if (startDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) throw new Error('Geçmiş tarih için etkinlik eklenemez.');
  if (endDate && endDate.getTime() < startDate.getTime()) throw new Error('Bitiş tarihi başlangıçtan önce olamaz.');

  const result = await query(
    `INSERT INTO event_submissions (
      user_id, title, description, category, location, latitude, longitude,
      start_date, end_date, image_url,
      organizer_name, organizer_email, organizer_phone, contact_url, ticket_url, is_free,
      status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending', NOW(), NOW())
    RETURNING id`,
    [
      input.authenticatedUserId || null,
      title,
      description,
      input.category?.trim() || null,
      input.location?.trim() || null,
      input.latitude ?? null,
      input.longitude ?? null,
      startDate.toISOString(),
      endDate ? endDate.toISOString() : null,
      input.imageUrl?.trim() || null,
      organizerName,
      organizerEmail,
      phone,
      input.contactUrl?.trim() || null,
      input.ticketUrl?.trim() || null,
      input.isFree !== false,
    ],
  );

  const submissionId = result.rows[0].id;

  logger.info('Event submission received', {
    submissionId,
    organizerEmail,
    title,
  });

  return {
    success: true,
    message: 'Etkinlik öneriniz alındı. Admin onayı sonrası takvimde yayınlanacaktır.',
    submission: { id: submissionId, status: 'pending' },
  };
}

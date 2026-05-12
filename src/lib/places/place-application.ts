import bcrypt from 'bcryptjs';

import { logger } from '../logging';
import { query, transaction } from '../postgres';
import { notifyPlaceSubmissionReceived } from '../email/submission-notifications';

export interface PlaceApplicationInput {
  name: string;
  categoryId?: string | number | null;
  category?: string | null;
  districtId?: string | number | null;
  shortDescription?: string | null;
  address: string;
  phone: string;
  website?: string | null;
  ownerName: string;
  ownerEmail: string;
  priceRange?: string | null;
  acceptsReservations?: boolean | string | null;
  /** When the applicant is already authenticated, skip provisional account creation. */
  authenticatedUserId?: string | null;
}

export interface PlaceApplicationResult {
  success: true;
  message: string;
  place: {
    id: string;
    slug: string;
    status: 'pending';
  };
}

function createSlug(name: string): string {
  const trMap: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
    Ç: 'c',
    Ğ: 'g',
    İ: 'i',
    Ö: 'o',
    Ş: 's',
    Ü: 'u',
  };

  return name
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, char => trMap[char] || char)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function normalizeBoolean(value?: boolean | string | null): boolean {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

export async function submitPlaceApplication(
  input: PlaceApplicationInput,
): Promise<PlaceApplicationResult> {
  const name = input.name.trim();
  const ownerName = input.ownerName.trim();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const address = input.address.trim();
  const phone = normalizePhone(input.phone);
  const categoryId = input.categoryId ? Number(input.categoryId) : null;
  const category = input.category?.trim() || 'diger';
  const normalizedShortDescription = input.shortDescription?.trim() || null;
  const normalizedDescription =
    normalizedShortDescription || `${name} icin Sanliurfa.com uzerinden yapilan isletme basvurusu.`;

  if (!name || !address || !phone || !ownerName || !ownerEmail || (!categoryId && !category)) {
    throw new Error('Zorunlu alanlar eksik.');
  }

  if (Number.isNaN(categoryId)) {
    throw new Error('Kategori bilgisi geçersiz.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    throw new Error('Geçersiz e-posta adresi.');
  }

  if (!/^[0-9]{10,11}$/.test(phone)) {
    throw new Error('Geçersiz telefon numarası.');
  }

  const baseSlug = createSlug(name) || `isletme-${Date.now().toString(36)}`;
  const slugCheck = await query('SELECT id FROM places WHERE slug = $1', [baseSlug]);
  const finalSlug =
    slugCheck.rows.length > 0 ? `${baseSlug}-${Date.now().toString(36).slice(-4)}` : baseSlug;

  const result = await transaction(async client => {
    let userId: string;

    if (input.authenticatedUserId) {
      // Already authenticated — promote to vendor role without creating a new account.
      userId = input.authenticatedUserId;
      await client.query("UPDATE users SET role = 'vendor', updated_at = NOW() WHERE id = $1 AND role NOT IN ('admin', 'vendor')", [userId]);
    } else {
      const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [ownerEmail]);
      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        await client.query("UPDATE users SET role = 'vendor', updated_at = NOW() WHERE id = $1", [
          userId,
        ]);
      } else {
        const provisionalPasswordHash = await bcrypt.hash(
          `vendor-${ownerEmail}-${Date.now()}`,
          10,
        );
        const newUser = await client.query(
          `INSERT INTO users (full_name, name, email, password_hash, role, status, email_verified)
           VALUES ($1, $1, $2, $3, 'vendor', 'active', false)
           RETURNING id`,
          [ownerName, ownerEmail, provisionalPasswordHash],
        );
        userId = newUser.rows[0].id;
      }
    }

    const placeResult = await client.query(
      `INSERT INTO places (
        name, slug, category, category_id, description, short_description, address, phone, website,
        district_id, owner_id, status, price_range, accepts_reservations,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13, NOW(), NOW())
      RETURNING id, slug`,
      [
        name,
        finalSlug,
        category,
        categoryId,
        normalizedDescription,
        normalizedShortDescription,
        address,
        phone,
        input.website?.trim() || null,
        input.districtId || null,
        userId,
        input.priceRange || null,
        normalizeBoolean(input.acceptsReservations),
      ],
    );

    const placeId = placeResult.rows[0].id;
    await client.query(
      `INSERT INTO support_tickets (user_id, title, description, category, status, priority)
       VALUES ($1, $2, $3, $4, 'open', 'high')`,
      [
        userId,
        'Yeni İşletme Başvurusu',
        `${name} isimli işletme başvurusu yapıldı. İletişim: ${ownerEmail}. Place ID: ${placeId}. Onay bekliyor.`,
        'business_inquiry',
      ],
    );

    return placeResult.rows[0];
  });

  logger.info('Place application submitted', {
    placeId: result.id,
    ownerEmail,
  });

  // Fire-and-forget email notification
  notifyPlaceSubmissionReceived(ownerEmail, ownerName, name).catch(() => null);

  return {
    success: true,
    message: 'Başvurunuz alındı. En kısa sürede değerlendirilecek.',
    place: {
      id: result.id,
      slug: result.slug,
      status: 'pending',
    },
  };
}

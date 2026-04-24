import { buildSlugImagePath } from '../content-images';
import { insert, remove, update } from '../postgres';

export interface EventAdminInput {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate?: string | null;
  category: string;
  image?: string | null;
  isFeatured?: boolean | string | null;
  status?: string | null;
  userId?: string | null;
}

function createSlug(title: string): string {
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

  return title
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, char => trMap[char] || char)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 100);
}

function normalizeBoolean(value?: boolean | string | null): boolean {
  return value === true || value === 'on' || value === 'true' || value === '1';
}

function normalizeStatus(status?: string | null): string {
  return ['draft', 'published', 'cancelled'].includes(status || '') ? String(status) : 'draft';
}

function normalizeEventInput(input: EventAdminInput) {
  const title = input.title.trim();
  const description = input.description.trim();
  const location = input.location.trim();
  const startDate = input.startDate.trim();
  const category = input.category.trim();

  if (!title || !description || !location || !startDate || !category) {
    throw new Error('Başlık, açıklama, konum, tarih ve kategori zorunludur.');
  }

  const slug = createSlug(title);
  const image = input.image?.trim() || buildSlugImagePath('etkinlikler', slug) || null;

  return {
    title,
    slug,
    description,
    location,
    start_date: startDate,
    end_date: input.endDate?.trim() || null,
    category,
    image_url: image,
    is_featured: normalizeBoolean(input.isFeatured),
    status: normalizeStatus(input.status),
  };
}

export async function createAdminEvent(input: EventAdminInput) {
  const normalized = normalizeEventInput(input);

  await insert('events', {
    ...normalized,
    created_by: input.userId || null,
  });

  return {
    success: true,
    message: 'Etkinlik oluşturuldu.',
  };
}

export async function updateAdminEvent(id: string, input: EventAdminInput) {
  if (!id) {
    throw new Error('Etkinlik bilgisi eksik.');
  }

  await update('events', id, normalizeEventInput(input));

  return {
    success: true,
    message: 'Etkinlik güncellendi.',
  };
}

export async function deleteAdminEvent(id: string) {
  if (!id) {
    throw new Error('Etkinlik bilgisi eksik.');
  }

  await remove('events', id);

  return {
    success: true,
    message: 'Etkinlik silindi.',
  };
}

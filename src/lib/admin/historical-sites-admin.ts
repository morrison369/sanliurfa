import { buildSlugImagePath } from '../content-images';
import { insert, remove, update } from '../postgres';

export interface HistoricalSiteAdminInput {
  name: string;
  description: string;
  shortDescription?: string | null;
  location: string;
  period?: string | null;
  entryFee?: string | null;
  openingHours?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  images?: string | string[] | null;
  isUnesco?: boolean | string | null;
  isFeatured?: boolean | string | null;
  status?: string | null;
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
    .slice(0, 100);
}

function normalizeBoolean(value?: boolean | string | null): boolean {
  return value === true || value === 'on' || value === 'true' || value === '1';
}

function normalizeStatus(status?: string | null): string {
  return ['draft', 'active', 'inactive'].includes(status || '') ? String(status) : 'draft';
}

function normalizeNumber(value?: string | number | null): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeImages(images: HistoricalSiteAdminInput['images'], slug: string): string[] {
  const list = Array.isArray(images)
    ? images
    : String(images || '')
        .split(',')
        .map(item => item.trim());

  const normalized = list.filter(Boolean);
  return normalized.length > 0
    ? normalized
    : [buildSlugImagePath('tarihi-yerler', slug) || '/images/placeholder-historical.jpg'];
}

function normalizeHistoricalSiteInput(input: HistoricalSiteAdminInput) {
  const name = input.name.trim();
  const description = input.description.trim();
  const location = input.location.trim();

  if (!name || !description || !location) {
    throw new Error('İsim, açıklama ve konum zorunludur.');
  }

  const slug = createSlug(name);

  return {
    name,
    slug,
    description,
    short_description: input.shortDescription?.trim() || null,
    location,
    period: input.period?.trim() || null,
    entrance_fee: input.entryFee?.trim() || null,
    visiting_hours: input.openingHours?.trim() || null,
    latitude: normalizeNumber(input.latitude),
    longitude: normalizeNumber(input.longitude),
    images: normalizeImages(input.images, slug),
    is_unesco: normalizeBoolean(input.isUnesco),
    is_featured: normalizeBoolean(input.isFeatured),
    status: normalizeStatus(input.status),
  };
}

export async function createAdminHistoricalSite(input: HistoricalSiteAdminInput) {
  await insert('historical_sites', normalizeHistoricalSiteInput(input));

  return {
    success: true,
    message: 'Tarihi yer oluşturuldu.',
  };
}

export async function updateAdminHistoricalSite(id: string, input: HistoricalSiteAdminInput) {
  if (!id) {
    throw new Error('Tarihi yer bilgisi eksik.');
  }

  await update('historical_sites', id, normalizeHistoricalSiteInput(input));

  return {
    success: true,
    message: 'Tarihi yer güncellendi.',
  };
}

export async function deleteAdminHistoricalSite(id: string) {
  if (!id) {
    throw new Error('Tarihi yer bilgisi eksik.');
  }

  await remove('historical_sites', id);

  return {
    success: true,
    message: 'Tarihi yer silindi.',
  };
}

export type PlaceStatus = 'active' | 'pending' | 'inactive';

export interface PlacePublishInput {
  name?: string | null;
  category?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  address?: string | null;
  phone?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  imageUrl?: string | null;
  images?: unknown;
  status?: string | null;
}

export interface PlaceQualityResult {
  status: PlaceStatus;
  isPublishable: boolean;
  imageCount: number;
  missingFields: string[];
}

const REQUIRED_FOR_ACTIVE: Array<{ key: string; valid: (input: PlacePublishInput) => boolean }> = [
  { key: 'name', valid: (input) => hasText(input.name) },
  { key: 'category', valid: (input) => hasText(input.category) },
  { key: 'description', valid: (input) => hasText(input.description) },
  { key: 'short_description', valid: (input) => hasMinimumText(input.shortDescription, 40) },
  { key: 'address', valid: (input) => hasText(input.address) },
  { key: 'phone', valid: (input) => hasText(input.phone) },
  { key: 'latitude', valid: (input) => hasNumber(input.latitude) },
  { key: 'longitude', valid: (input) => hasNumber(input.longitude) },
  { key: 'cover_image', valid: (input) => normalizePlaceImages(input.images, input.imageUrl).length > 0 },
  { key: 'gallery_images_min_3', valid: (input) => normalizePlaceImages(input.images, input.imageUrl).length >= 3 },
];

export function normalizePlaceStatus(input: string | null | undefined): PlaceStatus {
  if (input === 'active' || input === 'pending' || input === 'inactive') {
    return input;
  }
  return 'pending';
}

export function parseGalleryImageUrls(raw: unknown): string[] {
  if (typeof raw !== 'string') {
    return [];
  }

  return raw
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizePlaceImages(images: unknown, imageUrl?: string | null): string[] {
  const normalized: string[] = [];

  if (Array.isArray(images)) {
    for (const value of images) {
      if (typeof value === 'string' && value.trim()) {
        normalized.push(value.trim());
      }
    }
  } else if (typeof images === 'string' && images.trim()) {
    const raw = images.trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const value of parsed) {
            if (typeof value === 'string' && value.trim()) {
              normalized.push(value.trim());
            }
          }
        }
      } catch {
        normalized.push(...raw.split(',').map((item) => item.trim()).filter(Boolean));
      }
    } else {
      normalized.push(...raw.split(',').map((item) => item.trim()).filter(Boolean));
    }
  }

  if (typeof imageUrl === 'string' && imageUrl.trim()) {
    normalized.unshift(imageUrl.trim());
  }

  return [...new Set(normalized)];
}

export function evaluatePlaceQuality(input: PlacePublishInput): PlaceQualityResult {
  const status = normalizePlaceStatus(input.status);
  const images = normalizePlaceImages(input.images, input.imageUrl);

  if (status !== 'active') {
    return {
      status,
      isPublishable: true,
      imageCount: images.length,
      missingFields: [],
    };
  }

  const missingFields = REQUIRED_FOR_ACTIVE.filter((field) => !field.valid(input)).map((field) => field.key);

  return {
    status,
    isPublishable: missingFields.length === 0,
    imageCount: images.length,
    missingFields,
  };
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasMinimumText(value: unknown, minLength: number): boolean {
  return typeof value === 'string' && value.trim().length >= minLength;
}

function hasNumber(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed);
  }
  return false;
}

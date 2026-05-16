export type ClassifiedModerationRow = {
  title?: string | null;
  description?: string | null;
  phone?: string | null;
  images?: unknown;
  view_count?: number | null;
  contact_count?: number | null;
  moderation_note?: string | null;
};

export type ClassifiedDuplicateMaps = {
  titleCounts: Map<string, number>;
  phoneCounts: Map<string, number>;
};

export type ClassifiedSignalFlags = {
  phoneMissing: boolean;
  imageMissing: boolean;
  shortTitle: boolean;
  thinContent: boolean;
  spamTitle: boolean;
  duplicateTitle: boolean;
  duplicatePhone: boolean;
  lowConversion: boolean;
};

export function normalizeClassifiedModerationKey(value: unknown): string {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

export function buildClassifiedDuplicateMaps(rows: ClassifiedModerationRow[]): ClassifiedDuplicateMaps {
  const titleCounts = new Map<string, number>();
  const phoneCounts = new Map<string, number>();

  rows.forEach((row) => {
    const titleKey = normalizeClassifiedModerationKey(row.title);
    const phoneKey = normalizeClassifiedModerationKey(row.phone);
    if (titleKey) titleCounts.set(titleKey, (titleCounts.get(titleKey) || 0) + 1);
    if (phoneKey) phoneCounts.set(phoneKey, (phoneCounts.get(phoneKey) || 0) + 1);
  });

  return { titleCounts, phoneCounts };
}

export function getClassifiedSignalFlags(
  row: ClassifiedModerationRow,
  duplicateMaps: ClassifiedDuplicateMaps,
): ClassifiedSignalFlags {
  return {
    phoneMissing: !row.phone,
    imageMissing: !Array.isArray(row.images) || row.images.length === 0,
    shortTitle: (row.title || '').length < 16,
    thinContent: (row.description || '').length < 80,
    spamTitle: /([A-Za-zÇĞİÖŞÜçğıöşü0-9])\1{3,}/.test(row.title || ''),
    duplicateTitle: (duplicateMaps.titleCounts.get(normalizeClassifiedModerationKey(row.title)) || 0) > 1,
    duplicatePhone:
      !!row.phone && (duplicateMaps.phoneCounts.get(normalizeClassifiedModerationKey(row.phone)) || 0) > 1,
    lowConversion: Number(row.view_count || 0) > 100 && Number(row.contact_count || 0) === 0,
  };
}

export function getClassifiedRiskScore(
  row: ClassifiedModerationRow,
  duplicateMaps: ClassifiedDuplicateMaps,
): number {
  const flags = getClassifiedSignalFlags(row, duplicateMaps);
  let score = 0;
  if (flags.phoneMissing) score += 18;
  if (flags.imageMissing) score += 14;
  if (flags.shortTitle) score += 9;
  if (flags.thinContent) score += 16;
  if (flags.spamTitle) score += 24;
  if (flags.duplicateTitle) score += 20;
  if (flags.duplicatePhone) score += 18;
  if (flags.lowConversion) score += 8;
  return Math.min(score, 100);
}

export function extractClassifiedReasonCode(note: unknown): string {
  return String(note || '').match(/^\[([A-Z_]+)\]/)?.[1] || '';
}

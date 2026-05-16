import { formatDate } from './utils';

export const PUBLISHER_PROFILE = {
  siteName: 'Sanliurfa.com',
  siteAltName: 'Şanlıurfa Şehir Rehberi',
  publisherName: 'Sanliurfa.com Editöryel Ekibi',
  legalName: 'Sanliurfa.com Dijital Yayın Platformu',
  platformName: 'Sanliurfa.com Şehir Rehberi Platformu',
  foundedYear: '2025',
  sitePublishedAtIso: '2025-01-01T00:00:00.000Z',
  generalEmail: 'iletisim@sanliurfa.com',
  businessEmail: 'isletme@sanliurfa.com',
  privacyEmail: 'kvkk@sanliurfa.com',
  address: 'Eyyübiye, Şanlıurfa, Türkiye',
  logoPath: '/favicon.svg',
  transparencyReviewedAt: '2026-05-13',
  transparencyReviewedAtIso: '2026-05-13T00:00:00.000Z',
  aboutPath: '/hakkinda',
  contactPath: '/iletisim',
  imprintPath: '/kunye',
  authorsPath: '/yazarlar',
  policyPath: '/yayin-politikasi',
  sameAs: [
    'https://www.instagram.com/sanliurfacom',
    'https://www.facebook.com/sanliurfacom',
    'https://x.com/sanliurfacom',
    'https://www.youtube.com/@sanliurfacom',
  ],
} as const;

export function formatTransparencyDate(date: string | null | undefined): string | null {
  if (!date) return null;
  return formatDate(date);
}

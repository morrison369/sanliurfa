import type { CityServiceItem } from './site-settings';

const SITE_URL = 'https://sanliurfa.com';

export function cityServiceItemListSchema(services: CityServiceItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Şanlıurfa Şehir Servisleri',
    description: 'Şanlıurfa nöbetçi eczane, otobüs saatleri ve uçak saatleri servisleri.',
    url: `${SITE_URL}/sehir-servisleri`,
    itemListElement: services.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: service.title,
      description: service.description,
      url: `${SITE_URL}${service.href}`,
    })),
  };
}

export function cityServiceDetailSchema(input: {
  service: CityServiceItem | null;
  slug: string;
  title: string;
  description: string;
  canonicalPath: string;
}) {
  const serviceName = input.service?.title || input.title;
  const statusText = input.service?.statusText || 'Şanlıurfa odaklı servis sayfası yayında.';
  const sourceLabel = input.service?.sourceLabel || 'Şanlıurfa yerel veri kaynakları';
  const sourceUrl = input.service?.sourceUrl || SITE_URL;
  const lastUpdatedAt = input.service?.lastUpdatedAt;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: serviceName,
      serviceType: input.title,
      description: input.description,
      url: `${SITE_URL}${input.canonicalPath}`,
      areaServed: {
        '@type': 'City',
        name: 'Şanlıurfa',
        address: {
          '@type': 'PostalAddress',
          addressRegion: 'Şanlıurfa',
          addressCountry: 'TR',
        },
      },
      provider: {
        '@type': 'Organization',
        name: sourceLabel,
        url: sourceUrl
      },
      inLanguage: 'tr-TR',
      ...(lastUpdatedAt ? { dateModified: lastUpdatedAt } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `${input.title} bilgileri nasıl güncellenir?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${sourceLabel} takip edilir. Veri bağlantısı aktif olduğunda bilgiler bu sayfada güncel olarak yayınlanır.`,
          },
        },
        {
          '@type': 'Question',
          name: `${input.title} sayfasının güncel durumu nedir?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: statusText,
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Ana Sayfa',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Şehir Servisleri',
          item: `${SITE_URL}/sehir-servisleri`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: input.title,
          item: `${SITE_URL}${input.canonicalPath}`,
        },
      ],
    },
  ];
}

import type { APIRoute } from 'astro';
import { getPublicAppUrl } from '../lib/public-app-url';
import { PUBLISHER_PROFILE } from '../lib/transparency';

export const GET: APIRoute = async () => {
  const baseUrl = getPublicAppUrl();
  const payload = {
    publication: {
      name: PUBLISHER_PROFILE.siteName,
      displayName: PUBLISHER_PROFILE.siteAltName,
      legalName: PUBLISHER_PROFILE.legalName,
      language: 'tr',
      country: 'TR',
      headquarters: PUBLISHER_PROFILE.address,
      website: baseUrl,
      logo: `${baseUrl}${PUBLISHER_PROFILE.logoPath}`,
    },
    publisherCenter: {
      publicationUrl: baseUrl,
      primaryFeed: `${baseUrl}/rss.xml`,
      sitemap: `${baseUrl}/sitemap.xml`,
      robots: `${baseUrl}/robots.txt`,
      sections: [
        { name: 'Son Yazılar', type: 'feed', url: `${baseUrl}/rss.xml` },
        { name: 'Blog', type: 'web-location', url: `${baseUrl}/blog` },
        { name: 'Gezilecek Yerler', type: 'web-location', url: `${baseUrl}/gezilecek-yerler` },
        { name: 'Yeme İçme', type: 'web-location', url: `${baseUrl}/yeme-icme` },
        { name: 'Etkinlikler', type: 'web-location', url: `${baseUrl}/etkinlikler` },
      ],
    },
    transparency: {
      imprint: `${baseUrl}${PUBLISHER_PROFILE.imprintPath}`,
      authors: `${baseUrl}${PUBLISHER_PROFILE.authorsPath}`,
      policy: `${baseUrl}${PUBLISHER_PROFILE.policyPath}`,
      contact: `${baseUrl}${PUBLISHER_PROFILE.contactPath}`,
      generalEmail: PUBLISHER_PROFILE.generalEmail,
      businessEmail: PUBLISHER_PROFILE.businessEmail,
      privacyEmail: PUBLISHER_PROFILE.privacyEmail,
      reviewedAt: PUBLISHER_PROFILE.transparencyReviewedAtIso,
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

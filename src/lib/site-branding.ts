import { getSiteSetting } from './site-content';
import { getPublicAppUrl } from './public-app-url';

export type SiteBranding = {
  siteName: string;
  baseUrl: string;
};

const BRANDING_FALLBACK: SiteBranding = {
  siteName: 'Sanliurfa.com',
  baseUrl: 'https://sanliurfa.com',
};

export async function getSiteBranding(): Promise<SiteBranding> {
  const setting = await getSiteSetting('homepage.schema', BRANDING_FALLBACK as Record<string, any>);
  const rawSiteName = String((setting as any)?.siteName || BRANDING_FALLBACK.siteName).trim();
  const rawBaseUrl = String((setting as any)?.baseUrl || getPublicAppUrl() || BRANDING_FALLBACK.baseUrl).trim();
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  return {
    siteName: rawSiteName || BRANDING_FALLBACK.siteName,
    baseUrl: baseUrl || BRANDING_FALLBACK.baseUrl,
  };
}

import { getSiteSetting } from './site-content';

export const ADSENSE_CLIENT =
  process.env.PUBLIC_ADSENSE_CLIENT ||
  process.env.ADSENSE_CLIENT ||
  'ca-pub-7160871802649062';

export type AdSensePlacement =
  | 'homepage-banner'
  | 'blog-list-sidebar'
  | 'blog-detail-inline'
  | 'blog-detail-sidebar'
  | 'classified-detail';

export type AdSenseSlotsConfig = {
  client?: string;
  autoAdsEnabled?: boolean;
  homepageBanner?: string;
  blogListSidebar?: string;
  blogDetailInline?: string;
  blogDetailSidebar?: string;
  classifiedDetail?: string;
};

const placementEnvMap: Record<AdSensePlacement, string[]> = {
  'homepage-banner': ['PUBLIC_ADSENSE_SLOT_HOMEPAGE_BANNER', 'ADSENSE_SLOT_HOMEPAGE_BANNER'],
  'blog-list-sidebar': ['PUBLIC_ADSENSE_SLOT_BLOG_LIST_SIDEBAR', 'ADSENSE_SLOT_BLOG_LIST_SIDEBAR'],
  'blog-detail-inline': ['PUBLIC_ADSENSE_SLOT_BLOG_DETAIL_INLINE', 'ADSENSE_SLOT_BLOG_DETAIL_INLINE'],
  'blog-detail-sidebar': ['PUBLIC_ADSENSE_SLOT_BLOG_DETAIL_SIDEBAR', 'ADSENSE_SLOT_BLOG_DETAIL_SIDEBAR'],
  'classified-detail': ['PUBLIC_ADSENSE_SLOT_CLASSIFIED_DETAIL', 'ADSENSE_SLOT_CLASSIFIED_DETAIL'],
};

const placementSettingMap: Record<AdSensePlacement, keyof AdSenseSlotsConfig> = {
  'homepage-banner': 'homepageBanner',
  'blog-list-sidebar': 'blogListSidebar',
  'blog-detail-inline': 'blogDetailInline',
  'blog-detail-sidebar': 'blogDetailSidebar',
  'classified-detail': 'classifiedDetail',
};

function getEnvSlot(placement: AdSensePlacement): string {
  const keys = placementEnvMap[placement] || [];
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

export async function getAdSenseSlotsConfig(): Promise<AdSenseSlotsConfig> {
  return getSiteSetting<AdSenseSlotsConfig>('adsense.slots', {
    client: ADSENSE_CLIENT,
    autoAdsEnabled: true,
    homepageBanner: getEnvSlot('homepage-banner'),
    blogListSidebar: getEnvSlot('blog-list-sidebar'),
    blogDetailInline: getEnvSlot('blog-detail-inline'),
    blogDetailSidebar: getEnvSlot('blog-detail-sidebar'),
    classifiedDetail: getEnvSlot('classified-detail'),
  });
}

export async function getAdSenseClient(): Promise<string> {
  const config = await getAdSenseSlotsConfig();
  if (typeof config.client === 'string' && config.client.trim()) {
    return config.client.trim();
  }
  return ADSENSE_CLIENT;
}

export async function getAdSenseSlot(placement: AdSensePlacement): Promise<string> {
  const config = await getAdSenseSlotsConfig();
  const settingKey = placementSettingMap[placement];
  const settingValue = typeof config[settingKey] === 'string' ? config[settingKey]?.trim() : '';
  if (settingValue) {
    return settingValue;
  }
  return getEnvSlot(placement);
}

export async function hasAdSenseSlot(placement: AdSensePlacement): Promise<boolean> {
  return Boolean(await getAdSenseSlot(placement));
}

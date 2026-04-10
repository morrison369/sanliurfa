/**
 * Feature Gating Library
 * Manage premium feature access based on subscription tier
 */

import { getActiveSubscription } from './subscription-management';
import { logger } from './logging';

/**
 * Feature definition mapping tier levels to available features
 * tier_level 0 = free, 1 = basic, 2 = pro, 3 = enterprise
 */
export const PREMIUM_FEATURES = {
  // Search & Discovery (Basic+)
  ADVANCED_SEARCH: {
    minTier: 1,
    name: 'Gelişmiş arama',
    description: 'Konum, kategori ve rating ile filtrelenmiş arama'
  },
  PROXIMITY_FILTER: {
    minTier: 1,
    name: 'Yakınlık filtresi',
    description: 'Konumunuza yakın mekanları bul'
  },
  SAVED_SEARCHES: {
    minTier: 1,
    name: 'Kaydedilmiş aramalar',
    description: 'Sık kullandığınız aramaları kaydedin'
  },

  // Collections & Favorites (Basic+)
  UNLIMITED_FAVORITES: {
    minTier: 1,
    name: 'Sınırsız favoriler',
    description: 'Sınırsız sayıda mekanı kaydedin (Free: 50 limit)'
  },
  COLLECTIONS: {
    minTier: 1,
    name: 'Koleksiyonlar',
    description: 'Mekanları kategorize etmiş koleksiyonlar oluşturun'
  },

  // Events (Basic+)
  UNLIMITED_RSVP: {
    minTier: 1,
    name: 'Sınırsız etkinlik RSVP',
    description: 'İstediğiniz kadar etkinliğe katılım sinyali verin (Free: 20/month limit)'
  },
  EVENT_REMINDERS: {
    minTier: 1,
    name: 'Etkinlik anımsatıcıları',
    description: 'Etkinliklerin başlamasından önce bildirim alın'
  },

  // Reviews & Content (Basic+)
  UNLIMITED_REVIEWS: {
    minTier: 1,
    name: 'Sınırsız yorum',
    description: 'İstediğiniz kadar yorum yazın (Free: 10/month limit)'
  },
  PHOTO_UPLOADS: {
    minTier: 1,
    name: 'Fotoğraf yükleme',
    description: 'Mekanlar için yorum ekleme sırasında fotoğraf yükleyin'
  },
  VIDEO_UPLOADS: {
    minTier: 2,
    name: 'Video yükleme',
    description: 'Mekanlar için video içeriği yükleyin'
  },

  // Coupons & Promotions (Basic+)
  COUPON_USAGE: {
    minTier: 1,
    name: 'Kupon kullanım',
    description: 'Mekan sahiplerinin promosyon kuponlarını kullanın'
  },
  CREATE_PROMOTIONS: {
    minTier: 2,
    name: 'Promosyon oluşturma',
    description: 'Mekanınız için promosyon ve kupon oluşturun (Mekan sahibi)'
  },

  // Analytics & Management (Pro+)
  PLACE_ANALYTICS: {
    minTier: 2,
    name: 'Mekan analitiği',
    description: 'Mekanınızın görüntülenme ve etkinliği analiz edin (Mekan sahibi)'
  },
  ADVANCED_ANALYTICS: {
    minTier: 3,
    name: 'Gelişmiş analitiği',
    description: 'Detaylı müşteri davranışı ve trend analizi (Enterprise)'
  },
  CUSTOM_REPORTS: {
    minTier: 3,
    name: 'Özel raporlar',
    description: 'İhtiyaca özel analitiği raporlar oluşturun'
  },

  // Admin & Support (Enterprise)
  PRIORITY_SUPPORT: {
    minTier: 3,
    name: 'Öncelikli destek',
    description: '24/7 öncelikli müşteri destek'
  },
  API_ACCESS: {
    minTier: 3,
    name: 'API erişimi',
    description: 'Şanlıurfa API\'sine erişim ve entegrasyon'
  },
  BULK_OPERATIONS: {
    minTier: 3,
    name: 'Toplu operasyonlar',
    description: 'Çok sayıda mekanı bir sefer arada yönetin'
  },
} as const;

export type FeatureName = keyof typeof PREMIUM_FEATURES;

/**
 * Check if a user has access to a specific feature
 * Returns true if user is on a tier that includes the feature
 */
export async function hasFeatureAccess(
  userId: string,
  feature: FeatureName
): Promise<boolean> {
  try {
    const subscription = await getActiveSubscription(userId);

    // Users without subscription get free tier access (0)
    const tierLevel = subscription?.tier?.tierLevel ?? 0;
    const requiredTier = PREMIUM_FEATURES[feature].minTier;

    return tierLevel >= requiredTier;
  } catch (error) {
    logger.error('Error checking feature access', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get tier name and level from user subscription
 */
export async function getUserTierInfo(userId: string): Promise<{ name: string; level: number } | null> {
  try {
    const subscription = await getActiveSubscription(userId);

    if (!subscription) {
      return { name: 'free', level: 0 };
    }

    return {
      name: subscription.tier.name,
      level: subscription.tier.tierLevel,
    };
  } catch (error) {
    logger.error('Error getting user tier info', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get all available features grouped by tier
 */
export function getFeaturesByTier(): Record<number, Array<{ name: FeatureName; info: any }>> {
  const featuresByTier: Record<number, Array<{ name: FeatureName; info: any }>> = {
    0: [],
    1: [],
    2: [],
    3: [],
  };

  Object.entries(PREMIUM_FEATURES).forEach(([name, info]) => {
    const tier = info.minTier as number;
    featuresByTier[tier].push({
      name: name as FeatureName,
      info,
    });
  });

  return featuresByTier;
}

/**
 * Check multiple features at once and return access status for each
 */
export async function checkFeaturesAccess(
  userId: string,
  features: FeatureName[]
): Promise<Record<FeatureName, boolean>> {
  const accessMap: Record<FeatureName, boolean> = {} as Record<FeatureName, boolean>;

  for (const feature of features) {
    accessMap[feature] = await hasFeatureAccess(userId, feature);
  }

  return accessMap;
}

/**
 * Get upgrade message for a feature
 */
export function getFeatureUpgradeMessage(feature: FeatureName): string {
  const featureInfo = PREMIUM_FEATURES[feature];
  const tierNames = ['Ücretsiz', 'Başlangıç', 'Profesyonel', 'Kurumsal'];
  const minTierName = tierNames[featureInfo.minTier] || 'Premium';

  return `Bu özelliği kullanmak için ${minTierName} plana yükseltin: ${featureInfo.description}`;
}

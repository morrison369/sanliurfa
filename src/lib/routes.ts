// @ts-nocheck
/**
 * Lazy Loading Routes Configuration
 * Code-splitting for better performance
 */

// Route definitions with lazy loading
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const lazyRoutes: Record<string, () => Promise<any>> = {
  '/admin': () => import('../pages/admin/index.astro'),
  '/admin/dashboard': () => import('../pages/admin/dashboard.astro'),
  '/admin/analytics': () => import('../pages/admin/analytics.astro'),
  '/admin/users': () => import('../pages/admin/manage.astro'),
  '/admin/places': () => import('../pages/admin/places.astro'),
  '/admin/places/add': () => import('../pages/admin/places/add.astro'),
  '/admin/blog': () => import('../pages/admin/blog/index.astro'),
  '/admin/reviews': () => import('../pages/admin/reviews.astro'),
  '/admin/moderation': () => import('../pages/admin/moderation.astro'),
  '/admin/verifications': () => import('../pages/admin/verifications.astro'),
  '/admin/webhooks': () => import('../pages/admin/webhooks.astro'),
  '/isletme': () => import('../pages/isletme/analytics.astro'),
  '/vendor/dashboard': () => import('../pages/vendor/dashboard.astro'),
  '/canli-analitik': () => import('../pages/canli-analitik/index.astro'),
  '/raporlar': () => import('../pages/raporlar/index.astro'),
  '/veri-ambari': () => import('../pages/veri-ambarı/index.astro'),
  '/sosyal': () => import('../pages/sosyal/index.astro'),
  '/kesfet': () => import('../pages/kesfet/index.astro'),
  '/trend': () => import('../pages/trend/index.astro'),
  '/siralamalar': () => import('../pages/siralamalar/index.astro'),
  '/loyalty': () => import('../pages/loyalty/index.astro'),
  '/loyalty/rewards': () => import('../pages/loyalty/rewards.astro'),
  '/loyalty/transactions': () => import('../pages/loyalty/transactions.astro'),
  '/kullanici/sadakat': () => import('../pages/kullanici/sadakat.astro'),
  '/aktivitelerim': () => import('../pages/aktivitelerim/index.astro'),
  '/koleksiyonlar': () => import('../pages/koleksiyonlar/index.astro'),
  '/mesajlar': () => import('../pages/mesajlar/index.astro'),
  '/bildirimler': () => import('../pages/bildirimler/index.astro'),
  '/isletme-kayit': () => import('../pages/isletme-kayit.astro'),
  '/blog': () => import('../pages/blog/index.astro'),
  '/etkinlikler': () => import('../pages/etkinlikler/index.astro'),
  '/gastronomi': () => import('../pages/gastronomi/index.astro'),
  '/tarihi-yerler': () => import('../pages/tarihi-yerler/index.astro'),
};

export const criticalRoutes = [
  '/',
  '/mekanlar',
  '/hakkinda',
  '/iletisim',
  '/giris',
  '/kayit',
];

export function shouldLazyLoad(path: string): boolean {
  if (path in lazyRoutes) return true;
  if (path.startsWith('/admin/')) return true;
  if (path.startsWith('/isletme/')) return true;
  if (path.startsWith('/vendor/')) return true;
  if (path.startsWith('/profil/')) return true;
  if (path.startsWith('/kullanici/')) return true;
  if (path.startsWith('/isletme-kayit')) return true;
  if (path.startsWith('/koleksiyonlar/')) return true;
  if (path.startsWith('/blog/')) return true;
  if (path.startsWith('/etkinlikler/')) return true;
  if (path.startsWith('/gastronomi/')) return true;
  if (path.startsWith('/tarihi-yerler/')) return true;
  return false;
}

export function getPreloadHints(): string[] {
  return criticalRoutes.map(route => {
    if (route === '/') return '/';
    return `${route}`;
  });
}

export default lazyRoutes;

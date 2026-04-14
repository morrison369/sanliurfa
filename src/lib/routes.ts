/**
 * Lazy Loading Routes Configuration
 * Code-splitting for better performance
 */

// @ts-nocheck - Astro file imports cause TS errors

// Route definitions with lazy loading
export const lazyRoutes = {
  // Admin routes - lazy loaded
  '/admin': () => import('../pages/admin/index.astro'),
  '/admin/dashboard': () => import('../pages/admin/dashboard.astro'),
  '/admin/analytics': () => import('../pages/admin/analytics.astro'),
  '/admin/users': () => import('../pages/admin/users.astro'),
  '/admin/places': () => import('../pages/admin/places/index.astro'),
  '/admin/places/add': () => import('../pages/admin/places/add.astro'),
  '/admin/blog': () => import('../pages/admin/blog/index.astro'),
  '/admin/reviews': () => import('../pages/admin/reviews.astro'),
  '/admin/moderation': () => import('../pages/admin/moderation.astro'),
  '/admin/verifications': () => import('../pages/admin/verifications.astro'),
  '/admin/webhooks': () => import('../pages/admin/webhooks.astro'),
  
  // Vendor routes
  '/isletme': () => import('../pages/isletme/analytics.astro'),
  '/vendor/dashboard': () => import('../pages/vendor/dashboard.astro'),
  
  // Analytics routes
  '/canli-analitik': () => import('../pages/canli-analitik/index.astro'),
  '/raporlar': () => import('../pages/raporlar/index.astro'),
  '/veri-ambari': () => import('../pages/veri-ambarı/index.astro'),
  
  // Social features
  '/sosyal': () => import('../pages/sosyal/index.astro'),
  '/kesfet': () => import('../pages/kesfet/index.astro'),
  '/trend': () => import('../pages/trend/index.astro'),
  '/siralamalar': () => import('../pages/siralamalar/index.astro'),
  
  // Loyalty program
  '/loyalty': () => import('../pages/loyalty/index.astro'),
  '/loyalty/rewards': () => import('../pages/loyalty/rewards.astro'),
  '/loyalty/transactions': () => import('../pages/loyalty/transactions.astro'),
  
  // User features
  '/kullanici/sadakat': () => import('../pages/kullanici/sadakat.astro'),
  '/aktivitelerim': () => import('../pages/aktivitelerim/index.astro'),
  '/koleksiyonlar': () => import('../pages/koleksiyonlar/index.astro'),
  '/mesajlar': () => import('../pages/mesajlar/index.astro'),
  '/bildirimler': () => import('../pages/bildirimler/index.astro'),
  
  // Places management
  '/places/ekle': () => import('../pages/places/ekle.astro'),
  
  // Content
  '/blog': () => import('../pages/blog/index.astro'),
  '/etkinlikler': () => import('../pages/etkinlikler/index.astro'),
  '/gastronomi': () => import('../pages/gastronomi/index.astro'),
  '/tarihi-yerler': () => import('../pages/tarihi-yerler/index.astro'),
};

// Preload critical routes
export const criticalRoutes = [
  '/',
  '/places',
  '/hakkinda',
  '/iletisim',
  '/giris',
  '/kayit',
];

// Check if route should be lazy loaded
export function shouldLazyLoad(path: string): boolean {
  // Exact match
  if (path in lazyRoutes) return true;
  
  // Pattern match for dynamic routes
  if (path.startsWith('/admin/')) return true;
  if (path.startsWith('/isletme/')) return true;
  if (path.startsWith('/vendor/')) return true;
  if (path.startsWith('/profil/')) return true;
  if (path.startsWith('/kullanici/')) return true;
  if (path.startsWith('/places/ekle')) return true;
  if (path.startsWith('/koleksiyonlar/')) return true;
  if (path.startsWith('/blog/')) return true;
  if (path.startsWith('/etkinlikler/')) return true;
  if (path.startsWith('/gastronomi/')) return true;
  if (path.startsWith('/tarihi-yerler/')) return true;
  
  return false;
}

// Get preload hints for critical routes
export function getPreloadHints(): string[] {
  return criticalRoutes.map(route => {
    // Convert route to actual file path
    if (route === '/') return '/';
    return `${route}`;
  });
}

export default lazyRoutes;

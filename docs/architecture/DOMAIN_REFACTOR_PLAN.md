# Domain Refactor Plan

## Amaç

`src/lib` altındaki dağınık helper ve render katmanlarını domain bazlı yapıya geçirmek.

## Hedef yapı

- `src/lib/shared`
- `src/lib/account`
- `src/lib/social`
- `src/lib/subscription`
- `src/lib/analytics`
- `src/lib/admin`
- `src/lib/discovery`
- `src/lib/content`

## İlk taşınacak modüller

### shared
- `ui-copy.ts`
- `render-states.ts`
- `api-envelope.ts`
- `copy-hygiene.ts`

### account
- `user-profile.ts`
- `user-settings.ts`
- `notification-preferences.ts`

### social
- `notifications-center.ts`
- `notification-center.ts`
- `messaging-inbox.ts`
- `activity-feed.ts`
- `user-recommendations.ts`

### subscription
- `subscription-manager.ts`
- `subscription-admin-dashboard.ts`
- `billing-history.ts`
- `transaction-history.ts`
- `pricing-plans.ts`

### analytics
- `analytics-panel.ts`
- `business-analytics-dashboard.ts`
- `live-analytics-dashboard.ts`
- `webhook-analytics-dashboard.ts`

### admin
- `admin-dashboard-overview.ts`
- `admin-performance-dashboard.ts`
- `admin-verification-queue.ts`
- `report-manager.ts`

## Uygulama sırası

1. shared modüllerini taşı
2. import alias düzelt
3. domain bazlı test dosyalarını birlikte taşı
4. her dalga sonrası `typecheck`, `astro:react:guard`, `copy:visible:audit`

## Tamamlanan dalgalar

- `shared`
- `account`
- `subscription`
- `analytics`
- `social`
- `discovery`
- `admin`
- `content`
- `vendor`

## Enforcement

- `npm run domain:refactor:guard`
- CI quick gate içinde blocking adım
- advisory kritik test zincirine bağlı

## Shim listesi

Kök `src/lib` altında domain'e taşınmış modüller artık yalnızca re-export shim olarak kalır:

- `shared/*`
- `account/*`
- `subscription/*`
- `analytics/*`
- `social/*`
- `discovery/*`
- `admin/*`
- `content/*`
- `vendor/*`

## Riskler

- import path kırılması
- test dosyalarının domain dışı kalması
- helper/render ayrımının yarım kalması

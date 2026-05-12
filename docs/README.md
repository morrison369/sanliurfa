# Şanlıurfa.com Dokümantasyon

Bu klasör karar üretmek için az sayıda kanonik belge kullanır. Eski batch notları,
tek kullanımlık raporlar ve tarihsel planlar yeni tasarım veya mimari kararı sayılmaz.

## Önce Bunları Oku

1. [Source Of Truth](./SOURCE_OF_TRUTH.md)
2. [MVP Public Acceptance](./MVP_PUBLIC_ACCEPTANCE.md)
3. [Astro SSR Frontend Stack](./ASTRO_SSR_FRONTEND_STACK.md)
4. [City Taxonomy and Social Surface](./CITY_TAXONOMY_AND_SOCIAL_SURFACE.md)
5. [UI Contracts](./UI_CONTRACTS.md)

## Operasyon Belgeleri

- [Deployment](./DEPLOYMENT.md)
- [DB-First Site Yönetimi](./DB_FIRST_SITE_MANAGEMENT.md)
- [Security](./SECURITY.md)
- [Route Ownership](./ROUTE_OWNERSHIP.md)
- [Migration Duplicate Remediation](./MIGRATION_DUPLICATE_REMEDIATION.md)

## Otomatik Raporlar

JSON ve `*-report.md` dosyaları karar kaynağı değildir; script çıktısıdır.
Bir rapor kanonik belgeyle çelişirse kanonik belge esas alınır, rapor yeniden üretilir.

## Değişmeyen Kurallar

- Site yalnızca Türkçedir.
- Ana public tema sıcak light Şanlıurfa şehir rehberi temasıdır.
- Eski koyu tema, hazır liste sitesi ve sıradan blog kalıbı tasarım dili yasaktır.
- Demo ticaret terimleri, geçici içerik ve alakasız görsel fallback public yüzeyde kullanılmaz.
- Astro SSR `@astrojs/node` standalone runtime kanoniktir.
- Tasarım, SEO, şehir taksonomisi ve sosyal/eşleşme yüzeyi gate ile korunur.

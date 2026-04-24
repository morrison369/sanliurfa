# Şanlıurfa.com Dokümantasyon

Bu klasör, Şanlıurfa.com projesinin teknik operasyon, API, içerik ve yayın süreç dokümantasyonunu içerir.

## Önemli Dokümanlar

- [DB-First Site Yönetimi](./DB_FIRST_SITE_MANAGEMENT.md)
- [Detaylı Öneriler ve Uygulama Planı](./DETAYLI_PROJE_ONERILERI_VE_UYGULAMA_PLANI.md)
- [Ücretsiz API Rehberi](./FREE_APIS_GUIDE.md)
- [API Rehberi](./API_GUIDE.md)
- [Güvenlik](./SECURITY.md)
- [Deployment](./DEPLOYMENT.md)
- [Isolated Runtime](./isolated-runtime.md)
- [Content Cluster Quality Report](./content-cluster-quality-report.md)
- [Content Programmatic Quality Report](./content-programmatic-quality-report.md)
- [Image Moderation Report](./image-moderation-report.md)
- [Problem JSON Report](./problem-json-report.json)
- [Runtime Health Report](./runtime-health-report.md)

## Proje Prensipleri

- Site tek dil Türkçe çalışır.
- Yönetilebilir içerikler DB-first modelinde admin panelden yönetilir.
- Ücretli servis bağımlılığı yerine ücretsiz/açık alternatifler tercih edilir.
- Geliştirme sürecinde port ve runtime izolasyonu korunur.

## Temel Yığın

- Frontend: Astro 6.x, React 19, Tailwind CSS
- Backend: Astro SSR (Node adapter)
- Veritabanı: PostgreSQL (standart port 5432)
- Cache: Redis (standart port 6379)
- Medya: Unsplash + Pexels API (slug bazlı yerel dosya + DB metadata)

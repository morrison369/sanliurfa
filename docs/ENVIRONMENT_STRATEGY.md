# Environment Strategy

## Source Of Truth
- `.env.example` zorunlu ve desteklenen değişkenlerin tek kaynak listesidir.
- Lokal doğrulama için varsayılan stack:
  - PostgreSQL: `postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa`
  - Redis: `redis://127.0.0.1:6379`

## File Roles
- `.env.example`
  - repo içi referans şablonu
  - gerçek secret içermez
- `.env.local`
  - geliştiriciye özel override
  - repo’ya commit edilmez
- `.env.production`
  - prod-benzeri lokal akış
  - `release:gate:local` önce bunu yükler

## Local Validation
- Tam lokal kalite hattı:
  - `npm run release:gate:local`
- PWA runtime smoke:
  - `npm run test:e2e:pwa`

## Notes
- `release:gate` mevcut shell env’i ile çalışır.
- `release:gate:local` sırasıyla `.env.production`, `.env.local`, `.env` dosyalarını yükler.
- `db:test:bootstrap` önce hedef `DATABASE_URL` bağlantısını dener; bağlantı varsa DB yaratmaya çalışmaz.

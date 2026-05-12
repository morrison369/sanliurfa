# Start Here

Bu dosya hızlı onboarding içindir. Eski incident komutları, sabit şifreler ve tek seferlik fix
rehberleri artık burada tutulmaz.

## 1. Kanonik Belgeler

Önce şu sırayla oku:

1. `AGENTS.md`
2. `ARCHITECTURE-MAP.md`
3. `DEPLOYMENT.md`
4. `docs/SOURCE_OF_TRUTH.md`
5. `docs/ROUTE_OWNERSHIP.md`

## 2. Runtime Gerçeği

- Node.js: `22.13.0+`
- Önerilen sürüm: `.nvmrc` içindeki `22.19.0`
- Framework: Astro SSR
- Production: CWP shared hosting + PM2
- Docker: bu proje için kanonik runtime değil

## 3. İlk Komutlar

```bash
node -v
npm install
npm run type-check
npm run build
```

Geliştirme:

```bash
npm run dev
```

## 4. Kritik Komutlar

```bash
npm run db:migrate
npm run db:migrate:status
npm run ops:cwp:status
npm run ops:cwp:smoke
npm run ops:cwp:release-readiness
```

## 5. Ürün Kuralları

- Site yalnızca Türkçe
- Yönetilebilir içerik DB-first
- Landing, admin ve şehir servisleri birincil ürün yüzeyi
- Route kararları `docs/ROUTE_OWNERSHIP.md` üzerinden alınır

## 6. Dikkat

- Eski `trust` tabanlı PostgreSQL komutları, örnek admin şifreleri ve tek seferlik fix notları
  source-of-truth değildir.
- `public-worktree-sync/` klasörünü canlı uygulama ağacı sanma.
- `scripts/README.md` ve `src/components/README.md` yeni yapıya göre okunmalı; eski İngilizce/Python
  rehberleri referans alma.

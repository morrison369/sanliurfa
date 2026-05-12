# Scripts Guide

Bu klasör artık tek bir scraping klasörü değildir. Kanonik kullanım Node tabanlı ürün ve ops
scriptleridir.

## Kategoriler

### Runtime ve Geliştirme

- `scripts/runtime/*`
- isolated dev, Redis daemon, sağlık raporu ve cleanup araçları

### Production Operasyonları

- `scripts/prod-cwp-ops.sh`
- `scripts/prod-sync.mjs`
- `scripts/cwp-cron-*.sh`

Kanonik production hattı:

```bash
npm run ops:cwp:status
npm run ops:cwp:oneshot
```

Parçalı kullanım:

```bash
npm run ops:cwp:preflight
npm run ops:cwp:predeploy-checks
npm run ops:cwp:smoke
npm run ops:cwp:deploy
npm run ops:cwp:release-readiness
```

Anlamı:

- `ops:cwp:preflight`: hızlı runtime ve zorunlu dosya kontrolü
- `ops:cwp:predeploy-checks`: ağır deploy öncesi gate zinciri
- `ops:cwp:release-readiness`: hafif readiness özeti; ağır gate zincirini tekrar çalıştırmaz

### CI ve Gate Scriptleri

- `scripts/ci/*`
- route ownership, frontend quality, release readiness, security ve workflow gate'leri

Script yüzeyi envanteri ve küçültme planı:

```bash
npm run scripts:surface:report
```

- çıktı: `docs/script-surface-report.md`
- karar planı: `docs/SCRIPT_SURFACE_REDUCTION_PLAN.md`

### Smoke ve Job Scriptleri

- `scripts/smoke/*`
- `scripts/jobs/*`

Şehir servisleri için tipik örnekler:

```bash
npm run jobs:weather:refresh
npm run jobs:pharmacy:refresh
npm run jobs:transit:refresh
npm run smoke:pages:critical
npm run smoke:images:critical
npm run smoke:admin:surface
```

### Veritabanı ve OpenAPI

- `scripts/migrate.ts`
- `scripts/openapi/*`

```bash
npm run db:migrate
npm run db:migrate:status
npm run sdk:generate
```

## Legacy Alanlar

Repoda Python tabanlı scraping veya tek seferlik yardımcı scriptler bulunabilir. Bunlar:

- ürün runtime'ının merkezi değildir
- README seviyesi kanonik akış yerine geçmez
- kullanılacaksa önce ilgili dosyanın gerçekten çağrıldığını doğrula

Özellikle eski Supabase, toplu scraping veya tek kullanımlık fix scriptleri ikincil kabul edilir.

## Kural

- Yeni operasyon scripti önce `package.json` script yüzeyine bağlanır
- Script değişikliği varsa ilgili kanonik doküman da güncellenir
- Production komutları CWP + PM2 modeliyle çelişemez

# Operations Index

Bu indeks, deploy ve bakım sırasında hangi yerel kanıt dosyasına bakılacağını tek yerde toplar.

## Ana Komutlar

| Komut | Amaç | Ne zaman |
|---|---|---|
| `npm run release:quick` | Hızlı yerel release sinyali | Küçük config/doküman değişiklikleri sonrası |
| `npm run release:full` | Tam yerel release gate | Deploy öncesi resmi kontrol |
| `npm run release:prod-preflight` | Tam yerel gate + prod evidence | Üretime çıkış öncesi |
| `npm run release:evidence` | Yerel kanıt tazeliği | Raporların eskimediğini doğrulamak için |
| `npm run prod:evidence` | Canlı/production evidence raporu | Deploy öncesi veya deploy sonrası |
| `npm run openapi:contract:gaps` | P1/P2 contract test borcu | API test planlama |
| `npm run content:admin-turkish:gate` | Admin Türkçe UI kontrolü | Admin ekranı değişiklikleri sonrası |
| `npm run security:headers:snapshot` | Güvenlik header snapshot | Middleware/security değişiklikleri sonrası |
| `npm run gate:done` | En geniş yerel gate | Büyük batch kapanışı |

## Kanıt Dosyaları

| Dosya | İçerik | Beklenen |
|---|---|---|
| `docs/RELEASE_STATUS.md` | Release özeti | `Status: ready` |
| `docs/RELEASE_EVIDENCE.md` | Yerel kanıt tazeliği | `Status: ready` |
| `docs/PROD_EVIDENCE.md` | Canlı domain probe kanıtı | `ready` veya canlı URL yoksa `ready_without_live_probe` |
| `docs/local-gate-summary.md` | Gate özet sinyali | `Status: ready` |
| `docs/site-doctor-report.md` | Operasyon artefact kontrolü | `Status: ready` |
| `docs/openapi-route-tiers.md` | Route tier dağılımı | `Status: ok` |
| `docs/auth-log-standard-report.md` | Auth log standardı | `Status: ok` |
| `docs/env-doctor-report.md` | Env yapılandırma sağlığı | `Status: ok` |
| `docs/openapi-contract-gap-report.md` | P1/P2 contract borcu | `Status: ok` |
| `docs/admin-turkish-ui-report.md` | Admin Türkçe UI gate | `Status: ok` |
| `docs/SECURITY_HEADERS_SNAPSHOT.md` | Security header snapshot | `Status: ok` |
| `docs/MIGRATION_BASELINE_DECISION.md` | Migration baseline kararı | Bilinen duplicate kayıtları açıklanmış |

## Politika

- GitHub Actions kullanılmaz.
- Secret değerleri raporlara yazılmaz.
- `.env.local` local ve ignore kalır.
- Üretim deploy öncesi resmi komut `npm run release:full` veya canlı probe isteniyorsa `npm run release:prod-preflight` olur.
- `PROD_BASE_URL` tanımlı değilse canlı probe atlanır, bu durum blocked sayılmaz.

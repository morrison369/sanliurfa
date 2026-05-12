# Şanlıurfa.com — Repo Cleanup Audit (2026-05-05)

> Bu rapor agent recon ile üretildi. Hiçbir DELETE komutu çalıştırılmadı — sadece öneri.
> Şüpheli durumda KEEP.

## Özet

Repository **184 root .md** + **215 script** + **300+ governance modül** ile şişmiş durumda. Tahmini **~200 dosya safely-removable**, ~12-15 MB kazanç. Governance temizliği zaten `ops/org-governance-public-readiness` branch'inde başlamış.

| Kategori | Mevcut | Cleanup Sonrası | Kazanç |
|---|---|---|---|
| Root .md | 184 | ~64 | -120 dosya |
| `scripts/` | 215 | ~110 | -105 dosya |
| `src/lib/governance-*` | ~300 modül | 0 (org-repo) | -50% src boyutu |
| Build artifacts | dist/coverage/playwright-report | unchanged | (zaten .gitignore'da) |

## 1. Markdown Duplicate Detection

### A. DEPLOYMENT Grubu (10 dosya — Merge önerisi)

| Dosya | Aksiyon |
|---|---|
| `DEPLOYMENT.md` | **KEEP** (main) |
| `DEPLOYMENT_GUIDE.md` | MERGE → DEPLOYMENT.md |
| `CWP-DEPLOYMENT.md` | **KEEP** (CWP-specific) |
| `CWP-DEPLOYMENT-GUIDE.md` | **KEEP** (CWP detay) |
| `CWP-NODEJS-DEPLOYMENT.md` | **KEEP** (Node-specific) |
| `DEPLOY-CHECKLIST.md` | **KEEP** (master checklist) |
| `DEPLOYMENT-CHECKLIST-2026.md` | MERGE → DEPLOY-CHECKLIST.md |
| `DEPLOYMENT_CHECKLIST.md` | DELETE (duplicate underscore variant) |
| `DEPLOYMENT_COMPLETE.md` | DELETE (outdated status) |
| `DEPLOYMENT-STATUS.md` | DELETE (outdated status) |
| `POST-DEPLOYMENT.md` | DELETE (outdated, içerik TEST.md'de) |
| `POST_DEPLOYMENT_CHECKLIST.md` | DELETE (duplicate) |
| `PRODUCTION_DEPLOYMENT.md` | MERGE → DEPLOYMENT.md |
| `FINAL_DEPLOYMENT_REPORT.md` | **KEEP** (history record) |
| `DEPLOY-OPS-RUNBOOK.md` | **KEEP** (active ops runbook) |

**Net**: 7 dosya delete, 3 dosya merge.

### B. FINAL_*/COMPLETE_* (10 dosya)

| Dosya | Aksiyon |
|---|---|
| `FINAL-DEPLOY-READY.md` | DELETE (tarihsel) |
| `FINAL-FIX.md` | DELETE |
| `FINAL-DB-FIX.md` | DELETE (incident'a referans) |
| `FINAL_CHECKLIST.md` | DELETE |
| `FINAL_DEPLOYMENT_REPORT.md` | KEEP |
| `FINAL_STATUS.md` | DELETE |
| `FINAL_SUMMARY.md` | DELETE |
| `DEPLOYMENT_COMPLETE.md` | DELETE (yukarıda da var) |
| `COMPLETE_SETUP_SUMMARY.md` | ARCHIVE → docs/archive/ |
| `COMPLETE_WEBHOOK_SYSTEM.md` | KEEP (technical reference) |

### C. OPTIMIZATION_* (8 dosya)

| Dosya | Aksiyon |
|---|---|
| `OPTIMIZATION_CHECKLIST.md` | DELETE |
| `OPTIMIZATION_COMPLETION_REPORT.md` | DELETE |
| `OPTIMIZATION_FINAL_STATUS.md` | DELETE |
| `OPTIMIZATION_SUMMARY.md` | DELETE |
| `PERFORMANCE_OPTIMIZATION_GUIDE.md` | ARCHIVE |
| `PERFORMANCE_OPTIMIZATION_STATUS.md` | DELETE |
| `DATABASE-OPTIMIZATION.md` | **KEEP** (technical spec) |
| `FUTURE_OPTIMIZATION_ROADMAP.md` | **KEEP** (roadmap) |

### D. PHASE_*.md (81 dosya — Governance, 137-442)

`memory.md` "Governance phase döngüsü 2026-04-23'te durduruldu". Bu doc'lar artık aktif değil.

**Aksiyon**: ARCHIVE → `docs/archive/phases/`
```bash
mkdir -p docs/archive/phases
mv PHASE_*.md docs/archive/phases/
```
**Etki**: 81 dosya repo root'tan taşınır, root sadelik kazanır.

### E. Diğer Duplicate'ler

| Grup | Aksiyon |
|---|---|
| `API.md` + `API_REFERENCE.md` | MERGE → API.md |
| `MONITORING_AND_ALERTS_SETUP.md` + `MONITORING_SETUP.md` | MERGE |
| `WEBHOOKS.md` + `COMPLETE_WEBHOOK_SYSTEM.md` + `ADVANCED_WEBHOOKS.md` | MERGE → WEBHOOKS.md |
| `IMPLEMENTATION_STATUS.md` + `IMPLEMENTATION_SUMMARY.md` | MERGE |
| `Mekan_Katalogu.md` + `Mekan_Katalogu_2026.md` | KEEP yeni, DELETE eski |
| `PHASE_INDEX.md` | KEEP (PHASE_*.md taşındıktan sonra archive index'i olur) |

## 2. Scripts Cleanup (215 dosya)

### A. Legacy Python Deploy (~101 dosya — DELETE candidates)

Tümü `sshpass + 'CHANGE_ME_CWP_SSH_PASSWORD'` placeholder'ı içeriyor, hiçbiri npm script'lerde referans değil:

```
auto-deploy.py, build_only.py, complete_setup.py, create_vhost.py,
cwp_check.py, cwp_deploy.py
check_*.py (7 dosya)
debug_*.py (15+ dosya)
upload_*.py (10+ dosya)
test_*.py (8 dosya)
fix_*.py (5+ dosya)
update_*.py (5 dosya)
wsl-deploy.py
static_deploy.py
system_audit.py
+ ~50 diğer one-off script
```

**Aksiyon**: DELETE — gerçek SSH ops için `scripts/ssh-cmd.py` (yeni, 2026-05-05) kullanılır, eski Python deploy script'leri yer kaplıyor.

### B. Active Scripts (KEEP — 110+ dosya)

| Klasör | İçerik | Status |
|---|---|---|
| `scripts/runtime/*.mjs` | dev daemon, port cleanup, redis | KEEP |
| `scripts/ci/*.mjs` | lint, type-check, security gates | KEEP |
| `scripts/cwp-*.sh` | CWP ops infrastructure (16 dosya) | KEEP — CRITICAL |
| `scripts/content-scraper/*.ts` | image download, sync | KEEP |
| `scripts/security/*.mjs` | scan-secrets, insecure-defaults | KEEP |
| `scripts/migrations/*.mjs` | migration checks | KEEP |
| `scripts/openapi/*.ts` | OpenAPI sync, SDK gen | KEEP |
| `scripts/codemod-*.ts` | AST transformations | KEEP |
| `scripts/migrate.ts`, `seed.ts` | DB ops | KEEP |
| `scripts/backup.sh`, `restore.sh` | DB backup | KEEP |
| `scripts/snapshot-dist.sh`, `rollback-deploy.sh` | Deploy ops | KEEP |
| `scripts/cleanup-orphan-images.ts` | Active maintenance | KEEP |
| `scripts/prod-smoke-curl.sh` | k6-less smoke (yeni) | KEEP |
| `scripts/ssh-cmd.py` | SSH wrapper (yeni) | KEEP |

## 3. Config File Audit

| Config | Status |
|---|---|
| `ecosystem.config.cjs` | **KEEP** — PM2 production (kill_timeout: 10000) |
| `ecosystem.config.json` | DELETE (dosya yok zaten) ✓ |
| `astro.config.mjs` | KEEP (main) |
| `astro.config.analyze.mjs` | KEEP (bundle analyze) |
| `astro.config.static.mjs` | KEEP (static variant) |
| `.env`, `.env.example`, `.env.production*` | KEEP |
| `.env.wsl`, `.env.wsl.local` | DİKKAT — WSL geçişi var mı? Kontrol et, kullanılmıyorsa archive |

## 4. Build Artifacts (.gitignore'da zaten var)

- `dist/` 22MB — KEEP (build output)
- `coverage/` 951KB — KEEP (test coverage)
- `playwright-report/`, `test-results/` — KEEP

## 5. Governance Module Cleanup (Major)

`src/lib/governance-*`, `src/lib/policy-*`, `src/lib/trust-*` modülleri (~300 dosya):
- 137-442 phase'lerde yazıldı
- 2026-04-23'te governance döngüsü durduruldu
- Branch `ops/org-governance-public-readiness` zaten transfer hazırlığı yapıyor
- Bu modüller **Şanlıurfa şehir rehberiyle alakasız** (governance/policy/compliance enterprise modülleri)

**Aksiyon**: Org-level repo (sanliurfa-org/governance) transfer'i tamamlandıktan sonra ana repo'dan delete.
**Etki**: src/ %50 azalır, build hızlanır.

## 6. Tahmini Cleanup Komutları (DRY-RUN ÖNERİSİ)

```bash
# 1. PHASE docs archive
mkdir -p docs/archive/phases
git mv PHASE_*.md docs/archive/phases/

# 2. Markdown duplicate delete (CAREFUL — review first)
git rm DEPLOYMENT_GUIDE.md DEPLOYMENT_CHECKLIST.md DEPLOYMENT_COMPLETE.md \
       DEPLOYMENT-STATUS.md POST-DEPLOYMENT.md POST_DEPLOYMENT_CHECKLIST.md \
       FINAL-DEPLOY-READY.md FINAL-FIX.md FINAL_CHECKLIST.md FINAL_STATUS.md \
       FINAL_SUMMARY.md OPTIMIZATION_CHECKLIST.md OPTIMIZATION_COMPLETION_REPORT.md \
       OPTIMIZATION_FINAL_STATUS.md OPTIMIZATION_SUMMARY.md PERFORMANCE_OPTIMIZATION_STATUS.md

# 3. Legacy Python scripts (her birini gözden geçir)
# DRY-RUN: list candidates
ls scripts/*.py scripts/check_*.py scripts/debug_*.py scripts/upload_*.py | head -50

# Eğer onaylanırsa:
# git rm scripts/auto-deploy.py scripts/wsl-deploy.py scripts/static_deploy.py ...

# 4. Verify build hala çalışır
npm run build
```

## 7. Kritik Uyarılar

1. **PHASE_INDEX.md taşınmadan delete etme** — archive index olarak gerek
2. **CWP-*.sh dosyalarına dokunma** — production infrastructure
3. **`.env.wsl*` dosyaları — WSL kullanıyor musun, sor önce**
4. **Governance modülleri** — önce org-repo transfer'i tamamlandıktan sonra delete
5. **Backups klasörü** — çoğu repo'da değil, ama varsa **delete etme**

## 8. Tahmini Kazanç

| Item | Sayı | Boyut |
|---|---|---|
| Root .md delete | 22 | ~5KB |
| Root .md archive (PHASE_*) | 81 | repo'da kalır ama düzenli |
| Scripts delete (Python legacy) | 101 | ~95KB |
| Governance modül delete (org-repo sonrası) | ~300 | ~50% src/ |

**Toplam**: ~200 dosya kaldırılır, repo clarity ve build hızı artar.

---

**Source**: agent recon + ls/grep tarama + npm script audit + docs/MVP_BITIRME_MODU.md
**Generated**: 2026-05-05
**Disclaimer**: Hiçbir DELETE komutu çalıştırılmadı. Tüm öneriler güvenlik-birinci yaklaşımla.

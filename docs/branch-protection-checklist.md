# Branch Protection Checklist

`master` dalinda asgari zorunlu kontroller:

1. PR uzerinden merge zorunlulugu
2. Force-push yasagi
3. Branch deletion yasagi
4. Conversation resolution zorunlulugu
5. Squash-only merge
6. Review zorunlulugu tek kisilik org icin kapali; ikinci collaborator eklenince tekrar 1 approval + CODEOWNERS review acilacak
7. Required status check zorunlulugu GitHub Actions billing/runner kuyrugu cozulene kadar kapali
8. `npm run security:scan-secrets` PR icinde ve localde calistirilir
9. `npm run security:public-readiness` public yapmadan once temiz olmasi gerekir

## Team Plan Notu

2026-04-21 itibariyle GitHub API bu repo icin branch protection ve ruleset endpointlerinde hala su 403 cevabini donduruyor:

```text
Upgrade to GitHub Pro or make this repository public to enable this feature.
```

Team uyeligi satin alindiysa bu repo Team organizasyonu altinda degilse veya plan henuz bu owner icin aktiflesmediyse branch protection uygulanamaz. Public yapmak cozum gibi gorunse de git gecmisindeki `deploy_key` ve eski credential izleri temizlenmeden repo public yapilmayacak.

Hazir uygulama komutu:

```powershell
.\scripts\github\set-branch-protection.ps1 -Owner morrison369 -Repo sanliurfa -Branch master
```

## Workflow Standards Gate Kapsami

`npm run workflow:standards:verify` kontrolu tum `.github/workflows/*` dosyalarinda su kurallari zorunlu tutar:

1. `concurrency` tanimi
2. `permissions` tanimi
3. En az bir `timeout-minutes`
4. En az bir `npm run workflow:standards:verify` adimi
5. Standalone `workflow:standards:gate` / `workflow:standards:report` adimlari kullanilmamali
6. `docs/workflow-standards-report.md` artifact yolunun yuklenmesi
7. Workflow standards report artifact adinin `workflow-standards-report-${{ github.job }}` formatinda olmasi
8. En az bir `npm run dev:isolated:check-no-orphan` adimi
9. `npx playwright test` kullanimi yasak (yerine `npm run test:e2e:clean`)
10. `actions/upload-artifact` ve `actions/download-artifact` icin `@v4` zorunlu (`@v3` yasak)
11. `actions/cache` icin `@v4` zorunlu (`@v3` yasak)
12. `actions/setup-node@v4` kullaniliyorsa Node surumu 22'ye pinli olmali (`node-version: '22'` veya `env.NODE_VERSION='22'`)

Rapor uretimi:

```bash
npm run workflow:standards:report
```

CI, bu raporu `workflow-standards-report-${{ github.job }}` formatinda artifact olarak yukler.

Hizli otomatik duzeltme:

```bash
# Sadece kontrol et (degisiklik yazmaz)
npm run workflow:standards:autofix:check

# Uygula
npm run workflow:standards:autofix
```

Not: `workflow:standards:autofix:check` drift bulursa non-zero exit code ile fail eder.

Tek komutla dogrulama (onerilen):

```bash
npm run workflow:standards:verify
```

## GitHub CLI Ornegi
```bash
gh api \
  -X PUT \
  repos/morrison369/sanliurfa/branches/master/protection \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts[]="API Contract Gate" \
  -f required_status_checks.contexts[]="CI/CD Pipeline" \
  -f required_status_checks.contexts[]="Workflow Standards" \
  -f required_status_checks.contexts[]="CI/CD Pipeline / Workflow standards verify" \
  -f enforce_admins=true \
  -f required_pull_request_reviews.required_approving_review_count=1 \
  -f restrictions=
```

Not: Bu ayar repository admin yetkisi gerektirir.

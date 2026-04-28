# Branch Protection Checklist

`master` dalinda GitHub Actions zorunlu status check olarak kullanilmaz.

## Zorunlu Yerel Gate'ler

Merge veya deploy oncesi asgari yerel kontroller:

1. `npm run gate:done`
2. `npm audit --audit-level=moderate`
3. `npm run security:public-readiness`
4. `npm run release:local-gate:summary`

## Branch Kurallari

1. Force-push `master` icin kapali kalir.
2. En az 1 review tercih edilir.
3. GitHub Actions workflow dosyasi eklenmez.
4. Secret, `.env`, deploy key veya canli credential tracked dosyaya girmez.
5. Required status check olarak GitHub Actions job'u tanimlanmaz; gate kaniti PR aciklamasinda veya `docs/local-gate-summary.md` icinde tutulur.

## Not

Eski workflow standards gate modeli kaldirildi. `.github/workflows` dizini bos veya yok
olmalidir; kontroller yerelde calistirilir ve sonuc PR/operasyon notuna yazilir.

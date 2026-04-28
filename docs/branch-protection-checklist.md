# Branch Protection Checklist

`master` dalinda GitHub Actions zorunlu status check olarak kullanilmaz.

## Zorunlu Yerel Gate'ler

Merge veya deploy oncesi asgari yerel kontroller:

1. `npm run type-check`
2. `npm run lint`
3. `npm run security:scan-secrets`
4. `npm run security:defaults:gate`
5. `npm run security:public-readiness`
6. `npm run public:city:gate:build`
7. `npm audit --audit-level=moderate`

## Branch Kurallari

1. Force-push `master` icin kapali kalir.
2. En az 1 review tercih edilir.
3. GitHub Actions workflow dosyasi eklenmez.
4. Secret, `.env`, deploy key veya canli credential tracked dosyaya girmez.

## Not

Eski workflow standards gate modeli kaldirildi. `.github/workflows` dizini bos veya yok
olmalidir; kontroller yerelde calistirilir ve sonuc PR/operasyon notuna yazilir.

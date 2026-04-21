# GitHub Public Release Blockers

Son guncelleme: 2026-04-21

Bu repo public yapilmadan once asagidaki kapilar kapanmadan GitHub gorunurlugu degistirilmeyecek.

## Zorunlu Kapilar

1. Mevcut agacta canli secret bulunmayacak.
   - `npm run security:scan-secrets` basarili olacak.
   - `.env.production` sadece placeholder degerler icerecek.
   - Deploy/fix scriptleri hardcoded SSH, DB, Stripe, SMTP veya API secret icermeyecek.

2. Git gecmisi public icin temizlenecek veya tum eski secretlar rotate edilecek.
   - Gecmiste `deploy_key` ve eski production credential izleri bulundugu icin sadece mevcut dosyalari temizlemek yeterli degildir.
   - Public yapmadan once DB sifresi, SSH sifresi, Stripe webhook/secret, SMTP sifresi ve varsa image API secretlari yenilenmelidir.

3. GitHub Actions calisir durumda olacak.
   - `public-city-gate.yml` repo public olduktan sonra branch protection icin kullanilacak.
   - Mevcut GitHub billing/spending limit problemi cozulmeden CI sonucu guvenilir sekilde alinamaz.

4. Public readiness gate basarili olacak.
   - `npm run security:public-readiness` public yapmadan once calistirilir.
   - Bu gate mevcut agacta secret taramasi yapar, `.env.production` / `deploy_key` gibi forbidden tracked dosyalari kontrol eder ve bilinen secret izleri icin git gecmisini conservative sekilde bloklar.

## Public Yapma Komutu

Sadece yukaridaki kapilar tamamlandiktan sonra calistirilacak:

```bash
gh repo edit morrison369/sanliurfa --visibility public --accept-visibility-change-consequences
```

## Kilit Kural

Repo public yapma islemi, secret temizligi ve credential rotation tamamlanmadan yapilmaz. Public gorunurluk geri alinsa bile GitHub gecmisi ve fork/cache kopyalari nedeniyle sizinti kalici kabul edilir.

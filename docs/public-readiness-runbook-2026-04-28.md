# Public Readiness Runbook - 2026-04-28

Bu runbook repo public visibility oncesi credential/deploy key blocker'larini kapatmak icin uygulanacak kontrollu operasyon planidir.

## Mevcut Durum

`npm run security:public-readiness` sonucu BLOCKED:

- Git history icinde `deploy_key` gecmisi var.
- Git history icinde eski credential literal'lari var.

Bu durum aktif working tree'de high-risk secret oldugu anlamina gelmez; `security:scan-secrets` temizdir. Blocker git history ve public visibility riskidir.

## Degismez Kurallar

- Public visibility acilmadan once credential rotation tamamlanmali.
- History cleanup onaysiz yapilmamali.
- `git filter-repo`, BFG, force-push veya branch rewrite islemleri planli bakim penceresinde yapilmali.
- Eski credential'lar rotate edilmeden sadece history temizlemek yeterli degildir.
- Temizlikten sonra tum developer/CI/deploy ortamlarinda yeni credential'lar dogrulanmalidir.

## Faz 1 - Envanter

1. Public readiness gate ciktisindeki siniflari kaydet:
   - `deploy_key`
   - eski credential literal'lari
2. Credential sahipligini belirle:
   - deploy key hangi host/CI/deploy kullanicisina ait
   - eski literal hangi servis veya entegrasyona ait
3. Etki alanini belirle:
   - GitHub deploy key
   - hosting/Plesk/CWP key
   - CI secret
   - third-party API key
   - local-only eski test secret

## Faz 2 - Rotation

1. Yeni key/secret uret.
2. Yeni secret'i sadece guvenli secret store'a ekle:
   - GitHub repository/environment secrets kullanılacaksa manuel operasyonla doğrulanır; Actions workflow'u kullanılmaz
   - hosting env paneli
   - deployment secret manager
3. Uygulama ve deploy akisini yeni credential ile smoke et.
4. Eski key/secret'i provider tarafinda revoke et.
5. Revoke islemini belgeye tarih/sahip bilgisiyle isle.

## Faz 3 - History Cleanup

Bu faz destructive/history rewrite riski tasir; acik onay ve bakim penceresi olmadan uygulanmaz.

Onerilen yaklasim:

1. Tum ekip push islemlerini durdurur.
2. Repo yedegi alinir.
3. History temizligi `git filter-repo` veya BFG ile sadece hedef secret pattern/path uzerinden yapilir.
4. Temizlik sonrasi secret scan tekrar calistirilir.
5. Remote branch force-push yapilir.
6. Tum developer local clone'lari yeniden klonlanir veya guvenli rebase talimati izlenir.

## Faz 4 - Gate Kapanisi

Sira ile calistirilacak komutlar:

```bash
npm run security:scan-secrets
npm run security:defaults:gate
npm run security:public-readiness
npm run quality:metrics
npm run gate:done
```

Beklenen sonuc:

- `security:scan-secrets`: pass
- `security:defaults:gate`: pass
- `security:public-readiness`: pass
- `quality:metrics`: pass
- `gate:done`: pass

## Faz 5 - Public Visibility

Sadece tum gate'ler pass olduktan sonra:

```bash
gh repo edit morrison369/sanliurfa --visibility public --accept-visibility-change-consequences
```

Bu komut public visibility degisikligi yaptigi icin manuel onayla calistirilmalidir.

## Rollback / Acil Durum

- Yanlis credential public olduysa provider tarafinda derhal revoke edilir.
- Deploy key leak durumunda ilgili key silinir ve yeni key rotate edilir.
- History rewrite sonrasi CI/deploy bozulursa yeni secret/env tanimlari kontrol edilir.
- Ekip clone'larinda uyumsuz history varsa yeniden clone zorunlu tutulur.

# Place SLA Backlog Runbook - 2026-04-28

Bu runbook place submission/moderasyon SLA backlog'unu kod degisikligi yapmadan operasyonel olarak kapatmak icin kullanilir.

## Son Olcum

`npm run jobs:places:sla-alert` sonucu:

- `slaHours`: 48
- `cooldownHours`: 24
- `pending_count`: 0
- `needs_info_count`: 0
- `pending_breached_count`: 0
- `breachedCount`: 0
- `alertedCount`: 0

## Yorum

Bu teknik gate blocker degildir. Job basarili calisir; backlog su an temizdir.

`alertedCount=0` su an yeni alarm uretilmedigini gosterir. Bunun olasi nedenleri:

- cooldown state aktif
- ayni breached kayitlar daha once islenmis
- notification policy alarm uretimini sinirliyor

## Temizleme Sirasi

1. Admin moderation panelinde `pending` ve `breached` kayitlari filtrele.
2. Onceligi SLA ihlalli kayitlara ver:
   - `pending_breached_count`
   - en eski submission
   - kritik kategori veya isletme talepleri
3. Her kayit icin karar ver:
   - approve/active
   - reject
   - needs_info
4. `needs_info` gerekiyorsa eksik bilgi nedeni net yazilmali.
5. Toplu karar sonrasi job tekrar calistirilmali.

## Dogrulama Komutlari

```bash
npm run jobs:places:sla-alert
npm run release:readiness:report
npm run quality:metrics
```

Basari kriteri:

- `pending_breached_count` kademeli olarak azalir.
- `breachedCount` 0'a iner veya operasyonel kabul sinirina duser.
- `alertedCount` beklenen notification policy ile tutarli olur.

## Operasyonel Hedef

Ilk hedef tamamlandi:

- `breachedCount`: 0
- `pending_breached_count`: 0

Minimum kabul:

- `breachedCount`: 0
- yeni breached kayit uretmeyen moderator SLA ritmi

## Not

Bu backlog'u SQL ile toplu kapatmak onerilmez. Her place submission is karari, veri kalitesi ve audit izi gerektirir.

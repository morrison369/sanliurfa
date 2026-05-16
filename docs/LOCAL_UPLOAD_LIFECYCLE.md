# Local Upload Lifecycle

Bu proje medya icin CDN, S3, R2 veya object storage kullanmaz. Kanonik model `public/uploads` ve `public/images` altinda local filesystem depolamadir.

## Durumlar

| Durum | Anlam | Aksiyon |
|---|---|---|
| active | Kaynak kodda veya DB'de referansi var | Korunur |
| observed | Referans bulunamadi ama yeni/yakin tarihli veya sahipligi belirsiz | 14-30 gun gozlemde tutulur |
| archive_candidate | Referanssiz, bucket sahibi net, gozlem suresi tamamlanmis | Manuel arsiv kararina alinir |
| deletable | Sahiplik, DB, kaynak ve route kontrolleri tamamlanmis | Manuel silme PR'i ile kaldirilir |

## Gate Kurallari

- `npm run images:uploads:parity` release oncesi calismalidir.
- `npm run images:uploads:classify` parity raporundan observed/archive/delete-review kuyruğu üretmelidir.
- Missing referenced file sayisi `0` olmalidir.
- Unreferenced candidate dosyalar otomatik silinmez.
- Kota esikleri varsayilan olarak advisory `%70`, review `%85`, blocker `%95` seviyesindedir.
- Bucket ownership `docs/local-upload-parity-report.json` icindeki `ownershipModel` alanindan takip edilir.
- Candidate lifecycle `docs/local-upload-candidate-classification.json` icinden takip edilir.
- Candidate yas hesabi `docs/local-upload-candidate-state.json` icindeki `firstSeenAt` alanindan yapilir; mtime sadece yardimci sinyaldir.
- Archive PR kuyruğu `docs/local-upload-archive-candidates.json` icinden takip edilir; bu rapor da dosya silmez.
- Admin panel tarafinda `/api/admin/site/media-health` local parity/quota ozetini dondurur.

## Manuel Arsiv Karari

Bir dosya ancak su kontrollerden sonra arsiv/silme adayidir:

- Kaynak kodda `/uploads/...` referansi yok.
- DB text/json alanlarinda referans yok.
- OG image, schema image, sitemap veya RSS yuzeyinde kullanilmiyor.
- Bucket sahibi veya icerik sahibi tarafindan aktif kullanim yok.
- Geri alma plani var.

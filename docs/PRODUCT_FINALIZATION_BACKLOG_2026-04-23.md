# Product Finalization Backlog (2026-04-23)

Bu dosya proje kapanışını P0/P1/P2 olarak kilitler. Amaç yeni phase üretmek değil, canlı ürün tamamlanmasını bitirmektir.

## P0 (Yayın Zorunlu)
- [x] Release Definition of Done oluşturuldu.
- [x] Canlı kabul checklist’i oluşturuldu.
- [x] Port/profil kilidi (`4321`) kontrat seviyesinde aktif.
- [x] Admin-driven ana sayfa kontratı aktif.
- [x] Ana sayfa tek-kaynak veri akışı (`src/lib/homepage-data.ts`) aktif.
- [x] SEO şablon kontratı aktif.
- [x] Türkçe/UTF-8 kalite kontratı aktif.
- [x] Görsel slug adlandırma kontratı aktif.
- [x] Auth + sosyal capability yüzeyi kontratla doğrulanıyor.
- [x] Secret rotasyon runbook + env placeholder kontratı aktif.
- [x] Phase mutasyonları release modunda kilitli.

## P1 (İlk Sprint)
- [ ] Sosyal moderasyon metriklerini admin dashboard’da tek panelde birleştir.
- [x] Mekan içerik kalite eşiği (minimum alan) onaysız yayın engeli.
- [ ] Arama sıralama ağırlıkları için ilçe/kategori/popülerlik iyileştirme.
- [ ] Mobil performans (CWV) alarm eşikleri ve takip paneli.

## P2 (Olgunlaştırma)
- [ ] Premium/üyelik flag bazlı rollout (varsayılan kapalı).
- [ ] İşletme paneli kampanya/yanıt akışları güçlendirme.
- [ ] Operasyon panosu: hata + içerik + SEO + sosyal risk birleşik görünüm.

## Batch Komutları
- P0 kapanış: `npm run ops:p0:batch`
- P1 kalite tekrar: `npm run ops:p1:batch`
- P2 release doğrulama: `npm run ops:p2:batch`

## Not
- `ops:smoke:social:optional` komutu varsayılan olarak skip eder.
- Gerçek sosyal smoke için: `RUN_SOCIAL_SMOKE=true npm run ops:p0:batch`

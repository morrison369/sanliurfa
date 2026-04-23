# Live Acceptance Checklist

Yayın öncesi canlı kabul testi aşağıdaki sırayla yürütülür.

## A) Ziyaretçi Akışı
- [ ] Ana sayfa 200 döner, hero + şehir servisleri görünür.
- [ ] Mekan listesi ve detay sayfası açılır.
- [ ] Etkinlik ve blog detay sayfaları açılır.
- [ ] Breadcrumb ve canonical doğru üretilir.

## B) Üye Akışı
- [ ] Kayıt ve giriş başarılı.
- [ ] Profil sayfası açılır.
- [ ] Takip/mesaj/eşleşme API uçları hata üretmeden cevap verir.
- [ ] Mekana yorum/puan gönderimi başarılı.

## C) İşletme ve İçerik Akışı
- [ ] Mekan başvuru/güncelleme uçları yanıt verir.
- [ ] Görsel yolları slug kurallarına uygundur.
- [ ] Eksik görsel fallback’leri doğru çalışır.

## D) Admin Akışı
- [ ] Site içerik ayarları ekranları açılır.
- [ ] Ana sayfa section sırası güncellenebilir.
- [ ] Şehir servisleri (nöbetçi eczane, otobüs, uçak) admin ayarıyla yönetilir.
- [ ] Moderasyon ve sosyal olay ekranları erişilebilir.

## E) Teknik Gate
- [ ] `npm run release:ship` yeşil.
- [ ] Build artifaktı üretildi.
- [ ] Port kilidi 4321 ihlali yok.
- [ ] Runtime loglarında tekrar eden kritik hata gürültüsü yok.

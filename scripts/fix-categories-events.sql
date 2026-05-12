-- Kategorisiz mekanları düzelt (kategori ID'leri: yeme-icme=1, konaklama=40, saglik=52, ulasim=109, alisveris=139, turizm=224, resmi-kurumlar=90, tarim=316)

-- Turizm: Tekne turları, seyahat acenteleri
UPDATE app.places SET category_id = 224 WHERE id IN (
  '21590bd3-1cb7-4e05-9dc2-def801ee30cc', -- HALFETİ KOÇAK TEKNE TURU
  '761344ba-540d-4067-ae54-8a8f9d554aa5', -- Halfeti Rumkale Tekne Turları
  '8b6db030-0073-481e-8a49-2b5088cac529', -- Halfeti Rum Kale Uygun Fiyata Tekne Turu
  '54f1821f-7399-49f5-85fa-9a5b91c1fa6d', -- Halfeti Siyah Gül Tekne Turları
  'b05bd808-6236-4590-aead-c59618424717', -- Rumkale Halfeti Teknede Evlilik Teklifi
  'bd74f8e1-a540-463e-af78-b307709fca90', -- ŞANLIURFA GEZİ DURAĞI
  '0cd8264a-20f0-44da-a91c-d14d91238b48', -- Çetiner Turizm Acentesi
  '5cbbb1b6-2239-4fc9-84d7-0e065fadf11c', -- GÜMÜŞOLUK TURİZM HAC-UMRE
  '059951b5-b1d8-408a-955c-ccce9958e7d2', -- Nevali Turizm Seyahat Acentası
  '34d3fd83-9ef5-491b-bcfe-3113be5a0faa', -- Mitratur Şanlıurfa
  '66251420-26ed-4503-a0aa-ce6a1c8a3740'  -- Seba travel
) AND category_id IS NULL;

-- Alışveriş: AVM'ler, çarşılar
UPDATE app.places SET category_id = 139 WHERE id IN (
  '83a9d7cd-1d3f-4f1b-98e2-865cba46d194', -- Avm Merkezi
  'f33d1cfd-eacf-48aa-a57e-5a72a6a08a7a', -- Bakırcılar Çarşısı
  'bff80ae6-3578-4332-8ad1-ce226604a086', -- BONEGA
  'ab82d2b0-e308-4b2d-929d-5bccf5b895ad', -- Mozaik Avm
  'e5933f7a-fa0e-4ca3-b6f5-f73c5c206952', -- Novada Park Şanlıurfa Alışveriş Merkezi
  'b4a84d06-46a6-4591-8538-a87bcbace20c', -- Piazza Şanlıurfa
  '29f070a7-8e8c-4203-8104-dcb2f49da431'  -- Piazza Şanlıurfa AVM
) AND category_id IS NULL;

-- Resmi Kurumlar: belediyeler, sınır kapısı
UPDATE app.places SET category_id = 90 WHERE id IN (
  'a08b0dab-813f-47b3-ab4e-665a843d175c', -- Akçakale Belediyesi
  '98daa939-c361-4419-b46c-dfe39b2b9ddc', -- Akçakale Sınır Kapısı
  '6754d8ff-e5af-4aff-961f-a28f8986b87b', -- Ceylanpınar Belediyesi
  '196dc50b-2590-4c78-ae9e-5767a6ee8431'  -- Afat Turizm (ulaşım firması olabilir ama Karşıyaka'da)
) AND category_id IS NULL;

-- Ulaşım
UPDATE app.places SET category_id = 109 WHERE id IN (
  '465e6b17-ee7f-4d76-a113-1a239f00719c'  -- URFA METRO
) AND category_id IS NULL;

-- Tarım ve Hayvancılık
UPDATE app.places SET category_id = 316 WHERE id IN (
  '2fb45169-9f80-42c8-82c0-31430041a1c7'  -- Ceylanpınar GAP Tarım İşletmesi
) AND category_id IS NULL;

-- Hizmetler (kalan kategorisizler: Google Haritalar vb.)
UPDATE app.places SET category_id = 181 WHERE category_id IS NULL AND status = 'active';

-- Kontrol
SELECT COUNT(*) as hala_kategorisiz FROM app.places WHERE status = 'active' AND category_id IS NULL;

-- Etkinlik görsellerini düzelt
UPDATE app.events SET image_url = '/images/places/gobeklitepe.jpg'
WHERE slug IN ('uluslararasi-gobeklitepe-kultur-sanat-festivali-2026', 'gobeklitepe-yaz-aksami-ziyareti-2026')
  AND (image_url IS NULL OR image_url = '');

UPDATE app.events SET image_url = '/images/places/balikligol.jpg'
WHERE slug IN ('sanliurfa-ramazan-etkinlikleri-2026', 'geleneksel-sanliurfa-sira-gecesi-temmuz-2026',
               'muzeler-gecesi-sanliurfa-2026', 'sanliurfa-fotograf-gunleri-2026',
               'uluslararasi-sanliurfa-kultur-yolculugu-2026')
  AND (image_url IS NULL OR image_url = '');

UPDATE app.events SET image_url = '/images/etkinlikler/sanliurfa-kultur-festivali.jpg'
WHERE slug IN ('sanliurfa-gastronomi-festivali-2026', 'sonbahar-isot-hasati-etkinligi-2026')
  AND (image_url IS NULL OR image_url = '');

UPDATE app.events SET image_url = '/images/historical/gobeklitepe.jpg'
WHERE slug = 'harran-tarih-ve-kultur-festivali-2026'
  AND (image_url IS NULL OR image_url = '');

UPDATE app.events SET image_url = '/images/places/balikligol.jpg'
WHERE slug IN ('halfeti-tekne-turu-ve-doga-festivali-2026')
  AND (image_url IS NULL OR image_url = '');

-- Kontrol
SELECT COUNT(*) as events_no_image FROM app.events WHERE status = 'active' AND (image_url IS NULL OR image_url = '');

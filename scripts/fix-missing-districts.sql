-- Fix district_id for 72 places using explicit slug assignments

-- EYYÜBIYE (id=1): tarihi merkez, sanayi bölgesi, otogar çevresi
UPDATE places SET district_id = 1
WHERE district_id IS NULL AND slug IN (
  'abide-hotel-sanliurfa', 'balikligol-hotel', 'edessa-butik-otel',
  'eyup-sultan-camii-sanliurfa', 'gap-organize-sanayi-bolgesi',
  'gap-tarim-urunleri-merkezi', 'lastik-dunyasi-sanliurfa',
  'mehmet-arap-medresesi', 'oto-ekspres-sanliurfa', 'ramotel-sanliurfa',
  'sanliurfa-anadolu-imam-hatip-lisesi',
  'sanliurfa-buyuksehir-belediyesi-hizmet-binasi',
  'sanliurfa-hayvanat-bahcesi', 'sanliurfa-hayvan-pazari',
  'sanliurfa-olimpik-yuzme-havuzu', 'sanliurfa-osb-insaat',
  'sanliurfa-sehirlerarasi-otobus-terminali', 'sanliurfa-sehir-stadyumu',
  'sanliurfa-tcdd-gari', 'sanliurfa-toyota-galerisi',
  'sanliurfa-un-fabrikasi', 'tas-han-butik-otel',
  'urfa-buyuk-otel', 'urfa-hal-sebze-meyve-pazari',
  'urfa-nakliyat-sanliurfa', 'urfa-tekstil-fabrikasi'
);

-- HALİLİYE (id=2): yenişehir, bediüzzaman, sarayönü, eski şehir, kapalıçarşı
UPDATE places SET district_id = 2
WHERE district_id IS NULL AND slug IN (
  'altin-carsisi-sanliurfa', 'ataturk-parki-botanik-bahcesi',
  'av-mehmet-kaya-hukuk-burosu', 'bakırcilar-carsisi-sanliurfa',
  'balikligol-mini-golf-eglence-parki', 'cengiz-emlak-sanliurfa',
  'dovus-sporlari-akademisi-sanliurfa', 'garanti-bbva-sanliurfa',
  'grand-urfa-hotel', 'guneydogu-veteriner-klinigi',
  'halilurrahman-camii', 'harran-ingilizce-dil-kursu',
  'harran-tv-sanliurfa', 'hz-ibrahim-makam-sanliurfa',
  'klima-teknik-sanliurfa', 'mega-fitness-sanliurfa',
  'ozel-sanliurfa-medikal-park', 'piazza-sanliurfa-avm',
  'piazza-sinema-sanliurfa', 'remax-sanliurfa',
  'sanliurfa-gazetesi', 'sanliurfa-il-halk-kutuphanesi',
  'sanliurfa-kapalicarsi', 'sanliurfa-kultur-sanat-merkezi',
  'sanliurfa-ptt-basmudurluğu', 'sanliurfa-sehir-tiyatrosu',
  'sanliurfa-teknoloji-carsisi', 'sanliurfa-temizlik-hizmetleri',
  'sanliurfa-tursab-btu', 'seyh-omer-turbesi',
  'sira-gecesi-kultur-evi', 'ulu-cami-rizvaniye',
  'urfa-apart-otel', 'urfa-cocuk-bilim-muzesi',
  'urfa-evi-kultur-mekani', 'urfa-fm-radyosu',
  'urfa-hali-kilim-carsisi', 'ziraat-bankasi-sanliurfa-merkez'
);

-- KARAKÖPRÜ (id=3): havalimanı, üniversite, göbeklitepe çevresi
UPDATE places SET district_id = 3
WHERE district_id IS NULL AND slug IN (
  'gap-havalimani-sanliurfa', 'gobeklitepe-panorama-bungalov',
  'harran-universitesi-tip-hastanesi', 'sanliurfa-egitim-arastirma-hastanesi',
  'zeugma-pansiyon'
);

-- BİRECİK (id=7)
UPDATE places SET district_id = 7
WHERE district_id IS NULL AND slug IN ('birecik-devlet-hastanesi');

-- HİLVAN (id=10)
UPDATE places SET district_id = 10
WHERE district_id IS NULL AND slug IN ('hilvan-ilce-devlet-hastanesi');

-- HARRAN (id=13)
UPDATE places SET district_id = 13
WHERE district_id IS NULL AND slug IN ('harran-cocuk-kultur-merkezi');

-- Fallback: any still-unassigned → Eyyübiye
UPDATE places SET district_id = 1
WHERE district_id IS NULL AND status = 'active';

SELECT d.name AS district, COUNT(p.id) AS place_count
FROM places p
JOIN districts d ON p.district_id = d.id
WHERE p.status = 'active'
GROUP BY d.name ORDER BY d.name;

SELECT COUNT(*) AS remaining_no_district FROM places WHERE district_id IS NULL AND status='active';

-- Emlak + Ev ve Yaşam + Hukuk ve Finans + İş Dünyası + Medya + Otomotiv + Tarım
-- 7 kategori × 3-4 mekan = ~25 yeni mekan

-- ── Emlak ──────────────────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'RE/MAX Şanlıurfa', 'remax-sanliurfa',
 'Uluslararası RE/MAX ağına bağlı Şanlıurfa franchisee ofisi. Satılık konut, arsa ve ticari gayrimenkul portföyüyle şehrin en kapsamlı emlak danışmanlık hizmetlerinden birini sunmaktadır.',
 'Yenişehir Mahallesi, Bediüzzaman Bulvarı No:45, Haliliye, Şanlıurfa', '0414 316 5050',
 37.1651, 38.7980,
 (SELECT id FROM categories WHERE name='Emlak ofisleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/remax-sanliurfa.jpg', 4.3, 0),

(gen_random_uuid(), 'Cengiz Emlak Şanlıurfa', 'cengiz-emlak-sanliurfa',
 '20 yılı aşkın deneyimiyle Şanlıurfa''nın köklü emlak ofislerinden biri. Şehir merkezi ve yeni gelişme alanlarında satılık ve kiralık daire ile arsa portföyüne sahiptir.',
 'Sarayönü Caddesi No:12, Haliliye, Şanlıurfa', '0414 215 9090',
 37.1610, 38.7945,
 (SELECT id FROM categories WHERE name='Emlak ofisleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/cengiz-emlak-sanliurfa.jpg', 4.1, 0),

(gen_random_uuid(), 'Şanlıurfa Organize Sanayi İnşaat', 'sanliurfa-osb-insaat',
 'GAP Organize Sanayi Bölgesi çevresinde sanayi, lojistik ve konut alanlarında altyapı projeleri yürüten önde gelen müteahhitlik firması. Endüstriyel ve ticari yapı ihalelerinde etkin.',
 'OSB Bölgesi, Eyyübiye, Şanlıurfa', '0414 318 2200',
 37.1780, 38.8120,
 (SELECT id FROM categories WHERE name='Müteahhitler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-osb-insaat.jpg', 4.0, 0)

ON CONFLICT (slug) DO NOTHING;

-- ── Ev ve Yaşam ─────────────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Urfa Nakliyat', 'urfa-nakliyat-sanliurfa',
 'Ev, ofis ve fabrika taşımacılığında 15 yıllık tecrübesiyle Şanlıurfa''nın güvenilir nakliyat firmalarından biri. Sigortalı taşıma, ambalajlama ve asansör hizmeti sunmaktadır.',
 'Sanayi Mahallesi, Şanlıurfa', '0414 313 7700',
 37.1700, 38.8040,
 (SELECT id FROM categories WHERE name='Nakliyat firmaları' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/urfa-nakliyat-sanliurfa.jpg', 4.0, 0),

(gen_random_uuid(), 'Şanlıurfa Temizlik Hizmetleri', 'sanliurfa-temizlik-hizmetleri',
 'Ev, ofis, inşaat sonrası ve fabrika temizlikleri yapan profesyonel temizlik şirketi. Günlük, haftalık ve aylık abonelik paketleri mevcuttur. Belgelenmiş ürün ve eğitimli personel.',
 'Haliliye, Şanlıurfa', '0414 215 8800',
 37.1635, 38.7960,
 (SELECT id FROM categories WHERE name='Temizlik firmaları' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-temizlik-hizmetleri.jpg', 4.2, 0),

(gen_random_uuid(), 'Klima Teknik Şanlıurfa', 'klima-teknik-sanliurfa',
 'Daikin, Mitsubishi, Bosch ve Arçelik klimaların satış, kurulum ve bakım servisi. Split, multi-split ve VRF sistemlerinde uzmanlaşmış teknisyen kadrosu. Şanlıurfa''nın her ilçesine servis.',
 'Yenişehir, Şanlıurfa', '0414 316 4300',
 37.1648, 38.7975,
 (SELECT id FROM categories WHERE name='Klima servisleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/klima-teknik-sanliurfa.jpg', 4.3, 0)

ON CONFLICT (slug) DO NOTHING;

-- ── Hukuk ve Finans ──────────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Ziraat Bankası Şanlıurfa Merkez Şubesi', 'ziraat-bankasi-sanliurfa-merkez',
 'Türkiye Cumhuriyeti Ziraat Bankası Şanlıurfa Merkez Şubesi. Tarımsal krediler, esnaf destek paketleri ve bireysel bankacılık hizmetleri sunan şehrin en köklü bankacılık noktalarından biri.',
 'Atatürk Bulvarı No:5, Haliliye, Şanlıurfa', '0414 215 1000',
 37.1622, 38.7955,
 (SELECT id FROM categories WHERE name='Banka şubeleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/ziraat-bankasi-sanliurfa-merkez.jpg', 4.2, 0),

(gen_random_uuid(), 'Garanti BBVA Şanlıurfa Şubesi', 'garanti-bbva-sanliurfa',
 'Garanti BBVA Şanlıurfa şubesi; bireysel bankacılık, işletme kredileri, mortgage ve yatırım hizmetleri sunmaktadır. ATM ve şube içi işlem gişeleri haftanın 6 günü açıktır.',
 'Bediüzzaman Bulvarı No:22, Haliliye, Şanlıurfa', '0414 316 2200',
 37.1649, 38.7982,
 (SELECT id FROM categories WHERE name='Banka şubeleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/garanti-bbva-sanliurfa.jpg', 4.1, 0),

(gen_random_uuid(), 'Av. Mehmet Kaya Hukuk Bürosu', 'av-mehmet-kaya-hukuk-burosu',
 'Ticaret hukuku, ceza hukuku ve aile hukuku alanlarında uzmanlaşmış Şanlıurfa barosuna kayıtlı hukuk bürosu. Dava takibi, sözleşme hazırlama ve arabuluculuk hizmetleri sunulmaktadır.',
 'Adliye Yanı, Haliliye, Şanlıurfa', '0414 215 6600',
 37.1605, 38.7938,
 (SELECT id FROM categories WHERE name='Hukuk büroları' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/av-mehmet-kaya-hukuk-burosu.jpg', 4.4, 0)

ON CONFLICT (slug) DO NOTHING;

-- ── İş Dünyası ve Sanayi ────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'GAP Organize Sanayi Bölgesi', 'gap-organize-sanayi-bolgesi',
 'Şanlıurfa Organize Sanayi Bölgesi, 200''den fazla fabrikanın yer aldığı ve bölge ekonomisine önemli katkı sağlayan sanayi kompleksidir. Tekstil, gıda, inşaat malzemeleri ve makine sektörlerinden firmalar faaliyet göstermektedir.',
 'OSB Bölgesi, Eyyübiye, Şanlıurfa', '0414 318 5000',
 37.1800, 38.8150,
 (SELECT id FROM categories WHERE name='Organize sanayi bölgeleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/gap-organize-sanayi-bolgesi.jpg', 4.3, 0),

(gen_random_uuid(), 'Urfa Tekstil Fabrikası', 'urfa-tekstil-fabrikasi',
 'Pamuk ipliği, dokuma kumaş ve hazır giyim üretiminde faaliyet gösteren bölge tekstil firması. OSB içinde kurulu modern tesisiyle yurt içi ve yurt dışı pazarlara ürün tedarik etmektedir.',
 'OSB 3. Cadde, Eyyübiye, Şanlıurfa', '0414 318 5500',
 37.1805, 38.8160,
 (SELECT id FROM categories WHERE name='Tekstil üreticileri' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/urfa-tekstil-fabrikasi.jpg', 4.0, 0),

(gen_random_uuid(), 'Şanlıurfa Un Fabrikası', 'sanliurfa-un-fabrikasi',
 'Güneydoğu Anadolu''nun buğday havzasındaki konumunu değerlendirerek yüksek kaliteli un, irmik ve kepek ürünleri üreten yerel gıda işleme tesisi. Bölge fırınlarına ve süpermarketlere toplu tedarik yapmaktadır.',
 'Sanayi Mahallesi, Eyyübiye, Şanlıurfa', '0414 313 9900',
 37.1790, 38.8100,
 (SELECT id FROM categories WHERE name='Gıda üreticileri' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-un-fabrikasi.jpg', 4.1, 0)

ON CONFLICT (slug) DO NOTHING;

-- ── Medya ve İletişim ───────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Harran TV', 'harran-tv-sanliurfa',
 'Şanlıurfa''nın yerel televizyon kanalı. Bölgesel haberler, kültür programları, GAP ve tarım haberleri ile günlük yayın akışı. Online yayın platformu üzerinden dünya genelinde erişilebilmektedir.',
 'Medya Mahallesi, Haliliye, Şanlıurfa', '0414 215 4400',
 37.1640, 38.7965,
 (SELECT id FROM categories WHERE name='TV kanalları' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/harran-tv-sanliurfa.jpg', 4.1, 0),

(gen_random_uuid(), 'Şanlıurfa Gazetesi', 'sanliurfa-gazetesi',
 'Şanlıurfa''nın en köklü yerel gazetelerinden biri. Her gün baskı ve dijital yayın yapan gazete; şehir haberleri, siyaset, ekonomi ve spor sayfalarıyla okuyucularına ulaşmaktadır.',
 'Basın Sitesi, Haliliye, Şanlıurfa', '0414 215 5500',
 37.1638, 38.7968,
 (SELECT id FROM categories WHERE name='Yerel gazeteler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-gazetesi.jpg', 3.9, 0),

(gen_random_uuid(), 'Urfa FM Radyosu', 'urfa-fm-radyosu',
 'Şanlıurfa''nın sevilen yerel radyo istasyonu. Türk halk müziği, arabesk ve yöresel Urfa müziği yayınlarının yanı sıra canlı haber bültenleri ve etkinlik duyurularıyla dinleyicilere ulaşmaktadır.',
 'Basın Sitesi, Haliliye, Şanlıurfa', '0414 215 5510',
 37.1638, 38.7970,
 (SELECT id FROM categories WHERE name='Radyolar' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/urfa-fm-radyosu.jpg', 4.0, 0)

ON CONFLICT (slug) DO NOTHING;

-- ── Otomotiv ───────────────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Şanlıurfa Toyota Galerisi', 'sanliurfa-toyota-galerisi',
 'Toyota yetkili satış ve servis bayii. Yeni ve ikinci el araç satışı, orijinal yedek parça ve periyodik bakım hizmetleri. Kredi ve sigorta işlemlerinde kolaylık sağlayan geniş ekiple hizmet vermektedir.',
 'Oto Sanayi Sitesi, Eyyübiye, Şanlıurfa', '0414 313 8800',
 37.1710, 38.8060,
 (SELECT id FROM categories WHERE name='Galeriler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-toyota-galerisi.jpg', 4.3, 0),

(gen_random_uuid(), 'Oto Ekspres Şanlıurfa', 'oto-ekspres-sanliurfa',
 'Şanlıurfa''nın oto sanayi bölgesindeki köklü tamir ve bakım atölyesi. Motor, şanzıman, fren ve elektrik sistemleri konusunda uzmanlaşmış ekip. Tüm marka araçlara servis hizmeti.',
 'Oto Sanayi Sitesi No:45, Eyyübiye, Şanlıurfa', '0414 313 7700',
 37.1708, 38.8055,
 (SELECT id FROM categories WHERE name='Oto tamirciler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/oto-ekspres-sanliurfa.jpg', 4.2, 0),

(gen_random_uuid(), 'Lastik Dünyası Şanlıurfa', 'lastik-dunyasi-sanliurfa',
 'Michelin, Pirelli, Bridgestone ve Petlas markalı lastiklerin satış ve montaj merkezi. Rot balans, rot ayarı, lastik deposu ve hızlı servis hizmetleri. Mevsim geçişlerinde özel kampanyalar.',
 'Oto Sanayi Girişi, Eyyübiye, Şanlıurfa', '0414 313 6600',
 37.1705, 38.8048,
 (SELECT id FROM categories WHERE name='Lastikçiler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/lastik-dunyasi-sanliurfa.jpg', 4.2, 0)

ON CONFLICT (slug) DO NOTHING;

-- ── Tarım ve Hayvancılık ────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Şanlıurfa Hayvan Pazarı', 'sanliurfa-hayvan-pazari',
 'Cuma günleri kurulan geleneksel hayvan pazarı. Büyükbaş ve küçükbaş hayvan alım satımının yapıldığı bu tarihi pazar, bölgenin en büyük canlı hayvan ticaret noktalarından biridir.',
 'Hayvan Pazarı Yolu, Eyyübiye, Şanlıurfa', '',
 37.1750, 38.8090,
 (SELECT id FROM categories WHERE name='Hayvan pazarları' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-hayvan-pazari.jpg', 4.0, 0),

(gen_random_uuid(), 'Güneydoğu Veteriner Kliniği', 'guneydogu-veteriner-klinigi',
 'Küçük ve büyükbaş hayvan hastalıkları, aşılama, cerrahi ve koruyucu hekimlik hizmetleri sunan tam donanımlı veteriner kliniği. Çiftçilere tarımsal danışmanlık da verilmektedir.',
 'Kışla Caddesi No:8, Haliliye, Şanlıurfa', '0414 215 9800',
 37.1658, 38.7990,
 (SELECT id FROM categories WHERE name='Veteriner hizmetleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/guneydogu-veteriner-klinigi.jpg', 4.5, 0),

(gen_random_uuid(), 'GAP Tarım Ürünleri Merkezi', 'gap-tarim-urunleri-merkezi',
 'GAP Bölgesi tarım ürünleri; kırmızı biber, antep fıstığı, susam, mercimek ve pamuk toptan satış deposu. Çiftçi ve tüccarlar için uygun fiyatlı tarım ürünleri temin merkezi.',
 'Karakoyun Caddesi, Eyyübiye, Şanlıurfa', '0414 313 4500',
 37.1725, 38.7980,
 (SELECT id FROM categories WHERE name='Tarım ürünleri satıcıları' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/gap-tarim-urunleri-merkezi.jpg', 4.2, 0)

ON CONFLICT (slug) DO NOTHING;

-- Özet
SELECT cp.name AS kategori, COUNT(p.id) AS mekan_sayisi
FROM categories cp
LEFT JOIN categories c ON c.parent_id = cp.id
LEFT JOIN places p ON p.category_id = c.id AND p.status = 'active'
WHERE cp.name IN ('Emlak','Ev ve Yaşam','Hukuk ve Finans','İş Dünyası ve Sanayi','Medya ve İletişim','Otomotiv','Tarım ve Hayvancılık')
GROUP BY cp.id, cp.name
ORDER BY cp.name;

SELECT COUNT(*) AS toplam_mekan FROM places WHERE status='active';

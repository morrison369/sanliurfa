-- Şanlıurfa mutfağına ait 10 yeni tarif ekle
BEGIN;

INSERT INTO recipes (id, slug, name, description, ingredients, instructions, cover_image, prep_time, cook_time, servings, difficulty, is_spicy, is_vegetarian, is_featured, rating, view_count, status, meta_title, meta_description, created_at, updated_at)
VALUES
-- 1. Lahmacun
(gen_random_uuid(), 'lahmacun', 'Şanlıurfa Lahmacunu',
'Urfa''nın ince hamuru üzerine serilen baharatlı kıyma harcıyla yapılan geleneksel lahmacun tarifi.',
ARRAY['500 g kıyma (dana-kuzu karışık)', '2 adet kuru soğan', '4 diş sarımsak', '2 adet domates', '1 adet yeşil biber', '1 çorba kaşığı salça', '1 tatlı kaşığı isot biber', '1 tatlı kaşığı kimyon', 'Tuz, karabiber', '500 g ekmeklik un', '1 tatlı kaşığı tuz', '1 paket instant maya', '1 tatlı kaşığı şeker', '300 ml ılık su', '2 yemek kaşığı zeytinyağı'],
ARRAY['Hamur malzemelerini yoğurun, 30 dakika dinlendirin.', 'Kıyma, rendelenmiş soğan, sarımsak, salça ve baharatları iyice yoğurun.', 'Hamuru ceviz büyüklüğünde bezeler alarak merdaneyle ince açın.', 'Kıyma harcını açılan hamura ince bir tabaka halinde yayın.', 'Önceden ısıtılmış 220°C fırında veya odun ateşinde 5-7 dakika pişirin.', 'Maydanoz, limon ve soğanla servis edin.'],
'https://images.pexels.com/photos/8590110/pexels-photo-8590110.jpeg',
30, 20, 4, 'Orta', true, false, false, 4.7, 0, 'published',
'Şanlıurfa Lahmacun Tarifi — Ev Yapımı İnce Hamurlu',
'Urfa tarzı baharatlı kıymalı lahmacun tarifi. İsot biberli harç ve ince hamurlu yapımı ile evde kolayca yapabilirsiniz.',
NOW() - INTERVAL '20 days', NOW()),

-- 2. Katmer
(gen_random_uuid(), 'katmer', 'Urfa Katmeri',
'Fıstıklı ve kaymak dolgusuyla elde açılan yufka hamuru katmanlarından oluşan geleneksel Urfa katmeri.',
ARRAY['500 g un', '1 tatlı kaşığı tuz', '250 ml su', '200 g antep fıstığı (çekilmiş)', '200 g kaymak', '100 g tereyağı', '4 yemek kaşığı pudra şekeri'],
ARRAY['Unu, tuzu ve suyu yoğurarak elastik bir hamur yapın, 20 dakika dinlendirin.', 'Hamuru çok ince yufkalar halinde açın.', 'Tereyağıyla yağlanmış yufkalar üzerine fıstık ve kaymak sürün.', 'Yufkaları katlayarak tava şekli verin.', 'Teflon tavada her iki tarafı altın rengine gelene kadar pişirin.', 'Sıcakken pudra şekeriyle servis edin.'],
'https://images.pexels.com/photos/37206691/pexels-photo-37206691.jpeg',
40, 15, 4, 'Zor', false, true, true, 4.9, 0, 'published',
'Urfa Katmeri Tarifi — Fıstıklı Kaymak Dolgulu',
'Şanlıurfa''nın en sevilen kahvaltı tatlısı katmer. Antep fıstığı ve kaymak dolgusuyla ev yapımı geleneksel tarif.',
NOW() - INTERVAL '18 days', NOW()),

-- 3. Mırra
(gen_random_uuid(), 'mirra-kahvesi', 'Mırra Kahvesi',
'Şanlıurfa''nın kendine özgü acı ve baharatlı geleneksel kahvesi mırra, çok özel bir pişirme yöntemiyle hazırlanır.',
ARRAY['4 yemek kaşığı çekilmiş mırra kahvesi (ya da Arabica)', '1 litre su', '1 tatlı kaşığı kakule (hel)', 'Tercihen bir tutam safran'],
ARRAY['Kahveyi ve kakuleyi bakır cezveye koyun.', 'Üzerine soğuk suyu ekleyin ve ateşe alın.', 'Kısık ateşte 20-25 dakika boyunca kaynatın.', 'Kabarmaya başladığında ateşi kısın, sürekli gözetleyin.', 'Dipte kalan telveden arındırmak için kahveyi ince süzgeçten geçirin.', 'Küçük fincanlarla acı (şekersiz) servis edin; isteğe göre hurma ekleyin.'],
'https://images.pexels.com/photos/36792025/pexels-photo-36792025.jpeg',
5, 25, 4, 'Orta', false, true, false, 4.5, 0, 'published',
'Mırra Kahvesi Nasıl Yapılır? Geleneksel Urfa Tarifi',
'Şanlıurfa''nın simgesi acı mırra kahvesi tarifi. Kakule ve safranla pişirilen bu geleneksel içeceği evde yapın.',
NOW() - INTERVAL '16 days', NOW()),

-- 4. İçli Köfte
(gen_random_uuid(), 'icli-kofte', 'Şanlıurfa İçli Köftesi',
'İnce bulgur kabuğu içine baharatlı kıyma ile fındık doldurulan, kızartma veya haşlama seçenekli geleneksel Urfa iç köftesi.',
ARRAY['500 g ince bulgur', '250 g kıyma (kabuk için)', '1 yumurta', 'Tuz, karabiber', '300 g kıyma (iç harç)', '2 soğan', '100 g iç fındık', '1 demet maydanoz', '2 yemek kaşığı tereyağı', '1 tatlı kaşığı isot', '1 tatlı kaşığı tarçın', 'Kızartmak için sıvı yağ'],
ARRAY['Bulguru ılık suyla ıslatın ve 15 dakika bekleyin.', 'Şişen bulguru kıyma, yumurta, tuz ve karabiberle yoğurun.', 'İç harç için soğanı tereyağında kavurun, kıymayı ekleyin.', 'Fındık, maydanoz, isot ve tarçını ekleyerek karıştırın.', 'Bulgur hamurunu ceviz büyüklüğünde parçalara ayırın, ortasını oyun.', 'İç harcı doldurup ağzını kapatarak oval şekil verin.', 'Kızgın yağda altın rengi alana kadar kızartın veya haşlayın.'],
'https://images.pexels.com/photos/6605211/pexels-photo-6605211.jpeg',
60, 30, 6, 'Zor', true, false, true, 4.8, 0, 'published',
'Şanlıurfa İçli Köfte Tarifi — Geleneksel Yapım',
'Urfa usulü içli köfte tarifi. İsotlu kıyma ve fındık dolgulu ince bulgur kabuğuyla yapılan geleneksel Şanlıurfa lezzeti.',
NOW() - INTERVAL '14 days', NOW()),

-- 5. Bıttım Çorbası
(gen_random_uuid(), 'bittim-corbasi', 'Bıttım Çorbası',
'Şanlıurfa yöresine özgü menengiç (yabani fıstık) tanelerinden yapılan besleyici ve aromatik kış çorbası.',
ARRAY['2 su bardağı bıttım (menengiç)', '2 litre et veya tavuk suyu', '1 soğan', '2 diş sarımsak', '2 yemek kaşığı tereyağı', '1 çorba kaşığı un', 'Tuz, karabiber, kırmızı biber', '1 demet taze nane'],
ARRAY['Bıttımları temizleyip hafifçe kavurun.', 'Soğanı tereyağında kavurun, sarımsak ekleyin.', 'Unu ekleyip pembeleşene kadar kavurun.', 'Et suyunu yavaşça ekleyin, bıttımları ilave edin.', '40-50 dakika kısık ateşte pişirin.', 'Blenderdan geçirin, süzgeçten geçirerek tekrar ocağa alın.', 'Kaynamaya başlayınca tuz, biber ekleyip 5 dakika daha pişirin.', 'Kızdırılmış tereyağıyla yapılan nane sosuyla servis edin.'],
'https://images.pexels.com/photos/1907244/pexels-photo-1907244.jpeg',
15, 60, 4, 'Orta', false, true, false, 4.3, 0, 'published',
'Bıttım Çorbası Tarifi — Şanlıurfa Menengiç Çorbası',
'Şanlıurfa''nın geleneksel menengiç (bıttım) çorbası tarifi. Besleyici ve aromatik bu yöresel çorbayı evde yapın.',
NOW() - INTERVAL '12 days', NOW()),

-- 6. Perde Pilavı
(gen_random_uuid(), 'perde-pilavi', 'Perde Pilavı',
'Düğün ve özel günlerin vazgeçilmezi, hamur kaplı içinde pilav, tavuk ve kuru üzümden oluşan geleneksel Urfa perde pilavı.',
ARRAY['500 g uzun taneli pirinç', '1 bütün tavuk (haşlanmış, doğranmış)', '100 g iç badem', '50 g kuş üzümü', '3 yemek kaşığı tereyağı', '500 g ince yufka', '1 tatlı kaşığı tarçın', '1 tatlı kaşığı karabiber', 'Tuz', 'Tavuk suyu'],
ARRAY['Tavuğu bütün olarak haşlayın, etiyle suyu ayırın.', 'Pirinci tereyağında kavurun, badem ve kuş üzümü ekleyin.', 'Tavuk suyundan pilav oranında ekleyip kapağı kapalı pişirin.', 'Haşlanmış tavuk etini parçalayın, pilavla harmanlayın.', 'Tepsinin tabanını ve kenarlarını yufkayla, tereyağlayarak kaplayın.', 'Pilav harcını yufka üzerine koyun, üstünü tekrar yufkayla örtün.', '180°C fırında üzeri altın sarısı olana kadar pişirin.', 'Tepsiyi ters çevirerek servis edin.'],
'https://images.pexels.com/photos/6544379/pexels-photo-6544379.jpeg',
45, 60, 6, 'Zor', false, false, true, 4.6, 0, 'published',
'Perde Pilavı Tarifi — Şanlıurfa Düğün Pilavı',
'Geleneksel Şanlıurfa perde pilavı tarifi. Düğünlerin vazgeçilmezi; tavuk, badem ve kuş üzümlü harika pilav.',
NOW() - INTERVAL '10 days', NOW()),

-- 7. Kaburga Dolması
(gen_random_uuid(), 'kaburga-dolmasi', 'Kaburga Dolması',
'Kuzu kaburgasına pilav ve baharatlı kıyma harcı doldurularak uzun süre pişirilen geleneksel Şanlıurfa şenlik yemeği.',
ARRAY['1 adet kuzu kaburga (kafesvari açılmış)', '300 g pirinç', '200 g kıyma', '1 soğan', '100 g iç badem', '2 yemek kaşığı tereyağı', '1 tatlı kaşığı tarçın', '1 tatlı kaşığı karabiber', '1 tatlı kaşığı isot', 'Tuz', 'Nar ekşisi (servis için)'],
ARRAY['Pirinci tereyağında kavurun, badem ve kıymayı ekleyin.', 'Baharatları ekleyip kavurmaya devam edin.', 'Yarım pişmiş pilavı kaburgaya doldurun, ağzını iğneyle dikin.', 'Büyük tencerede üzerini geçecek kadar su ekleyin.', 'Kısık ateşte 2,5-3 saat boyunca pişirin.', 'Piştikten sonra fırında 15 dakika kızartarak renk verin.', 'Nar ekşisi gezdirip servis edin.'],
'https://images.pexels.com/photos/5718025/pexels-photo-5718025.jpeg',
30, 180, 4, 'Zor', true, false, false, 4.7, 0, 'published',
'Kaburga Dolması Tarifi — Geleneksel Şanlıurfa Yemeği',
'Şanlıurfa''nın özel günlere ait kaburga dolması tarifi. Pilavlı kuzu kaburgası.',
NOW() - INTERVAL '8 days', NOW()),

-- 8. Tirit
(gen_random_uuid(), 'tirit', 'Şanlıurfa Tiriti',
'Yağda kızartılmış ekmek parçaları üzerine kuzu etli ve soğanlı sos dökülerek hazırlanan, doyurucu bir Urfa klasiği.',
ARRAY['500 g kuzu eti (kemikli, parçalanmış)', '2 soğan', '2 domates', '3 diş sarımsak', '4 yemek kaşığı tereyağı', '1 tatlı kaşığı salça', '1 tatlı kaşığı isot', 'Tuz, karabiber', 'Bayat ekmek (pide veya somun)', 'Kızartma yağı'],
ARRAY['Eti tuzlu suda yumuşayana kadar haşlayın, etiyle suyu ayırın.', 'Soğanı tereyağında kavurun, sarımsak ve domates ekleyin.', 'Salça ve baharatları ekleyip sos haline getirin.', 'Haşlanmış eti ekleyin, et suyu ile 10 dakika daha pişirin.', 'Bayat ekmeği büyük parçalara bölüp yağda kızartın.', 'Kızarmış ekmeği geniş servislere yerleştirin.', 'Üzerine bol sos ve et döküp hemen servis edin.'],
'https://images.pexels.com/photos/8697549/pexels-photo-8697549.jpeg',
20, 90, 4, 'Orta', true, false, false, 4.4, 0, 'published',
'Tirit Tarifi — Şanlıurfa Ekmek Kebabı',
'Kızarmış ekmek üzerine etli sosuyla servis edilen Şanlıurfa tiriti tarifi. Klasik Urfa lezzeti.',
NOW() - INTERVAL '6 days', NOW()),

-- 9. Sini Köftesi
(gen_random_uuid(), 'sini-koftesi', 'Şanlıurfa Sini Köftesi',
'Büyük tepside fırınlanan, altı bulgur üstü ise baharatlı kıyma ve soğan harcından oluşan geleneksel tepsi köftesi.',
ARRAY['500 g ince bulgur', '500 g kıyma (iç için)', '3 soğan', '2 yumurta', '2 yemek kaşığı tereyağı', '1 tatlı kaşığı isot', '1 tatlı kaşığı tarçın', '1 tatlı kaşığı kimyon', 'Tuz, karabiber', 'Maydanoz (taze)', '3 yemek kaşığı zeytinyağı (hamur için)'],
ARRAY['Bulguru ılık suyla ıslatın, zeytinyağı, yumurta ve tuzla yoğurun.', 'Soğanı yağda kavurun, kıymayı ekleyin.', 'İsot, tarçın, kimyon, tuz ve karabiber ekleyip iyice kavurun.', 'Maydanozla harmanlayın.', 'Yağlanmış geniş tepsiye bulgur hamurunu ince tabaka halinde yayın.', 'Üzerine kıyma harcını eşit dağıtın.', '180°C fırında 25-30 dakika pişirin.', 'Eşit kareler keserek servis edin.'],
'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg',
30, 30, 6, 'Kolay', true, false, false, 4.5, 0, 'published',
'Şanlıurfa Sini Köftesi Tarifi — Tepsi Köftesi',
'Fırında yapılan Şanlıurfa sini köftesi tarifi. Bulgur tabanı ve baharatlı kıymalı geleneksel tepsi köftesi.',
NOW() - INTERVAL '4 days', NOW()),

-- 10. Mumbar Dolması
(gen_random_uuid(), 'mumbar-dolmasi', 'Mumbar Dolması',
'Kuzu bağırsağına bulgur ve baharatlı kıyma harcı doldurularak pişirilen, Şanlıurfa''ya özgü cesur bir yöresel lezzet.',
ARRAY['1 kg temizlenmiş kuzu bağırsağı', '500 g ince bulgur', '300 g kıyma', '2 soğan', '1 tatlı kaşığı isot', '1 tatlı kaşığı tarçın', '1 tatlı kaşığı kimyon', '2 yemek kaşığı tereyağı', 'Tuz, karabiber', 'Maydanoz'],
ARRAY['Bağırsağı tuzlu suyla iyice yıkayın, içini dışa çevirerek temizleyin.', 'Bulguru ıslatın, kıyma, soğan ve baharatlarla yoğurun.', 'Harcı bağırsağa doldurun; çok sıkı doldurmayana (pişince şişer).', 'İki ucunu iğneyle veya diş ipiyle bağlayın.', 'Tencerede su ve tuzla haşlayın (1 saat).', 'Haşlandıktan sonra tereyağında her tarafını kızartın.', 'Sıcak servis edin; yanında ayran veya yoğurtla sunun.'],
'https://images.pexels.com/photos/12396040/pexels-photo-12396040.jpeg',
45, 75, 4, 'Zor', true, false, false, 4.2, 0, 'published',
'Mumbar Dolması Tarifi — Şanlıurfa Yöresel Lezzeti',
'Şanlıurfa''nın cesur yöresel lezzeti mumbar dolması tarifi. Bulgur ve baharatlı kıyma dolgulu kuzu bağırsağı.',
NOW() - INTERVAL '2 days', NOW())

ON CONFLICT (slug) DO NOTHING;

SELECT slug, name, difficulty, prep_time + cook_time AS toplam_sure
FROM recipes WHERE status='published' ORDER BY created_at DESC;

COMMIT;

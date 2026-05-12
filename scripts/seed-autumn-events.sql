-- Ekim-Aralık 2026 dönemi için Şanlıurfa etkinlikleri
BEGIN;

INSERT INTO events (id, title, slug, description, start_date, end_date, location, organizer, category, capacity, image_url, is_online, is_free, price, view_count, status, created_at, updated_at)
VALUES

-- Ekim 2026
(gen_random_uuid(),
'Şanlıurfa Kültür ve Turizm Festivali 2026',
'sanliurfa-kultur-turizm-festivali-2026-ekim',
'Her yıl geleneksel olarak düzenlenen Şanlıurfa Kültür ve Turizm Festivali; halk dansları, tasavvuf müziği, yöresel yemek standları ve zanaat sergileriyle şehrin kültürel zenginliğini tüm dünyaya tanıtıyor. Fetih meydanından Balıklıgöl çevresine kadar uzanan etkinlik koridorunda sahne gösterileri, fotoğraf sergisi ve yerel ürün fuarı yer alıyor.',
'2026-10-08 10:00:00', '2026-10-12 22:00:00',
'Balıklıgöl ve Fetih Meydanı, Şanlıurfa',
'Şanlıurfa Büyükşehir Belediyesi',
'Festival', 5000,
'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg',
false, true, 0, 0, 'published', NOW(), NOW()),

(gen_random_uuid(),
'Harran Güneş Festivali — Sonbahar Gecesi',
'harran-gunes-festivali-sonbahar-2026',
'Harran Antik Kenti''nin eşsiz silüeti altında gerçekleşen Harran Güneş Festivali''nin sonbahar özel gösterisi; ışık ve ses efektleriyle antik kümbet evleri canlandırıyor. Seste şair ve ozanların türküleri, halk dansları topluluğunun gösterileri ve tarihin derinliklerine yolculuk vaadeden müze turu eşliğinde unutulmaz bir sonbahar gecesi yaşanıyor.',
'2026-10-15 18:30:00', '2026-10-15 23:00:00',
'Harran Antik Kenti, Harran',
'Harran Turizm Ofisi',
'Kültür', 1200,
'https://images.pexels.com/photos/1387577/pexels-photo-1387577.jpeg',
false, false, 50, 0, 'published', NOW(), NOW()),

(gen_random_uuid(),
'Uluslararası Gastronomi Zirvesi — Urfa Mutfağı',
'uluslararasi-gastronomi-zirvesi-urfa-2026',
'UNESCO Yaratıcı Şehir ağı çerçevesinde düzenlenen gastronomi zirvesinde Türkiye ve dünyadan şefler Şanlıurfa mutfağını mercek altına alıyor. Canlı pişirme atölyeleri, tadım günleri, kebap ustalarıyla soru-cevap ve yerel çiftçi ürünleri sergisiyle şehrin gastronomi turizmine ivme kazandırılıyor.',
'2026-10-22 09:00:00', '2026-10-24 20:00:00',
'Şanlıurfa Kültür ve Kongre Merkezi',
'Şanlıurfa Gastronomi Derneği',
'Gastronomi', 800,
'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg',
false, false, 75, 0, 'published', NOW(), NOW()),

(gen_random_uuid(),
'Sıra Gecesi Kültür Haftası 2026',
'sira-gecesi-kultur-haftasi-2026-ekim',
'Urfa''nın asırlık sıra gecesi geleneğini yaşatmak amacıyla düzenlenen bu özel haftada, şehrin dört bir yanındaki sıra gecesi mekânlarında aynı anda etkinlikler gerçekleşiyor. Mırra ikramları, ud ve kemençe konserleri, geleneksel sıra gecesi adabının anlatıldığı seminerler ve şiir oturumları programda yer alıyor.',
'2026-10-27 19:00:00', '2026-11-02 23:00:00',
'Çeşitli Sıra Gecesi Mekânları, Şanlıurfa',
'Şanlıurfa Kültür ve Sanat Vakfı',
'Kültür', 2000,
'https://images.pexels.com/photos/9508384/pexels-photo-9508384.jpeg',
false, true, 0, 0, 'published', NOW(), NOW()),

-- Kasım 2026
(gen_random_uuid(),
'Göbeklitepe Fotoğraf Yarışması Sergi Açılışı',
'gobeklitepe-fotograf-yarismasi-sergi-2026',
'Uluslararası Göbeklitepe Fotoğraf Yarışması''nın finalistleri ve ödül kazananlarının eserlerinin sergilendiği özel açılış töreni. Sergide 12.000 yıllık kültürel mirasın farklı ülkelerden sanatçılar tarafından nasıl yorumlandığı gözlemlenebilmektedir. Açılış töreninde ödüller sahiplerine takdim edilmekte, ardından şarap ve yerel lezzetler eşliğinde kokteyl düzenlenmektedir.',
'2026-11-05 18:00:00', '2026-11-20 19:00:00',
'Şanlıurfa Arkeoloji Müzesi Sergi Salonu',
'Şanlıurfa Kültür ve Turizm İl Müdürlüğü',
'Sanat', 500,
'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg',
false, true, 0, 0, 'published', NOW(), NOW()),

(gen_random_uuid(),
'Halfeti Kış Turu — Kara Güller Son Sezonu',
'halfeti-kis-turu-kara-guller-2026-kasim',
'Sonbahar mevsiminin son gülleri açık olduğu günlerde gerçekleştirilen özel rehberli Halfeti tekne turu. Su altındaki köy kalıntıları, Rumkale silueti ve dünyanın tek doğal siyah gülleriyle ünlü Halfeti, sonbahar renkleriyle bambaşka bir görünüm kazanmaktadır. Tur kapsamında Şanlıurfa''dan tur otobüsü kalkışı, öğle yemeği ve rehberli tekne gezisi bulunmaktadır.',
'2026-11-07 08:00:00', '2026-11-07 19:00:00',
'Halfeti, Şanlıurfa',
'Şanlıurfa Seyahat Acenteleri Birliği',
'Turizm', 60,
'https://images.pexels.com/photos/15837762/pexels-photo-15837762.jpeg',
false, false, 150, 0, 'published', NOW(), NOW()),

(gen_random_uuid(),
'Harran Arkeoloji Okulu — Kış Seminerleri',
'harran-arkeoloji-okulu-seminerleri-2026-kasim',
'Harran Üniversitesi ve Şanlıurfa Arkeoloji Müzesi iş birliğiyle düzenlenen üç günlük seminer dizisinde arkeologlar, tarihçiler ve kültür mirası uzmanları güncel araştırmalarını sunuyor. Göbeklitepe, Karahantepe ve Nevali Çori kazılarından yeni bulgular, sunum ve panel tartışmalarıyla akademisyenler, öğrenciler ve meraklılarla paylaşılıyor.',
'2026-11-12 09:00:00', '2026-11-14 17:00:00',
'Harran Üniversitesi Kongre Merkezi',
'Harran Üniversitesi Arkeoloji Bölümü',
'Akademi', 300,
'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg',
false, true, 0, 0, 'published', NOW(), NOW()),

(gen_random_uuid(),
'Şanlıurfa Kitap Fuarı 2026',
'sanliurfa-kitap-fuari-2026-kasim',
'Yılda bir kez kapılarını açan Şanlıurfa Kitap Fuarı''nda ulusal yayınevleri standları, yerel yazarlarla imza günleri, çocuklar için hikâye saatleri ve panel etkinlikleri bir arada sunulmaktadır. Şanlıurfa tarihi ve kültürü üzerine özel bölüm; arkeoloji, gastronomi ve fotoğraf kitaplarının tanıtımı fuarın vazgeçilmez bölümleri arasında yer almaktadır.',
'2026-11-20 10:00:00', '2026-11-29 20:00:00',
'Şanlıurfa Fuar ve Kongre Merkezi',
'Kültür ve Turizm Bakanlığı & Şanlıurfa Büyükşehir Belediyesi',
'Kültür', 10000,
'https://images.pexels.com/photos/1290141/pexels-photo-1290141.jpeg',
false, true, 0, 0, 'published', NOW(), NOW()),

-- Aralık 2026
(gen_random_uuid(),
'Yılbaşı Konser Gecesi — Şanlıurfa Senfoni',
'yilbasi-konser-gecesi-sanliurfa-2026-aralik',
'Yıl sonu kutlaması kapsamında Şanlıurfa Büyükşehir Belediyesi Kültür Sanat Merkezi''nde gerçekleştirilecek özel senfoni konserinde; hem klasik Türk musikisi hem de dünya müziğinden seçkin parçalar icra edilecektir. Şanlıurfa Devlet Senfoni Orkestrası eşliğinde solistlerin sergileyeceği performans, misafirlere yıl sonu kutlaması için özel bir kültürel deneyim sunmaktadır.',
'2026-12-31 20:00:00', '2027-01-01 01:00:00',
'Şanlıurfa Kültür ve Sanat Merkezi',
'Şanlıurfa Büyükşehir Belediyesi Kültür İşleri Dairesi',
'Konser', 600,
'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg',
false, false, 100, 0, 'published', NOW(), NOW()),

(gen_random_uuid(),
'Kış Arkeoloji Kampı — Genç Kaşifler',
'kis-arkeoloji-kampi-genc-kasifler-2026',
'14-18 yaş grubu öğrencilere yönelik düzenlenen bu beş günlük kış kampında katılımcılar; Göbeklitepe ve Harran''ı rehberli geziler, kazı simülasyonları ve arkeolog denetiminde kil eser üretimi atölyeleriyle deneyimlemektedir. Kamp sonunda her katılımcıya katılım sertifikası verilmekte, en başarılı projeler ödüllendirilmektedir.',
'2026-12-20 09:00:00', '2026-12-24 17:00:00',
'Şanlıurfa Arkeoloji Müzesi & Göbeklitepe',
'Şanlıurfa Gençlik ve Spor İl Müdürlüğü',
'Eğitim', 40,
'https://images.pexels.com/photos/8926841/pexels-photo-8926841.jpeg',
false, false, 200, 0, 'published', NOW(), NOW()),

(gen_random_uuid(),
'Geleneksel Urfa Mutfağı Kış Atölyesi',
'urfa-mutfagi-kis-atolyesi-2026-aralik',
'Kış aylarına özel olarak Şanlıurfa''nın en deneyimli aşçı ustaları tarafından verilen bu mutfak atölyesinde; kaburga dolması, içli köfte, perde pilavı ve şıllık tatlısı gibi kış klasikleri öğretilmektedir. Maksimum 12 kişilik gruplarla yürütülen atölyede katılımcılar hem pişirme hem de servis tekniklerini öğrenmektedir.',
'2026-12-06 10:00:00', '2026-12-06 15:00:00',
'Urfa Gastronomi Merkezi, Şanlıurfa Merkez',
'Şanlıurfa Aşçılar Derneği',
'Gastronomi', 12,
'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg',
false, false, 250, 0, 'published', NOW(), NOW())

ON CONFLICT (slug) DO NOTHING;

-- Özet
SELECT
  TO_CHAR(start_date, 'YYYY-MM') AS ay,
  COUNT(*) AS toplam
FROM events WHERE status='published'
GROUP BY TO_CHAR(start_date, 'YYYY-MM')
ORDER BY ay;

COMMIT;

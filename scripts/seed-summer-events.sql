-- Haziran–Eylül 2026 yaz etkinlikleri (12 etkinlik)

INSERT INTO events (
  id, title, slug, description, start_date, end_date,
  location, category, status, is_featured, image_url
) VALUES

-- Haziran 2026
(gen_random_uuid(),
 'Göbeklitepe Uluslararası Arkeoloji Konferansı',
 'gobeklitepe-arkeoloji-konferansi-2026',
 'Dünyanın en eski tapınak kompleksi Göbeklitepe''nin keşfinin 30. yılında uluslararası arkeoloji konferansı düzenleniyor. 20''den fazla ülkeden araştırmacı ve akademisyen Şanlıurfa''da buluşuyor.',
 '2026-06-12', '2026-06-14',
 'Şanlıurfa Kültür ve Kongre Merkezi', 'Kültür', 'published', true,
 '/uploads/events/gobeklitepe-arkeoloji-konferansi-2026.jpg'),

(gen_random_uuid(),
 'Halfeti Gül Festivali',
 'halfeti-gul-festivali-2026',
 'Halfeti''nin eşsiz siyah gülleri çiçek açtığında kutlanan yıllık festival. Tekne turları, gül bahçesi gezileri, fotoğraf yarışması ve yöresel yeme-içme stantları ile dolu dolu iki gün.',
 '2026-06-19', '2026-06-21',
 'Halfeti İlçesi, Şanlıurfa', 'Festival', 'published', true,
 '/uploads/events/halfeti-gul-festivali-2026.jpg'),

(gen_random_uuid(),
 'Urfa Müzik ve Kültür Günleri',
 'urfa-muzik-kultur-gunleri-2026',
 'Sıra gecesi geleneğini yaşatan yerel sanatçılar ve Türkiye''nin dört bir yanından katılan müzisyenlerle üç günlük müzik şöleni. Eski şehir meydanında açık hava konserleri.',
 '2026-06-26', '2026-06-28',
 'Balıklıgöl Çevresi, Şanlıurfa', 'Müzik', 'published', false,
 '/uploads/events/urfa-muzik-kultur-gunleri-2026.jpg'),

-- Temmuz 2026
(gen_random_uuid(),
 'GAP Turizm Fuarı Şanlıurfa',
 'gap-turizm-fuari-2026',
 'Güneydoğu Anadolu Projesi bölgesinin turizm potansiyelini tanıtan yıllık fuar. Otel, tur operatörü ve yerel üreticilerin katılımıyla bölge turizmine yatırım çekiyor.',
 '2026-07-03', '2026-07-05',
 'Kongre Merkezi, Şanlıurfa', 'Turizm', 'published', false,
 '/uploads/events/gap-turizm-fuari-2026.jpg'),

(gen_random_uuid(),
 'Harran Yaz Okulu ve Kültür Kampı',
 'harran-yaz-okulu-2026',
 'Lise ve üniversite öğrencileri için Harran Antik Kenti''nde düzenlenen arkeoloji ve kültür kampı. 5 gün boyunca kültürel miras keşfi, atölye çalışmaları ve uzman sunumlar.',
 '2026-07-13', '2026-07-17',
 'Harran İlçesi, Şanlıurfa', 'Eğitim', 'published', false,
 '/uploads/events/harran-yaz-okulu-2026.jpg'),

(gen_random_uuid(),
 'Balıklıgöl Gece Bazarı',
 'balikligol-gece-bazari-2026',
 'Her Cuma-Cumartesi akşamı kurulan yaz gecesi açık hava bazarı. El sanatları, yöresel lezzetler, canlı müzik ve Balıklıgöl manzarasıyla Temmuz boyunca devam edecek.',
 '2026-07-03', '2026-07-31',
 'Balıklıgöl Meydanı, Şanlıurfa', 'Pazar', 'published', true,
 '/uploads/events/balikligol-gece-bazari-2026.jpg'),

-- Ağustos 2026
(gen_random_uuid(),
 'Şanlıurfa Kültür ve Sanat Festivali 2026',
 'sanliurfa-kultur-sanat-festivali-2026',
 'Her yıl Ağustos''ta düzenlenen büyük kültür festivali. Tiyatro oyunları, halk dansları, fotoğraf sergileri, konserler ve çocuk etkinlikleriyle on gün boyunca şehri renklendiriyor.',
 '2026-08-07', '2026-08-16',
 'Şehir Merkezi, Şanlıurfa', 'Festival', 'published', true,
 '/uploads/events/sanliurfa-kultur-sanat-festivali-2026.jpg'),

(gen_random_uuid(),
 'Uluslararası Gastronomi ve Lezzet Festivali',
 'uluslararasi-gastronomi-festivali-2026',
 'Türk mutfağının önemli merkezi Şanlıurfa''da düzenlenen uluslararası gastronomi festivali. Şef gösterileri, lezzet yarışması, çiğ köfte ve kebap atölyeleri ile Orta Doğu mutfağından örnekler.',
 '2026-08-21', '2026-08-23',
 'Atatürk Parkı, Şanlıurfa', 'Gastronomi', 'published', true,
 '/uploads/events/uluslararasi-gastronomi-festivali-2026.jpg'),

(gen_random_uuid(),
 'Fotoğraf ve Belgesel Film Günleri',
 'fotograf-belgesel-film-gunleri-2026',
 'Şanlıurfa ve GAP bölgesini konu alan fotoğraf sergileri ve kısa belgesel filmler için üç günlük etkinlik. Açık hava sinema gösterimleri ve fotoğraf maratonu.',
 '2026-08-28', '2026-08-30',
 'Balıklıgöl Çevresi, Şanlıurfa', 'Sanat', 'published', false,
 '/uploads/events/fotograf-belgesel-film-gunleri-2026.jpg'),

-- Eylül 2026
(gen_random_uuid(),
 'Harran Antik Kent Tiyatrosu Açık Hava Gösterileri',
 'harran-antik-tiyatro-2026',
 'Harran Antik Kenti''nin tarihi mekânında Eylül boyunca her hafta sonu düzenlenen açık hava tiyatro gösterileri. Orta Doğu mitolojisi ve Anadolu tarihi konulu oyunlar.',
 '2026-09-04', '2026-09-27',
 'Harran İlçesi, Şanlıurfa', 'Tiyatro', 'published', false,
 '/uploads/events/harran-antik-tiyatro-2026.jpg'),

(gen_random_uuid(),
 'Şanlıurfa Maratonu 2026',
 'sanliurfa-maratonu-2026',
 'GAP Koşusu ve Şanlıurfa Maratonu bir arada. Tarihi şehir merkezi ve Balıklıgöl çevresinden geçen 5km, 10km ve 42km parkurlarıyla binlerce koşucu katılıyor.',
 '2026-09-13', '2026-09-13',
 'Atatürk Bulvarı, Şanlıurfa', 'Spor', 'published', true,
 '/uploads/events/sanliurfa-maratonu-2026.jpg'),

(gen_random_uuid(),
 'Göbeklitepe Gece Turu ve Işık Şovu',
 'gobeklitepe-gece-turu-2026',
 'Eylül sonunda her Cumartesi gerçekleştirilen özel gece turu. Göbeklitepe arkeolojik alanında LED mapping ile hazırlanan ışık gösterisi ve arkeolog rehberi eşliğinde yürüyüş.',
 '2026-09-05', '2026-09-26',
 'Göbeklitepe, Şanlıurfa', 'Turizm', 'published', true,
 '/uploads/events/gobeklitepe-gece-turu-2026.jpg')

ON CONFLICT (slug) DO NOTHING;

SELECT DATE_TRUNC('month', start_date)::date AS ay, COUNT(*) AS etkinlik
FROM events WHERE status='published'
GROUP BY ay ORDER BY ay;

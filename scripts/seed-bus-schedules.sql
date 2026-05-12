-- Şanlıurfa Büyükşehir Belediyesi Otobüs Hatları ve Sefer Saatleri
-- Kaynak: Büyükşehir Belediyesi ulaşım verileri + Moovit güzergah bilgileri
-- Toplam 61 hat, başlangıç saati 05:45, bitiş 23:30
-- Bu seed: en yoğun kullanılan 12 hat + tam sefer saatleri

-- Önce mevcut verileri temizle (idempotent)
DELETE FROM bus_schedules;
DELETE FROM bus_routes;

-- HATLAR
INSERT INTO bus_routes (route_no, name, start_stop, end_stop, notes) VALUES
  ('12',  'Devlet Hastanesi - T1 Aktarma',       '500 Yataklı Devlet Hastanesi',      'T1 Aktarma Merkezi',       'Hastane bağlantı hattı'),
  ('22A', 'Devteşti - T1 Aktarma',               'Devteşti Mahallesi',                'T1 Aktarma Merkezi',       'Batı mahalleler hattı'),
  ('24',  'Buhara - Devlet Hastanesi',            'Buhara Mahallesi',                  'Eyyübiye Devlet Hastanesi','Kuzey-güney eksen hattı'),
  ('42',  'Eyyübiye - Topçu Meydanı',            'Eyyübiye Devlet Hastanesi',         'Topçu Meydanı',            'Merkez bağlantı hattı'),
  ('43',  'Karaköprü - Abide Kavşağı',           'Karaköprü Merkez',                  'Abide Kavşağı',            'Karaköprü ana hattı'),
  ('52',  'GAP Otogarı - Balıklıgöl',            'GAP Otogarı',                       'Balıklıgöl Meydanı',       'Turizm ve merkez hattı'),
  ('55',  'Zeytindalı - T3 Bamyasuyu',           'Zeytindalı Eğitim Kampüsü',         'T3 Bamyasuyu Aktarma',     'Kampüs hattı'),
  ('71',  'Said Nursi - T2 Emirgan',             'Said Nursi Ortaokulu',              'T2 Emirgan Aktarma',       'Güney mahalleler hattı'),
  ('73A', 'Harran Üniversitesi - Abide',         'Harran Üniversitesi',               'Abide Kavşağı',            'Üniversite ekspres'),
  ('95',  'Organize Sanayi - T3 Abide',          'Organize Sanayi Bölgesi',           'T3 Abide Aktarma',         'Sanayi bölgesi hattı'),
  ('110', 'Karaali - T3 Abide Aktarma',          'Karaali Sağlık Ocağı',              'T3 Abide Aktarma',         'Doğu mahalleler hattı'),
  ('1',   'Topçu Meydanı - Balıklıgöl',         'Topçu Meydanı',                     'Balıklıgöl',               'Merkez turizm hattı')
ON CONFLICT (route_no) DO UPDATE SET
  name = EXCLUDED.name,
  start_stop = EXCLUDED.start_stop,
  end_stop = EXCLUDED.end_stop,
  notes = EXCLUDED.notes;

-- Yardımcı: route_id'leri bulma
-- Hat 12: 500 Yataklı - T1 Aktarma Merkezi (05:49–23:05, ~25dk aralık)
INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
FROM bus_routes r,
  (VALUES ('05:49'),('06:15'),('06:40'),('07:05'),('07:25'),('07:45'),
          ('08:05'),('08:30'),('09:00'),('09:30'),('10:00'),('10:35'),
          ('11:10'),('11:45'),('12:20'),('13:00'),('13:40'),('14:20'),
          ('15:00'),('15:40'),('16:20'),('17:00'),('17:20'),('17:40'),
          ('18:05'),('18:30'),('19:00'),('19:35'),('20:10'),('20:50'),
          ('21:30'),('22:15'),('23:05')) AS t(dep)
WHERE r.route_no = '12';

INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'saturday', 'outbound'
FROM bus_routes r,
  (VALUES ('06:00'),('06:40'),('07:20'),('08:00'),('08:40'),('09:20'),
          ('10:00'),('10:45'),('11:30'),('12:15'),('13:00'),('13:45'),
          ('14:30'),('15:15'),('16:00'),('16:45'),('17:30'),('18:15'),
          ('19:05'),('20:00'),('21:00'),('22:00'),('23:00')) AS t(dep)
WHERE r.route_no = '12';

INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'sunday', 'outbound'
FROM bus_routes r,
  (VALUES ('06:30'),('07:15'),('08:00'),('09:00'),('10:00'),('11:00'),
          ('12:00'),('13:00'),('14:00'),('15:00'),('16:00'),('17:00'),
          ('18:00'),('19:00'),('20:00'),('21:00'),('22:00'),('23:00')) AS t(dep)
WHERE r.route_no = '12';

-- Hat 22A: Devteşti - T1 (05:49–23:30)
INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
FROM bus_routes r,
  (VALUES ('05:49'),('06:10'),('06:30'),('06:50'),('07:10'),('07:28'),
          ('07:45'),('08:05'),('08:25'),('08:50'),('09:20'),('09:55'),
          ('10:30'),('11:05'),('11:40'),('12:20'),('13:00'),('13:40'),
          ('14:20'),('15:00'),('15:40'),('16:15'),('16:45'),('17:05'),
          ('17:25'),('17:45'),('18:10'),('18:40'),('19:15'),('19:55'),
          ('20:40'),('21:25'),('22:15'),('23:05'),('23:30')) AS t(dep)
WHERE r.route_no = '22A';

INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'saturday', 'outbound'
FROM bus_routes r,
  (VALUES ('06:00'),('06:35'),('07:10'),('07:50'),('08:30'),('09:10'),
          ('09:50'),('10:30'),('11:15'),('12:00'),('12:45'),('13:30'),
          ('14:15'),('15:00'),('15:45'),('16:30'),('17:15'),('18:00'),
          ('18:45'),('19:35'),('20:30'),('21:30'),('22:30'),('23:30')) AS t(dep)
WHERE r.route_no = '22A';

-- Hat 24: Buhara - Devlet Hastanesi (05:49–23:20)
INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
FROM bus_routes r,
  (VALUES ('05:49'),('06:15'),('06:45'),('07:10'),('07:30'),('07:50'),
          ('08:10'),('08:35'),('09:05'),('09:40'),('10:15'),('10:55'),
          ('11:35'),('12:15'),('13:00'),('13:45'),('14:30'),('15:15'),
          ('16:00'),('16:40'),('17:10'),('17:30'),('17:50'),('18:15'),
          ('18:45'),('19:20'),('20:00'),('20:45'),('21:35'),('22:25'),
          ('23:10')) AS t(dep)
WHERE r.route_no = '24';

INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'saturday', 'outbound'
FROM bus_routes r,
  (VALUES ('06:05'),('06:50'),('07:35'),('08:20'),('09:05'),('09:50'),
          ('10:35'),('11:20'),('12:10'),('13:00'),('13:50'),('14:40'),
          ('15:30'),('16:20'),('17:10'),('18:00'),('18:50'),('19:45'),
          ('20:45'),('21:50'),('23:00')) AS t(dep)
WHERE r.route_no = '24';

-- Hat 42: Eyyübiye - Topçu Meydanı
INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
FROM bus_routes r,
  (VALUES ('05:55'),('06:25'),('06:55'),('07:20'),('07:40'),('08:00'),
          ('08:20'),('08:45'),('09:20'),('10:00'),('10:40'),('11:20'),
          ('12:05'),('12:50'),('13:35'),('14:20'),('15:05'),('15:45'),
          ('16:20'),('16:50'),('17:15'),('17:40'),('18:05'),('18:35'),
          ('19:10'),('19:50'),('20:35'),('21:25'),('22:20'),('23:10')) AS t(dep)
WHERE r.route_no = '42';

INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'saturday', 'outbound'
FROM bus_routes r,
  (VALUES ('06:10'),('07:00'),('07:50'),('08:40'),('09:30'),('10:20'),
          ('11:10'),('12:00'),('12:50'),('13:40'),('14:30'),('15:20'),
          ('16:10'),('17:00'),('17:50'),('18:40'),('19:35'),('20:35'),
          ('21:40'),('22:45')) AS t(dep)
WHERE r.route_no = '42';

-- Hat 43: Karaköprü - Abide (05:49–23:30, yoğun hat)
INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
FROM bus_routes r,
  (VALUES ('05:49'),('06:10'),('06:30'),('06:48'),('07:05'),('07:22'),
          ('07:38'),('07:55'),('08:12'),('08:30'),('08:55'),('09:25'),
          ('10:00'),('10:40'),('11:20'),('12:00'),('12:40'),('13:20'),
          ('14:05'),('14:50'),('15:30'),('16:05'),('16:30'),('16:55'),
          ('17:15'),('17:35'),('17:55'),('18:20'),('18:50'),('19:25'),
          ('20:05'),('20:50'),('21:40'),('22:30'),('23:15'),('23:30')) AS t(dep)
WHERE r.route_no = '43';

INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'saturday', 'outbound'
FROM bus_routes r,
  (VALUES ('06:00'),('06:35'),('07:10'),('07:50'),('08:30'),('09:10'),
          ('09:50'),('10:30'),('11:15'),('12:00'),('12:45'),('13:30'),
          ('14:15'),('15:00'),('15:45'),('16:30'),('17:15'),('18:00'),
          ('18:50'),('19:45'),('20:40'),('21:40'),('22:45')) AS t(dep)
WHERE r.route_no = '43';

-- Hat 52: GAP Otogarı - Balıklıgöl (turizm + transfer hattı)
INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
FROM bus_routes r,
  (VALUES ('06:00'),('06:45'),('07:30'),('08:15'),('09:00'),('09:45'),
          ('10:30'),('11:15'),('12:00'),('12:45'),('13:30'),('14:15'),
          ('15:00'),('15:45'),('16:30'),('17:15'),('18:00'),('18:45'),
          ('19:30'),('20:15'),('21:00'),('21:45'),('22:30')) AS t(dep)
WHERE r.route_no = '52';

INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'saturday', 'outbound'
FROM bus_routes r,
  (VALUES ('06:30'),('07:15'),('08:00'),('09:00'),('10:00'),('11:00'),
          ('12:00'),('13:00'),('14:00'),('15:00'),('16:00'),('17:00'),
          ('18:00'),('19:00'),('20:00'),('21:00'),('22:00')) AS t(dep)
WHERE r.route_no = '52';

INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'sunday', 'outbound'
FROM bus_routes r,
  (VALUES ('07:00'),('08:00'),('09:00'),('10:00'),('11:00'),('12:00'),
          ('13:00'),('14:00'),('15:00'),('16:00'),('17:00'),('18:00'),
          ('19:00'),('20:00'),('21:00'),('22:00')) AS t(dep)
WHERE r.route_no = '52';

-- Hat 55: Zeytindalı - T3 Bamyasuyu (06:30–22:00, 30-40dk)
INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
FROM bus_routes r,
  (VALUES ('06:30'),('07:10'),('07:50'),('08:30'),('09:15'),('10:00'),
          ('10:45'),('11:30'),('12:15'),('13:00'),('13:45'),('14:30'),
          ('15:15'),('16:00'),('16:45'),('17:30'),('18:15'),('19:00'),
          ('19:45'),('20:30'),('21:15'),('22:00')) AS t(dep)
WHERE r.route_no = '55';

-- Hat 71: Said Nursi - T2 Emirgan (05:49–23:30)
INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
FROM bus_routes r,
  (VALUES ('05:49'),('06:20'),('06:50'),('07:15'),('07:38'),('08:00'),
          ('08:22'),('08:50'),('09:25'),('10:05'),('10:50'),('11:35'),
          ('12:20'),('13:05'),('13:50'),('14:35'),('15:20'),('16:00'),
          ('16:35'),('17:00'),('17:25'),('17:50'),('18:20'),('18:55'),
          ('19:35'),('20:20'),('21:10'),('22:05'),('23:00'),('23:30')) AS t(dep)
WHERE r.route_no = '71';

-- Hat 73A: Harran Üniversitesi - Abide (ekspres, 40dk aralık)
INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
FROM bus_routes r,
  (VALUES ('06:30'),('07:00'),('07:30'),('08:00'),('08:30'),('09:15'),
          ('10:00'),('10:45'),('11:30'),('12:15'),('13:00'),('13:45'),
          ('14:30'),('15:15'),('16:00'),('16:40'),('17:10'),('17:40'),
          ('18:15'),('19:00'),('19:45'),('20:30'),('21:20'),('22:10'),
          ('23:00')) AS t(dep)
WHERE r.route_no = '73A';

INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'saturday', 'outbound'
FROM bus_routes r,
  (VALUES ('07:00'),('08:00'),('09:00'),('10:00'),('11:00'),('12:00'),
          ('13:00'),('14:00'),('15:00'),('16:00'),('17:00'),('18:00'),
          ('19:00'),('20:00'),('21:00'),('22:00')) AS t(dep)
WHERE r.route_no = '73A';

-- Hat 95: Organize Sanayi - T3 Abide (işçi saatlerine göre)
INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
FROM bus_routes r,
  (VALUES ('05:55'),('06:20'),('06:45'),('07:10'),('07:35'),('08:05'),
          ('08:45'),('09:30'),('10:20'),('11:10'),('12:00'),('12:50'),
          ('13:40'),('14:30'),('15:20'),('16:00'),('16:30'),('17:00'),
          ('17:30'),('18:05'),('18:45'),('19:30'),('20:20'),('21:15'),
          ('22:10'),('23:00')) AS t(dep)
WHERE r.route_no = '95';

-- Hat 110: Karaali - T3 Abide (40-50dk aralık, çevre hattı)
INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
FROM bus_routes r,
  (VALUES ('05:49'),('06:30'),('07:15'),('08:05'),('08:55'),('09:50'),
          ('10:45'),('11:40'),('12:35'),('13:30'),('14:25'),('15:20'),
          ('16:10'),('17:00'),('17:45'),('18:30'),('19:20'),('20:15'),
          ('21:10'),('22:05'),('23:00')) AS t(dep)
WHERE r.route_no = '110';

-- Hat 1: Topçu Meydanı - Balıklıgöl (merkez, sık sefer)
INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
FROM bus_routes r,
  (VALUES ('06:00'),('06:25'),('06:50'),('07:12'),('07:32'),('07:50'),
          ('08:08'),('08:28'),('08:50'),('09:20'),('09:55'),('10:35'),
          ('11:15'),('11:55'),('12:35'),('13:15'),('13:55'),('14:35'),
          ('15:15'),('15:55'),('16:30'),('17:00'),('17:20'),('17:40'),
          ('18:00'),('18:25'),('18:55'),('19:30'),('20:10'),('20:55'),
          ('21:45'),('22:30')) AS t(dep)
WHERE r.route_no = '1';

INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'saturday', 'outbound'
FROM bus_routes r,
  (VALUES ('06:30'),('07:05'),('07:45'),('08:30'),('09:15'),('10:00'),
          ('10:45'),('11:30'),('12:15'),('13:00'),('13:45'),('14:30'),
          ('15:15'),('16:00'),('16:45'),('17:30'),('18:15'),('19:00'),
          ('19:45'),('20:30'),('21:30'),('22:30')) AS t(dep)
WHERE r.route_no = '1';

INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
SELECT r.id, t.dep::TIME, 'sunday', 'outbound'
FROM bus_routes r,
  (VALUES ('07:00'),('08:00'),('09:00'),('10:00'),('11:00'),('12:00'),
          ('13:00'),('14:00'),('15:00'),('16:00'),('17:00'),('18:00'),
          ('19:00'),('20:00'),('21:00'),('22:00')) AS t(dep)
WHERE r.route_no = '1';

-- Doğrulama
SELECT r.route_no, r.name, COUNT(s.id) as sefer_sayisi,
  MIN(s.departure_time::TEXT) as ilk_sefer,
  MAX(s.departure_time::TEXT) as son_sefer
FROM bus_routes r
LEFT JOIN bus_schedules s ON s.route_id = r.id AND s.day_type = 'weekday' AND s.direction = 'outbound'
GROUP BY r.id, r.route_no, r.name
ORDER BY r.route_no::TEXT;

-- Etkinlik organizatör bilgilerini güncelle
-- Başlık ve kategoriye göre uygun organizatörler atanıyor

UPDATE events SET organizer = 'Şanlıurfa Valiliği Kültür Koordinatörlüğü'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Göbeklitepe Uluslararası Arkeoloji Konferansı%';

UPDATE events SET organizer = 'Şanlıurfa Büyükşehir Belediyesi Kültür İşleri Daire Başkanlığı'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Sıra Gecesi%';

UPDATE events SET organizer = 'Halfeti Belediyesi ve Şanlıurfa Kültür Turizm Müdürlüğü'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Halfeti Gül Festivali%';

UPDATE events SET organizer = 'Şanlıurfa Büyükşehir Belediyesi'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Urfa Müzik ve Kültür Günleri%';

UPDATE events SET organizer = 'Şanlıurfa Büyükşehir Belediyesi Zabıta Daire Başkanlığı'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Balıklıgöl Gece Bazarı%';

UPDATE events SET organizer = 'GAP Bölge Kalkınma İdaresi Başkanlığı'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%GAP Turizm Fuarı%';

UPDATE events SET organizer = 'Harran Üniversitesi ve Şanlıurfa İl Milli Eğitim Müdürlüğü'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Harran Yaz Okulu%';

UPDATE events SET organizer = 'T.C. Kültür ve Turizm Bakanlığı — Göbeklitepe Miras Ofisi'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Göbeklitepe Açıklama%';

UPDATE events SET organizer = 'Türk Tarih Kurumu Şanlıurfa Temsilciliği'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Tarihçileri Buluşması%';

UPDATE events SET organizer = 'Şanlıurfa Valiliği ve Büyükşehir Belediyesi'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Kültür ve Sanat Festivali%';

UPDATE events SET organizer = 'Halfeti Belediyesi Turizm Birimi'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Halfeti Su Altı%';

UPDATE events SET organizer = 'Şanlıurfa Büyükşehir Belediyesi ve Türkiye Gastronomi Derneği'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Gastronomi ve Lezzet%';

UPDATE events SET organizer = 'Şanlıurfa Büyükşehir Belediyesi Kültür Merkezi'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Fotoğraf ve Belgesel%';

UPDATE events SET organizer = 'Harran Üniversitesi Güzel Sanatlar Fakültesi'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Harran Antik Kent Tiyatrosu%';

UPDATE events SET organizer = 'Şanlıurfa Valiliği Kültür ve Turizm Müdürlüğü'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Göbeklitepe Gece Turu%';

UPDATE events SET organizer = 'Şanlıurfa Büyükşehir Belediyesi Zabıta ve Kültür İşleri'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Urfa Mutfağı Festivali%';

UPDATE events SET organizer = 'Şanlıurfa Atletizm Kulübü ve Büyükşehir Belediyesi Spor A.Ş.'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Maratonu%';

UPDATE events SET organizer = 'Şanlıurfa İl Tarım ve Orman Müdürlüğü'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Pamuk Hasadı%';

UPDATE events SET organizer = 'Şanlıurfa Büyükşehir Belediyesi ve Türkiye Jazz Vakfı'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Caz Konseri%';

UPDATE events SET organizer = 'Şanlıurfa Devlet Tiyatroları'
WHERE status = 'published' AND (organizer IS NULL OR organizer = '')
AND title ILIKE '%Çocuk Tiyatrosu%';

-- Kalan tüm organizatörsüz etkinliklere kategoriye göre varsayılan ata
UPDATE events SET organizer = CASE
  WHEN category ILIKE '%festival%' OR category ILIKE '%kültür%' OR category ILIKE '%kultur%'
    THEN 'Şanlıurfa Valiliği Kültür ve Turizm Müdürlüğü'
  WHEN category ILIKE '%müzik%' OR category ILIKE '%muzik%' OR category ILIKE '%sanat%'
    THEN 'Şanlıurfa Büyükşehir Belediyesi Kültür Merkezi'
  WHEN category ILIKE '%spor%'
    THEN 'Şanlıurfa Büyükşehir Belediyesi Spor A.Ş.'
  WHEN category ILIKE '%turizm%'
    THEN 'Şanlıurfa Kültür ve Turizm Müdürlüğü'
  WHEN category ILIKE '%gastronomi%' OR category ILIKE '%yemek%'
    THEN 'Şanlıurfa Büyükşehir Belediyesi ve TÜRKONFED'
  WHEN category ILIKE '%eğitim%' OR category ILIKE '%egitim%'
    THEN 'Harran Üniversitesi'
  WHEN category ILIKE '%çocuk%' OR category ILIKE '%aile%'
    THEN 'Şanlıurfa Büyükşehir Belediyesi Sosyal Hizmetler'
  ELSE 'Şanlıurfa Büyükşehir Belediyesi'
END
WHERE status = 'published' AND (organizer IS NULL OR organizer = '');

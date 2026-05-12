-- Çalışma saatleri eksik olan mekanlar için kategori bazlı varsayılan saatler
-- Sadece opening_hours IS NULL olan mekanları günceller (idempotent).

BEGIN;

-- Ortak saatler sabitleri (JSON)
-- Restoran / yeme-içme: her gün 10:00-23:00
-- Cafe / kahvaltı: her gün 08:00-23:00
-- Tatlıcı / pastane: her gün 09:00-22:00
-- Otel: 7/24
-- Tarihi yer / müze: her gün 08:30-19:00 (yaz saati)
-- Alışveriş / AVM: her gün 10:00-22:00
-- Banka / finans: Pzt-Cum 09:00-17:30
-- Eğitim / üniversite: Pzt-Cum 08:00-18:00
-- Sağlık / hastane: Pzt-Cum 08:00-18:00, Cmt 08:00-13:00
-- Otomotiv / galeri: Pzt-Cum 09:00-18:00, Cmt 09:00-14:00
-- Medya: Pzt-Cum 09:00-18:00
-- Tarım: Pzt-Cmt 08:00-18:00
-- Diğer hizmetler: her gün 09:00-19:00

UPDATE places p
SET
  opening_hours = CASE
    -- Restoran, kebapçı, yeme-içme
    WHEN c.name ILIKE '%restoran%' OR c.name ILIKE '%kebap%'
      OR c.name ILIKE '%yeme%' OR c.name ILIKE '%lokanta%'
      THEN '{"mon":"10:00-23:00","tue":"10:00-23:00","wed":"10:00-23:00","thu":"10:00-23:00","fri":"10:00-23:00","sat":"10:00-23:00","sun":"10:00-23:00"}'::jsonb

    -- Cafe
    WHEN c.name ILIKE '%cafe%' OR c.name ILIKE '%kahve%'
      THEN '{"mon":"08:00-23:00","tue":"08:00-23:00","wed":"08:00-23:00","thu":"08:00-23:00","fri":"08:00-23:00","sat":"08:00-23:00","sun":"08:00-23:00"}'::jsonb

    -- Kahvaltı
    WHEN c.name ILIKE '%kahvalt%'
      THEN '{"mon":"07:00-14:00","tue":"07:00-14:00","wed":"07:00-14:00","thu":"07:00-14:00","fri":"07:00-14:00","sat":"07:00-15:00","sun":"07:00-15:00"}'::jsonb

    -- Tatlıcı / pastane
    WHEN c.name ILIKE '%tatlı%' OR c.name ILIKE '%pastane%' OR c.name ILIKE '%baklava%'
      THEN '{"mon":"09:00-22:00","tue":"09:00-22:00","wed":"09:00-22:00","thu":"09:00-22:00","fri":"09:00-22:00","sat":"09:00-22:00","sun":"10:00-21:00"}'::jsonb

    -- Otel / konaklama
    WHEN c.name ILIKE '%otel%' OR c.name ILIKE '%konaklama%' OR c.name ILIKE '%pansiyon%'
      THEN '{"mon":"00:00-23:59","tue":"00:00-23:59","wed":"00:00-23:59","thu":"00:00-23:59","fri":"00:00-23:59","sat":"00:00-23:59","sun":"00:00-23:59"}'::jsonb

    -- Tarihi yer / müze / turizm
    WHEN c.name ILIKE '%tarihi%' OR c.name ILIKE '%müze%' OR c.name ILIKE '%turizm%'
      OR c.name ILIKE '%ören%' OR c.name ILIKE '%antik%'
      THEN '{"mon":"08:30-19:00","tue":"08:30-19:00","wed":"08:30-19:00","thu":"08:30-19:00","fri":"08:30-19:00","sat":"08:30-19:00","sun":"08:30-19:00"}'::jsonb

    -- Dini mekan / cami
    WHEN c.name ILIKE '%dini%' OR c.name ILIKE '%cami%' OR c.name ILIKE '%ibadet%'
      THEN '{"mon":"05:00-22:00","tue":"05:00-22:00","wed":"05:00-22:00","thu":"05:00-22:00","fri":"05:00-22:00","sat":"05:00-22:00","sun":"05:00-22:00"}'::jsonb

    -- AVM / alışveriş merkezi
    WHEN c.name ILIKE '%avm%' OR c.name ILIKE '%alışveriş%' OR c.name ILIKE '%market%'
      THEN '{"mon":"10:00-22:00","tue":"10:00-22:00","wed":"10:00-22:00","thu":"10:00-22:00","fri":"10:00-22:00","sat":"10:00-22:00","sun":"10:00-22:00"}'::jsonb

    -- Çarşı / pazar
    WHEN c.name ILIKE '%çarşı%' OR c.name ILIKE '%pazar%' OR c.name ILIKE '%bazaar%'
      THEN '{"mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00","fri":"09:00-18:00","sat":"09:00-19:00","sun":"10:00-17:00"}'::jsonb

    -- Banka / finans / sigorta
    WHEN c.name ILIKE '%banka%' OR c.name ILIKE '%finans%' OR c.name ILIKE '%sigorta%'
      OR c.name ILIKE '%hukuk%' OR c.name ILIKE '%avukat%' OR c.name ILIKE '%noter%'
      THEN '{"mon":"09:00-17:30","tue":"09:00-17:30","wed":"09:00-17:30","thu":"09:00-17:30","fri":"09:00-17:30"}'::jsonb

    -- Eğitim / okul / üniversite
    WHEN c.name ILIKE '%eğitim%' OR c.name ILIKE '%okul%' OR c.name ILIKE '%üniversite%'
      OR c.name ILIKE '%dershane%' OR c.name ILIKE '%kurs%'
      THEN '{"mon":"08:00-18:00","tue":"08:00-18:00","wed":"08:00-18:00","thu":"08:00-18:00","fri":"08:00-17:00"}'::jsonb

    -- Sağlık / hastane / klinik / eczane
    WHEN c.name ILIKE '%sağlık%' OR c.name ILIKE '%hastane%' OR c.name ILIKE '%klinik%'
      OR c.name ILIKE '%eczane%' OR c.name ILIKE '%doktor%'
      THEN '{"mon":"08:00-18:00","tue":"08:00-18:00","wed":"08:00-18:00","thu":"08:00-18:00","fri":"08:00-18:00","sat":"08:00-13:00"}'::jsonb

    -- Veteriner / tarım / hayvancılık
    WHEN c.name ILIKE '%veteriner%' OR c.name ILIKE '%tarım%' OR c.name ILIKE '%hayvancılık%'
      THEN '{"mon":"08:00-18:00","tue":"08:00-18:00","wed":"08:00-18:00","thu":"08:00-18:00","fri":"08:00-18:00","sat":"08:00-14:00"}'::jsonb

    -- Otomotiv / araç / galeri
    WHEN c.name ILIKE '%otomotiv%' OR c.name ILIKE '%araç%' OR c.name ILIKE '%galerisi%'
      OR c.name ILIKE '%lastik%' OR c.name ILIKE '%tamirhane%'
      THEN '{"mon":"09:00-18:30","tue":"09:00-18:30","wed":"09:00-18:30","thu":"09:00-18:30","fri":"09:00-18:30","sat":"09:00-14:00"}'::jsonb

    -- Medya / TV / gazete
    WHEN c.name ILIKE '%medya%' OR c.name ILIKE '%gazete%' OR c.name ILIKE '%radyo%'
      OR c.name ILIKE '%tv%'
      THEN '{"mon":"09:00-18:00","tue":"09:00-18:00","wed":"09:00-18:00","thu":"09:00-18:00","fri":"09:00-17:00"}'::jsonb

    -- İş dünyası / OSB / fabrika / sanayi
    WHEN c.name ILIKE '%iş%' OR c.name ILIKE '%osb%' OR c.name ILIKE '%fabrika%'
      OR c.name ILIKE '%sanayi%' OR c.name ILIKE '%tekstil%'
      THEN '{"mon":"08:00-18:00","tue":"08:00-18:00","wed":"08:00-18:00","thu":"08:00-18:00","fri":"08:00-17:00"}'::jsonb

    -- Eğlence / spor / kültür
    WHEN c.name ILIKE '%eğlence%' OR c.name ILIKE '%spor%' OR c.name ILIKE '%kültür%'
      OR c.name ILIKE '%sinema%' OR c.name ILIKE '%tiyatro%'
      THEN '{"mon":"10:00-22:00","tue":"10:00-22:00","wed":"10:00-22:00","thu":"10:00-22:00","fri":"10:00-23:00","sat":"10:00-23:00","sun":"10:00-22:00"}'::jsonb

    -- Emlak / gayrimenkul
    WHEN c.name ILIKE '%emlak%' OR c.name ILIKE '%gayrimenkul%' OR c.name ILIKE '%inşaat%'
      THEN '{"mon":"09:00-18:00","tue":"09:00-18:00","wed":"09:00-18:00","thu":"09:00-18:00","fri":"09:00-18:00","sat":"10:00-15:00"}'::jsonb

    -- Varsayılan: genel hizmet saatleri
    ELSE '{"mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00","fri":"09:00-19:00","sat":"09:00-18:00","sun":"10:00-17:00"}'::jsonb
  END,
  updated_at = NOW()
FROM categories c
WHERE p.category_id = c.id
  AND p.opening_hours IS NULL
  AND p.status = 'active';

-- Kalan NULL'lar (kategori eşleşmeyenler) için genel varsayılan
UPDATE places
SET opening_hours = '{"mon":"09:00-18:00","tue":"09:00-18:00","wed":"09:00-18:00","thu":"09:00-18:00","fri":"09:00-18:00","sat":"09:00-14:00"}'::jsonb,
    updated_at = NOW()
WHERE opening_hours IS NULL AND status = 'active';

-- Özet
SELECT COUNT(*) AS guncellenen FROM places WHERE opening_hours IS NOT NULL;

COMMIT;

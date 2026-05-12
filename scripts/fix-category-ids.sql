-- Yanlış (NULL) category_id ile eklenen mekanları düzelt
-- Gerçek kategori ID'lerini kullan

-- ── Sağlık ──────────────────────────────────────────────────────────────
UPDATE places SET category_id = (SELECT id FROM categories WHERE name='Devlet hastaneleri' LIMIT 1)
WHERE slug IN ('sanliurfa-egitim-arastirma-hastanesi','hilvan-ilce-devlet-hastanesi','birecik-devlet-hastanesi');

UPDATE places SET category_id = (SELECT id FROM categories WHERE name='Üniversite hastaneleri' LIMIT 1)
WHERE slug = 'harran-universitesi-tip-hastanesi';

UPDATE places SET category_id = (SELECT id FROM categories WHERE name='Özel hastaneler' LIMIT 1)
WHERE slug = 'ozel-sanliurfa-medikal-park';

-- ── Aile ve Çocuk ────────────────────────────────────────────────────────
UPDATE places SET category_id = (SELECT id FROM categories WHERE name='Çocuk etkinlik merkezleri' LIMIT 1)
WHERE slug IN (
  'sanliurfa-hayvanat-bahcesi',
  'urfa-cocuk-bilim-muzesi',
  'balikligol-mini-golf-eglence-parki',
  'harran-cocuk-kultur-merkezi'
);

-- ── Hizmetler ────────────────────────────────────────────────────────────
UPDATE places SET category_id = (SELECT id FROM categories WHERE name='Organizasyon firmaları' LIMIT 1)
WHERE slug = 'sanliurfa-tursab-btu';

-- PTT ve Belediye için uygun alt kategori yok — kategoriyi Ulaşım altına değil, şimdilik kaldır
-- Bu iki mekan başka kategorilere taşındı (Resmi Kurumlar)
UPDATE places SET category_id = (
  SELECT c.id FROM categories c
  JOIN categories cp ON c.parent_id = cp.id
  WHERE cp.name = 'Resmi Kurumlar'
  LIMIT 1
)
WHERE slug IN (
  'sanliurfa-ptt-basmudurluğu',
  'sanliurfa-buyuksehir-belediyesi-hizmet-binasi'
);

-- ── Ulaşım ───────────────────────────────────────────────────────────────
UPDATE places SET category_id = (SELECT id FROM categories WHERE name='Otogar' LIMIT 1)
WHERE slug = 'sanliurfa-sehirlerarasi-otobus-terminali';

UPDATE places SET category_id = (SELECT id FROM categories WHERE name='Havalimanı' LIMIT 1)
WHERE slug = 'gap-havalimani-sanliurfa';

UPDATE places SET category_id = (SELECT id FROM categories WHERE name='Tren garı' LIMIT 1)
WHERE slug = 'sanliurfa-tcdd-gari';

-- ── Konaklama — kontrol ──────────────────────────────────────────────────
-- (konaklama seed ayrı dosyadan doğru geldi, sadece doğrulama)

-- Özet
SELECT cp.name AS kategori, COUNT(p.id) AS mekan_sayisi
FROM categories cp
LEFT JOIN categories c ON c.parent_id = cp.id
LEFT JOIN places p ON p.category_id = c.id AND p.status='active'
WHERE cp.parent_id IS NULL
ORDER BY mekan_sayisi DESC, cp.name;

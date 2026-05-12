-- Şanlıurfa mahalleleri seed
-- Eyyübiye, Haliliye, Karaköprü öncelikli

INSERT INTO neighborhoods (name, slug, district_id) VALUES

-- ── EYYÜBİYE (id=1) ─────────────────────────────────────────────────────────
('Cumhuriyet Mahallesi',     'cumhuriyet-mahallesi',              1),
('Dedebağı Mahallesi',       'dedebagi-mahallesi',                1),
('Osmanbey Mahallesi',       'osmanbey-mahallesi',                1),
('Bahçelievler Mahallesi',   'bahcelievler-mahallesi-eyyubiye',   1),
('Bediüzzaman Mahallesi',    'bediuzzaman-mahallesi',             1),
('Kültür Mahallesi',         'kultur-mahallesi-eyyubiye',         1),
('Şehitlik Mahallesi',       'sehitlik-mahallesi',                1),
('Mehmet Akif Mahallesi',    'mehmet-akif-mahallesi',             1),
('Pınarbaşı Mahallesi',      'pinarbasi-mahallesi',               1),
('Yenice Mahallesi',         'yenice-mahallesi-eyyubiye',         1),

-- ── HALİLİYE (id=2) ─────────────────────────────────────────────────────────
('Yenişehir Mahallesi',      'yenisehir-mahallesi',               2),
('Güzel Mahallesi',          'guzel-mahallesi',                   2),
('Yenibağlar Mahallesi',     'yenibaglar-mahallesi',              2),
('Kaldırım Mahallesi',       'kaldırim-mahallesi',                2),
('Öğretmenevleri Mahallesi', 'ogretmenevleri-mahallesi',          2),
('Adalet Mahallesi',         'adalet-mahallesi',                  2),
('Akarbaşı Mahallesi',       'akarbasi-mahallesi',                2),
('Karaköy Mahallesi',        'karakoy-mahallesi-haliliye',        2),

-- ── KARAKÖPRÜ (id=3) ─────────────────────────────────────────────────────────
('Merkez Mahallesi',         'merkez-mahallesi-karakopru',        3),
('Güvercinlik Mahallesi',    'guvercinlik-mahallesi',             3),
('Demirci Mahallesi',        'demirci-mahallesi',                 3),
('Çamurlu Mahallesi',        'camurlu-mahallesi',                 3),
('İbrahimli Mahallesi',      'ibrahimli-mahallesi',               3)

ON CONFLICT (slug, district_id) DO NOTHING;

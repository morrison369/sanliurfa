SELECT id, slug, name FROM categories
WHERE parent_id IS NOT NULL AND is_active = true
AND slug IN (
  'yeme-icme-restoranlar','yeme-icme-kahvehaneler','saglik-eczaneler',
  'konaklama-oteller','alisveris-kuyumcular','dini-ve-kulturel-yerler-camiler',
  'spor-ve-fitness-spor-salonlari','hizmetler-berberler',
  'tarim-ve-hayvancilik','yeme-icme-pastaneler',
  'alisveris-marketler','egitim-kurslar'
)
ORDER BY slug;

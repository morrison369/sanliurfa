SELECT COUNT(*) as koordinatsiz FROM app.places WHERE status = 'active' AND (latitude IS NULL OR longitude IS NULL);
SELECT COUNT(*) as koordinatli FROM app.places WHERE status = 'active' AND latitude IS NOT NULL AND longitude IS NOT NULL;
SELECT COUNT(*) as toplam_aktif FROM app.places WHERE status = 'active';

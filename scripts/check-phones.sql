-- Türkçe telefon numarası gerçekçi ata (Şanlıurfa 414 alan kodu)
SELECT slug, name, category_id 
FROM places 
WHERE phone IS NULL AND status='active'
ORDER BY name
LIMIT 35;

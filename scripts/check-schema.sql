SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'places' 
  AND column_name ILIKE '%image%' OR column_name ILIKE '%thumb%' OR column_name ILIKE '%photo%'
ORDER BY column_name;

SELECT 
  TO_CHAR(start_date, 'YYYY-MM') AS ay,
  COUNT(*) AS etkinlik_sayisi
FROM events WHERE status='published'
GROUP BY TO_CHAR(start_date, 'YYYY-MM')
ORDER BY ay;

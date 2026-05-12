SELECT cp.name AS parent, c.name AS sub
FROM categories cp
JOIN categories c ON c.parent_id = cp.id
WHERE cp.name IN ('Emlak','Ev ve Yaşam','Hukuk ve Finans','İş Dünyası ve Sanayi','Medya ve İletişim','Otomotiv','Tarım ve Hayvancılık')
ORDER BY cp.name, c.name;

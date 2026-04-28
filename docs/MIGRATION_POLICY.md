# Migration Policy

- Eski migration dosyalari rename edilmez.
- `schema_migrations.version` dosya adindan uretildigi icin rename islemi eski veritabanlarinda migration'i tekrar pending gosterebilir.
- Tarihi duplicate migration kayitlari `docs/migration-duplicate-baseline.json` ile sinirlanir.
- Yeni duplicate number veya slug regresyonu gate tarafindan yakalanir.
- Yeni migration dosyalari `NNN_slug.ts` formatinda ve benzersiz number/slug ile eklenir.

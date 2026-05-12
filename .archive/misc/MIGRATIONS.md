# Veritabanı Migrasyonları

Bu dokümanda veritabanı migrasyonları sisteminin nasıl kullanılacağı açıklanmıştır.

## Genel Bakış

Migrasyon sistemi, veritabanı şemasındaki değişiklikleri yönetmek için kullanılır:
- Yeni tablolar oluşturma
- Sütun ekleme/değiştirme/silme
- İndeks oluşturma/silme
- Veri dönüşümleri

Her migrasyon iki yöne sahiptir:
- **up**: Değişikliği uygula
- **down**: Değişikliği geri al

## Migrasyonları Çalıştırma

### Tüm migrasyonları çalıştır
```bash
npm run migrate
```

Bu komut:
1. `migrations` tablosunu oluşturur (henüz yoksa)
2. Henüz çalıştırılmamış migrasyonları bulur
3. Her migrasyonu sırasıyla çalıştırır
4. Her migrasyonu geçmişte kaydeder

### Migrasyon durumunu kontrol et
```bash
npm run migrate:status
```

Çıktı:
```
📋 Migrasyon Durumu

Çalıştırılan migrasyonlar:
  ✓ 001_initial_schema
    Temel tablo yapısı: users, places, reviews, favorites
    07.04.2026 12:30:45

Beklenen migrasyonlar:
  ✓ 001_initial_schema
    Temel tablo yapısı: users, places, reviews, favorites

✅ Tüm migrasyonlar senkronize
```

### Son migrasyonu geri al
```bash
npm run migrate:rollback
```

Bu komut:
1. Son çalıştırılan migrasyonu bulur
2. `down` fonksiyonunu çalıştırır
3. Geçmişten kaydı siler

## Yeni Migrasyon Oluşturma

### 1. Migrasyon dosyası oluştur

`src/migrations/002_add_user_profile.ts`:
```typescript
import type { Migration } from '../lib/migrations';

export const migration_002_add_user_profile: Migration = {
  version: '002_add_user_profile',
  description: 'Kullanıcı profiline yeni sütunlar ekleme',

  up: async (pool: any) => {
    // Tabloya sütun ekle
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

      CREATE INDEX IF NOT EXISTS idx_users_verified ON users(verified);
    `);
  },

  down: async (pool: any) => {
    // Sütunları sil
    await pool.query(`
      DROP INDEX IF EXISTS idx_users_verified;
      ALTER TABLE users DROP COLUMN IF EXISTS bio;
      ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
      ALTER TABLE users DROP COLUMN IF EXISTS verified;
    `);
  }
};
```

### 2. `src/lib/init-migrations.ts`'e ekle

```typescript
import { migration_002_add_user_profile } from '../migrations/002_add_user_profile';

const ALL_MIGRATIONS = [
  migration_001_initial_schema,
  migration_002_add_user_profile  // ← BURAYA EKLE
];
```

### 3. Migrasyonu test et

```bash
npm run migrate
```

Durumu kontrol et:
```bash
npm run migrate:status
```

## Migrasyon Örnekleri

### Tablo oluşturma
```typescript
await pool.query(`
  CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
`);
```

### Sütun ekleme
```typescript
await pool.query(`
  ALTER TABLE places ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
  CREATE INDEX IF NOT EXISTS idx_places_featured ON places(featured);
`);
```

### Sütun değiştirme
```typescript
await pool.query(`
  ALTER TABLE users ALTER COLUMN email SET NOT NULL;
  ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
`);
```

### Veri dönüşümü
```typescript
// Var olan verileri dönüştür
await pool.query(`
  UPDATE users SET verified = false WHERE verified IS NULL;
`);

// Sütunu zorunlu yap
await pool.query(`
  ALTER TABLE users ALTER COLUMN verified SET NOT NULL;
`);
```

### Foreign Key ekleme
```typescript
await pool.query(`
  ALTER TABLE reviews
  ADD CONSTRAINT fk_reviews_place_id
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE;
`);
```

### İndeks oluşturma (hız için)
```typescript
// Sık sorgulanan sütunlar için indeks
await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
  CREATE INDEX IF NOT EXISTS idx_places_rating ON places(rating DESC);

  -- Birleşik indeks
  CREATE INDEX IF NOT EXISTS idx_favorites_user_place
  ON favorites(user_id, place_id);
`);
```

## En İyi Uygulamalar

### ✅ YAPMALI

1. **Her migrasyonu testleri ile birlikte yaz**
   ```typescript
   // up
   await pool.query('ALTER TABLE users ADD COLUMN age INTEGER');

   // down - tam tersi işlemi yap
   await pool.query('ALTER TABLE users DROP COLUMN age');
   ```

2. **IF EXISTS / IF NOT EXISTS kullan** (emniyetli)
   ```typescript
   CREATE TABLE IF NOT EXISTS ...
   DROP TABLE IF EXISTS ...
   CREATE INDEX IF NOT EXISTS ...
   ```

3. **Foreign key constraints kontrol et**
   ```typescript
   // Silme işleminde uygun cascade ayarla
   FOREIGN KEY (...) REFERENCES ... ON DELETE CASCADE
   ```

4. **Açıklayıcı migrasyon isimleri kullan**
   ```
   001_initial_schema
   002_add_user_profile
   003_create_categories_table
   004_add_place_verification
   ```

5. **Boş olmayan sütunlara default değer ver**
   ```typescript
   ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT false;
   ```

### ❌ YAPMAMALI

1. **Üretim veritabanında manuel değişiklik yapma**
   - Her zaman migrasyon oluş
   - Manuel değişiklikler geçmiş ile senkronizasyonu bozar

2. **Migrasyon olmadan tablo sil**
   - Rollback imkanı olmaz
   - Veri geri kurtarılamaz

3. **Null olan sütun zorunlu hale getirme (veri olmadan)**
   ```typescript
   // ❌ YANLIŞ - Eski veriler NULL'dır
   ALTER TABLE users ADD COLUMN status VARCHAR NOT NULL;

   // ✅ DOĞRU - Önce default değer ekle
   ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'active';
   UPDATE users SET status = 'active' WHERE status IS NULL;
   ALTER TABLE users ALTER COLUMN status SET NOT NULL;
   ```

4. **Çok büyük veri dönüşümleri**
   - İlk önce küçük veri setinde test et
   - Gerçek uygulamada zaman aşımına gidebilir
   - Gerekirse birden fazla migrasyona böl

## Sorun Giderme

### Migrasyon takılı kaldı
```bash
# Durumu kontrol et
npm run migrate:status

# Son migrasyonu geri al
npm run migrate:rollback

# Hataları düzelt ve tekrar çalıştır
npm run migrate
```

### "Migrasyon zaten var" hatası
```
Error: duplicate key value violates unique constraint "migrations_version_key"
```

Çözüm:
```typescript
// Veritabanına doğrudan sor
docker exec -it sanliurfa-postgres psql -U postgres -d sanliurfa
SELECT * FROM migrations;
```

### Foreign key kısıtlaması hatası
```
Error: insert or update on table "reviews" violates foreign key constraint "fk_reviews_place_id"
```

Çözüm:
```typescript
// Eski kayıtları temizle veya güncellle
DELETE FROM reviews WHERE place_id NOT IN (SELECT id FROM places);

// Veya foreign key'i güncelle
UPDATE reviews SET place_id = NULL WHERE place_id NOT IN (SELECT id FROM places);
```

## Migrasyon Geçmişi

Migrasyon geçmişi `migrations` tablosunda saklanır:

```sql
SELECT * FROM migrations ORDER BY executed_at;
```

Sonuç:
```
 id | version              | description                        | executed_at
----|----------------------|-----------------------------------|---------------------
  1 | 001_initial_schema   | Temel tablo yapısı: users, places | 2026-04-07 12:30:45
```

## Otomatik Çalıştırma

Uygulama başında migrasyonlar otomatik olarak çalıştırılır. Uygulamayı başlatırsanız:

```bash
npm run dev
```

Migrasyonlar otomatik olarak kontrol edilir ve gerekirse çalıştırılır.

## Deployment'da Migrasyonlar

Üretim ortamında:

1. **Uygulamayı durdur**
   ```bash
   docker-compose down
   ```

2. **Backup al**
   ```bash
   npm run backup
   ```

3. **Migrasyonları çalıştır**
   ```bash
   npm run migrate
   ```

4. **Uygulamayı başlat**
   ```bash
   docker-compose up -d
   ```

5. **Health kontrol et**
   ```bash
   curl http://localhost:3000/api/health
   ```

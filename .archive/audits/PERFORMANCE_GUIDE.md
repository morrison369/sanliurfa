# ⚡ Performance Optimization Guide

Şanlıurfa.com'un hızını maksimize etmek için bir kaç önemli adım.

## 1. 🗜️ Compression Konfigürasyonu

Nginx'te **Gzip compression** etkinleştir (`.github/workflows/ci.yml` ve Nginx config'de):

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1000;
gzip_proxied any;
gzip_types text/plain text/css text/xml text/javascript
           application/json application/javascript application/xml+rss
           application/atom+xml image/svg+xml;
gzip_comp_level 6;
```

**Etki**: %60-70 bandwidth tasarrufu

---

## 2. 🖼️ Image Optimization

### Astro Image Component Kullan
```astro
---
import { Image } from 'astro:assets';
import blog1 from '../images/blog-1.webp';
---

<Image
  src={blog1}
  alt="Blog yazısı"
  width={800}
  height={450}
  loading="lazy"
/>
```

### Batch Image Conversion
```bash
# WebP dönüştürme (sharp kullan)
npm install -g imagemin imagemin-webp

# Tüm JPG/PNG'leri WebP'ye dönüştür
imagemin public/images/**/*.{jpg,png} --out-dir=public/images --plugin=webp
```

**Etki**: %50-70 daha küçük dosyalar

---

## 3. ⚡ Caching Stratejisi

### Service Worker Cache
```typescript
// public/service-worker.js
const CACHE_STRATEGY = {
  'static': { maxAge: 31536000 },      // 1 yıl: JS, CSS
  'images': { maxAge: 2592000 },       // 30 gün: resimler
  'api': { maxAge: 300 },              // 5 dakika: API
  'html': { maxAge: 3600 }             // 1 saat: HTML
};
```

### Redis Cache Pattern
```typescript
// Blog yazılarını 30 dakika cache'le
const cacheKey = 'sanliurfa:blog:posts:list';
const cached = await getCache<BlogPost[]>(cacheKey);
if (cached) return cached;

const posts = await queryMany(...);
await setCache(cacheKey, JSON.stringify(posts), 1800);
```

**Etki**: API response time %80 azalış

---

## 4. 📊 Database Optimization

### Indexes Kontrol Et
```sql
-- Sık sorgulanan alanlar için index ekle
CREATE INDEX idx_blog_posts_status ON blog_posts(status) WHERE status = 'published';
CREATE INDEX idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX idx_comments_post ON blog_comments(post_id);
CREATE INDEX idx_subscriptions_user ON push_subscriptions(user_id);

-- Index listesini kontrol et
SELECT * FROM pg_indexes WHERE tablename = 'blog_posts';
```

### Query Optimization
```sql
-- EXPLAIN analizi
EXPLAIN ANALYZE
SELECT * FROM blog_posts bp
LEFT JOIN blog_comments bc ON bp.id = bc.post_id
WHERE bp.status = 'published'
ORDER BY bp.published_at DESC
LIMIT 10;

-- Sonuç: Index kullanan sorgu < 5ms
```

**Etki**: Slow query'ler %90 hızlandırılır

---

## 5. 🚀 Bundle Size Optimization

### Astro Build Analiz
```bash
npm run build

# İstatistik kontrol et
du -sh dist/
ls -lah dist/_astro/

# Büyük files bulundu mu?
find dist/_astro -name "*.js" -exec wc -c {} \; | sort -rn | head
```

### Unused Dependencies Kaldır
```bash
npm install -g depcheck
depcheck

# Sonuç: bakan dependencies, kaldırılması güvenli
```

---

## 6. 💾 Redis Optimization

### Key Expiration Kontrol
```javascript
// Redis CLI
redis-cli

> INFO keyspace
> DBSIZE
> KEYS sanliurfa:blog:*

// Eski keys'leri temizle
> KEYS sanliurfa:*
> DEL key1 key2 key3
```

### Memory Usage Monitor
```bash
redis-cli
> INFO memory
# Hedef: < 100MB

> CONFIG GET maxmemory-policy
# Policy: allkeys-lru (eski keys'leri sil)
```

---

## 7. 📈 Monitoring ve Profiling

### Lighthouse Score Kontrol
```bash
# Chrome DevTools ile
npm run build && npm run preview
# DevTools > Lighthouse > Analyze

# Hedef skorlar:
# Performance: 90+
# Accessibility: 95+
# Best Practices: 90+
# SEO: 100
```

### Performance API Kullan
```typescript
// Frontend'de
performance.mark('blog-fetch-start');
const posts = await fetch('/api/blog/posts');
performance.mark('blog-fetch-end');

const measure = performance.measure('blog-fetch', 'blog-fetch-start', 'blog-fetch-end');
console.log(`Blog fetch: ${measure.duration}ms`);
```

### Backend Metrics
```bash
# Admin dashboard kontrol et
curl -H "Cookie: auth-token=TOKEN" https://sanliurfa.com/api/performance

# Hedef:
# - Avg request: < 200ms
# - P95: < 500ms
# - Error rate: < 0.1%
```

---

## 8. 🔍 Common Performance Issues

| Sorun | Sebep | Çözüm |
|-------|-------|-------|
| **Yavaş API** | N+1 query | JOIN kullan, caching ekle |
| **Büyük bundle** | Unused code | Tree-shaking, depcheck |
| **Yavaş image** | Optimize edilmemiş | WebP dönüştürme |
| **Memory leak** | Unused objects | Service Worker cleanup |
| **Slow DB** | Missing indexes | EXPLAIN ANALYZE |

---

## 9. ✅ Performance Checklist

### Before Production
- [ ] `npm run build` < 30 seconds
- [ ] Final bundle < 1MB
- [ ] Gzip compression enabled
- [ ] Image optimization complete
- [ ] All images WebP format
- [ ] Cache headers configured
- [ ] Lighthouse score > 90
- [ ] Database indexes created
- [ ] Redis TTL configured
- [ ] API response time < 200ms avg

### Ongoing
- [ ] Weekly: `npm audit`
- [ ] Weekly: Performance metrics review
- [ ] Weekly: Error rate check
- [ ] Monthly: Database VACUUM ANALYZE
- [ ] Monthly: Lighthouse re-audit
- [ ] Quarterly: Dependency update

---

## 10. 🎯 Performance Goals (SLA)

| Metrik | Target | Current |
|--------|--------|---------|
| Page Load | < 2s | ___ |
| API Response | < 200ms | ___ |
| Lighthouse | > 90 | ___ |
| Core Web Vitals | Green | ___ |
| Error Rate | < 0.1% | ___ |
| Uptime | > 99.9% | ___ |

---

## 11. 🔗 Kaynaklar

- [Astro Performance Tips](https://docs.astro.build/en/guides/performance/)
- [Web Vitals Guide](https://web.dev/vitals/)
- [PostgreSQL Optimization](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Redis Memory Optimization](https://redis.io/topics/memory-optimization)
- [Nginx Performance Tuning](https://nginx.org/en/docs/)

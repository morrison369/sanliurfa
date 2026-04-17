# Astro-Only Migration Backlog

Bu belge aktif migration backlog'u olmaktan çıktı. Migration hattı runtime düzeyinde kapandı ve artık kapanış/koruma kurallarını taşır.

## Durum

2026-04-17 itibarıyla:

- `.astro`: generated inventory raporundan okunur
- `.tsx`: `0`
- `client:*` hydration noktası: `0`
- risk split: `0 low / 0 medium / 0 high`
- high-risk feasibility: `0 first / 0 later / 0 last`
- React hook/lib blokörü: `0`
- config dışı runtime React sahibi: `0`
- kalan tek uyumluluk sahibi:
  - `astro.config.mjs`

## Migration Sonucu

Tamamlanan dalgalar sonunda:

- tüm aktif React island yüzeyi kaldırıldı
- kullanıcı, işletme, admin, analytics, webhook, messaging ve moderation panelleri `.astro` + plain TS modeline taşındı
- eski `.tsx` yüzeyi runtime'dan koptuktan sonra tamamen temizlendi
- React paketleri ise ekip kararıyla uyumluluk katmanı olarak korundu

## Bundan Sonraki Kural

Bu dosya artık “hangi panel sıradaki aday” listesini değil, regresyon kurallarını taşır.

### 1. Yeni varsayılan

- yeni UI yüzeyi varsayılan olarak `.astro`
- etkileşim gerekiyorsa düz TypeScript tarayıcı yardımcısı
- React ancak açık ve bilinçli karar ile geri dönebilir

### 2. Guard zorunluluğu

Aşağıdaki komutlar görünürlük ve regresyon kontrolü için korunur:

- `npm run astro:migration:inventory`
- `npm run astro:migration:high-risk`
- `npm run astro:react:audit`
- `npm run astro:react:classify`
- `npm run astro:react:guard`

Özellikle:

- `astro:react:guard` config dışı runtime bağlantılı React arayüz yüzeyi geri dönerse fail vermelidir

### 3. React paket kararı

- `@astrojs/react` kaldırma backlog'u yok
- `react` ve `react-dom` kaldırma backlog'u yok
- paket kaldırma ancak ayrıca ve açıkça istenirse ele alınır

### 4. Yeni migration gerekirse

Gelecekte React tekrar kullanılır ve yeni hydration oluşursa sıra yeniden şu şekilde kurulur:

1. `npm run astro:migration:inventory`
2. `low` bucket varsa önce onu temizle
3. `low=0` ise `medium` bucket
4. `medium=0` ise `npm run astro:migration:high-risk`
5. high-risk seçiminde business-risk ve test maliyeti birlikte değerlendirilir

## Kapanış Çıktıları

Migration hattının kapanışında sabitlenen kaynak-gerçek yüzeyleri:

- [ASTRO_ONLY_MIGRATION_ASSESSMENT.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/architecture/ASTRO_ONLY_MIGRATION_ASSESSMENT.md)
- [astro-hydration-inventory.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/astro-hydration-inventory.md)
- [astro-high-risk-feasibility.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/astro-high-risk-feasibility.md)
- [react-surface-audit.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/react-surface-audit.md)
- [react-surface-classification.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/react-surface-classification.md)

## Sonraki Mantıklı İşler

Migration backlog'u bitti. Bundan sonraki mantıklı işler:

1. ürün veya admin feature geliştirmesi
2. runtime guard ve ops raporlarının taze tutulması
3. gerekirse yeni React yüzeyi açılmadan önce mimari karar kaydı eklenmesi

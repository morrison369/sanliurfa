# DB-First Platform Expansion

Bu doküman, `Sanliurfa.com` için admin-first şehir portalı omurgasının hangi tablolar ve API yüzeyi üzerinden yönetileceğini tanımlar.

## Amaç

Tek hedef, public deneyimde görünen kritik alanları dağınık sabitlerden çıkarıp veritabanı ve admin API üzerinden yönetilebilir hale getirmektir.

Kapsam:
- ana sayfa section registry
- şehir servis registry
- entity bazlı SEO override katmanı
- medya kütüphanesi ile bağlantılı içerik yönetimi
- medya kullanım ilişkisi registry

## Yeni Tablolar

### `homepage_sections`

Landing ve ana sayfa bloklarının tek kayıt tablosudur.

Alanlar:
- `section_key`
- `title`
- `description`
- `config`
- `is_active`
- `sort_order`

Kullanım:
- hangi section’ın aktif olduğu
- sıralama
- hangi veri kaynağıyla yönetildiği
- admin paneli ve landing parity kontrolü

### `site_service_entries`

Şehir servisleri için canlı registry tablosudur.

Alanlar:
- `service_key`
- `service_group`
- `title`
- `slug`
- `summary`
- `href`
- `icon`
- `badge`
- `freshness_key`
- `payload`
- `is_active`
- `sort_order`

İlk hedef grup:
- `city-services`

İlk kayıtlar:
- nöbetçi eczaneler
- otobüs saatleri
- uçak saatleri

### `seo_overrides`

Entity seviyesinde yönetilen SEO/AEO/GEO override tablosudur.

Alanlar:
- `entity_type`
- `entity_key`
- `canonical_path`
- `seo_payload`
- `is_active`

Kullanım:
- homepage, kategori, ilçe, mekan, blog gibi varlıklara özel override
- kısa cevap blokları
- focus keyword
- canonical ve answer block yönetimi

### `site_media_asset_usage`

DB-first medya varlıklarının hangi public varlıkta ve hangi placement içinde kullanıldığını saklar.

Alanlar:
- `asset_key`
- `entity_type`
- `entity_key`
- `placement_key`
- `metadata`

Kullanım:
- `homepage.hero.background` gibi asset anahtarlarının gerçek kullanım bağını izlemek
- ilçe, kategori ve ilçe-kategori hero görsellerini izlemek
- admin panelinde “hangi görsel nerede kullanılıyor” sorusuna tek kaynaktan cevap vermek

## Admin API

### `GET /api/admin/site/platform`

DB-first omurga özeti döner:
- section sayıları
- servis sayıları
- SEO override sayıları
- medya sayısı

### `GET|PUT|DELETE /api/admin/site/services`

Şehir servis registry yönetimi:
- listeleme
- kayıt ekleme/güncelleme
- silme

### `GET|PUT|DELETE /api/admin/site/seo-overrides`

Entity bazlı SEO override yönetimi:
- listeleme
- override ekleme/güncelleme
- silme

### `GET|PUT|DELETE /api/admin/site/homepage-sections`

Homepage section registry yönetimi:
- listeleme
- ekleme/güncelleme
- silme

### `GET|PUT|DELETE /api/admin/site/media-usage`

Medya kullanım ilişkisi yönetimi:
- listeleme
- ilişki ekleme/güncelleme
- silme

## Admin Görünürlüğü

`/admin/site-content` içinde yeni `DB-First Platform` özeti gösterilir.

Bu bileşen:
- registry sayaçlarını
- örnek homepage kayıtlarını
- örnek servis kayıtlarını
- örnek SEO override kayıtlarını
- medya kullanım ilişkisi sayısını
tek ekranda gösterir.

## Neden Bu Yapı

Bu genişleme şu problemleri çözer:
- landing bloklarının sadece JSON içinde kaybolması
- şehir servislerinin tek merkezde yönetilememesi
- SEO override’ların entity modeli olmadan dağınık kalması
- medya varlıklarının hangi sayfada kullanıldığının bilinmemesi
- admin paneli ile public deneyim arasında görünür sözleşme eksikliği

## Sonraki Adım

Bu omurganın üstüne eklenmesi gereken sonraki katmanlar:
- publish/draft/rollback desteğinin `site_service_entries`, `seo_overrides` ve `homepage_sections` için genişletilmesi
- media asset seçicisinin servis ve SEO kayıtlarına bağlanması
- mekan ve blog detay sayfalarının aynı registry yaklaşımına taşınması

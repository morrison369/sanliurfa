# Feature Audit Raporu — 2026-05-12

Sanliurfa.com'un üye/sosyal özelliklerinin durum ve iyileştirme önerileri.

## Mevcut Veri Durumu (prod DB)

| Tablo | Kayıt | Durum |
|---|---|---|
| users (toplam) | 24 | 22 user + 1 vendor + 1 admin (test fazı) |
| reviews | 1202 | **Tümü seed data**, 0 gerçek kullanıcı yorumu |
| review_photos | **0** | Foto yorum hiç kullanılmıyor |
| review_helpful | **0** | "Yararlı" oy hiç kullanılmıyor |
| review_responses | **0** | İşletme cevabı yok |
| review_flags | **0** | Şikayet sistemi atıl |
| user_match_profiles | 15 | Tinder profili oluşturmuş (62% adoption) |
| social_swipes | **2** | Neredeyse hiç swipe yok ⚠️ |
| social_matches | 1 | 1 match (test) |
| user_follows | 53 | **Aktif** sosyal takip |
| user_favorites | **0** | Favori sistemi atıl |
| user_blocks | **0** | Engelleme kullanılmıyor |
| community_photos | **0** | Topluluk foto yükleme atıl |
| place_photos | **0** | Mekan foto yükleme atıl |
| place_submissions | 0 | **Hiç üye mekan eklememiş** ⚠️ |
| place_claims | 0 | Hiç işletme sahiplenmemiş |
| event_attendees | 0 | RSVP/katılım yok |

---

## 1. Üyelere Özel Mekan Ekleme

### Mevcut Durum
- ✅ `/isletme-kayit` sayfası mevcut (308 satır, kapsamlı form)
- ✅ `submitPlaceApplication` Astro Action
- ✅ `place_submissions` DB tablosu
- ❌ **0 gerçek üye başvurusu** (yarı yıldır canlı)

### Sorunlar
1. **Discoverability**: Sayfa Footer'da yok, sadece kategori CTA'larında
2. **Login zorunlu değil** (anonymous user submit edebiliyor)
3. **Onay süreci belirsiz** — başvuran neden/ne zaman görür?
4. **Email notification yok** — admin onaylar ama user bildirim almıyor

### Öneriler
- ✅ Header/Footer'a "İşletmenizi Ekleyin" CTA ekle (login zorunlu)
- ✅ Login user için `/profil/isletmem` sekmesi (başvurularımı gör)
- ✅ Email notification: başvuru alındı + onaylandı/reddedildi
- ✅ `place_submissions.user_id` foreign key + view permission
- ✅ Onay sonrası **otomatik vendor role** yükseltme (user → vendor)
- ✅ Admin için onay UI iyileştirme (preview + 1-click approve)

---

## 2. Üye Etkinlik Ekleme (YOK)

### Mevcut Durum
- ❌ **Sayfa yok** (`/etkinlik-ekle` mevcut değil)
- ❌ **User-facing Action yok**
- ❌ **event_submissions tablosu yok**
- ✅ Admin için `createAdminEvent` mevcut

### Öneriler
- 🆕 Migration: `event_submissions` tablosu (user_id, title, description, start_date, location, image_url, status, admin_note)
- 🆕 `/etkinlik-ekle` sayfası (login zorunlu, places ile aynı form pattern)
- 🆕 `submitEventApplication` Astro Action
- 🆕 Admin onay flow: `/admin/event-submissions`
- 🆕 Onaylanan etkinlik → `events` tablosuna kopyalanır + sitemap günceller

---

## 3. Mekan Yorum + Puan

### Mevcut Durum
- ✅ `submitPlaceReview` Astro Action
- ✅ `reviews` tablosu (1202 seed data)
- ✅ AggregateRating Schema.org çalışıyor
- ❌ **review_photos: 0** — Foto yorum UI/Action yok
- ❌ **review_helpful: 0** — Yararlı oy UI yok
- ❌ **review_responses: 0** — İşletme cevap UI yok (vendor için)
- ❌ **review_flags: 0** — Şikayet UI yok

### Öneriler
- 🆕 **Foto yorum**: Yorum form'una max 4 foto upload (place_photos tablosu var, kullan)
- 🆕 **Yararlı oy**: Yorum kartına "👍 Yararlı (12)" buton + `/api/reviews/[id]/helpful` endpoint
- 🆕 **İşletme cevabı**: Vendor için yorum sayfasında "Cevap yaz" — `/vendor/yorumlar`
- 🆕 **Şikayet**: Yorum kartına "Şikayet et" → review_flags + admin moderation queue
- 🆕 **Yorum onayı**: Yeni yorumlar `status='pending'` → admin onay sonrası `'active'` (spam koruması)
- 🆕 **Yorum filtreleri**: Mekan sayfasında "En yararlı / En yeni / Fotoğraflı" tabs

---

## 4. Sosyal Medya / Topluluk

### Mevcut Durum
- ✅ `/topluluk` sayfası
- ✅ `user_follows` 53 (en aktif sosyal özellik!)
- ✅ Profil sayfaları (`/profil/index`, `/profil/aktivite`, vd.)
- ❌ `user_favorites: 0`, `user_blocks: 0`, `community_photos: 0`
- ❌ Sosyal feed/akış sayfası belirsiz
- ❌ DM/mesaj UI eksik olabilir

### Öneriler
- 🆕 **Aktivite Akışı (Feed)**: `/akis` sayfası — takip edilen kullanıcıların aktiviteleri
  - "Ahmet, Çulcuoğlu Restaurant'a 5★ verdi"
  - "Ayşe, Halfeti gezi rotasını favorilere ekledi"
  - "Mehmet, Sıra Gecesi etkinliğine katılacak"
- 🆕 **Favori sistemi tanıtımı**: Mekan kartlarında ❤️ buton (kapalı/açık state)
- 🆕 **Topluluk fotoğrafları**: Kullanıcı topluluk fotosu yükler (`community_photos`)
  - Foto ekle butonu `/topluluk/fotolar`
  - Like + comment
- 🆕 **Mesajlaşma**: Eşleşme + takip sonrası DM (`/mesajlar`)
- 🆕 **Profil sayfa zenginleştirme**: Bio, ilgi alanları, ziyaret ettiği yerler

---

## 5. Tinder/Eşleşme

### Mevcut Durum
- ✅ `/eslesme` sayfası
- ✅ `SwipeMatchExperience.tsx` component (swipe UI)
- ✅ `user_match_profiles` 15 kayıt (62% adoption)
- ❌ **`social_swipes` SADECE 2** — kullanıcılar swipe yapmıyor!
- ❌ social_matches: 1
- ❌ Tinder feature aktif değil ama UI var

### Sorunlar
1. **Onboarding zayıf**: Yeni kullanıcı match profili oluşturmuyor
2. **Discoverability yok**: Tinder feature anasayfa'dan görünmüyor
3. **Profil dolu olmayanlar gösteriliyor**: 24 user'dan 15'i profil yapmış, 9'u yok
4. **Geo filtre yok**: Şehir dışı kullanıcı görüyor olabilir

### Öneriler
- 🆕 **Onboarding wizard**: Yeni kullanıcıya 3 adımda "Eşleşmeye Hazır mısın?" akışı
- 🆕 **Anasayfa CTA**: "Şanlıurfa'da yeni bağlantılar kur — Eşleşmeye başla"
- 🆕 **Match algoritması**: İlgi alanları + ilçe + yaş aralığı filtre
- 🆕 **Mutual interest indicator**: Kart üstünde "3 ortak ilgi alanı"
- 🆕 **Daily swipe limit**: 20 swipe/gün (engagement boost)
- 🆕 **Match notification**: Eşleşme → ✨ animasyon + push notification
- 🆕 **Profile completion meter**: "%40 tamam — devam et"

---

## Öncelik Sırası (Impact × Effort)

| # | Feature | Impact | Effort | Öncelik |
|---|---|---|---|---|
| 1 | Mekan ekleme — discoverability + login | ⭐⭐⭐ | Düşük | **1. ACİL** |
| 2 | Yorum sistem aktivasyonu (foto+helpful+response) | ⭐⭐⭐ | Orta | **2. YÜKSEK** |
| 3 | Üye etkinlik ekleme (yeni) | ⭐⭐ | Yüksek | **3. ORTA** |
| 4 | Tinder onboarding + algoritma | ⭐⭐ | Orta | **4. ORTA** |
| 5 | Sosyal feed (`/akis`) | ⭐⭐ | Yüksek | **5. DÜŞÜK** |
| 6 | Favori sistem tanıtımı (kalp butonu) | ⭐ | Düşük | **6. QUICK WIN** |
| 7 | Profil zenginleştirme + bio | ⭐ | Orta | **7. DÜŞÜK** |

---

## DB Bütünlüğü Önerileri

### Eksik Foreign Key Constraints
```sql
-- place_submissions.user_id → users.id
-- review_responses.vendor_id → users.id
-- review_helpful.user_id + review_id (composite unique)
-- review_flags.reporter_id → users.id
-- social_swipes (swiper_id, target_id) UNIQUE
```

### Eksik Indexes
```sql
CREATE INDEX idx_reviews_place_status ON reviews (place_id, status) WHERE status='active';
CREATE INDEX idx_user_follows_follower ON user_follows (follower_id);
CREATE INDEX idx_social_swipes_swiper ON social_swipes (swiper_id, created_at DESC);
CREATE INDEX idx_user_match_profiles_active ON user_match_profiles (is_active, updated_at DESC);
```

### Cleanup Suggestions
- 1202 seed review → DB'de tut ama yeni user yorumları öncelik göstersin (UI'da)
- `user_favorites` boş — DB row eklenmediği için kalp butonu eksik olabilir, UI ekleyince akacak

---

## Sonraki Adımlar (Önerilen Sıra)

1. **Bu commit'i GitHub'a push** ✅ (yapıldı)
2. **Migration 180**: event_submissions tablosu + indexes + FK constraints
3. **Üye mekan ekleme login + footer CTA + email notification** (Hafta 1)
4. **Yorum sistem genişletme**: foto upload, helpful vote, vendor response (Hafta 2)
5. **Tinder onboarding wizard + anasayfa CTA** (Hafta 3)
6. **Sosyal feed `/akis`** (Hafta 4)

---

## Audit Methodology
- Prod DB sorgu (24 metric)
- Source code grep (action + page + API surface)
- Memory feedback (MVP_BITIRME_MODU, no-test rule, etc.)
- Schema discovery via `information_schema.tables`

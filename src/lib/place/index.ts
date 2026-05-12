// Place module - per-place lifecycle ve ilişki yardımcıları
//
// SCOPE (singular `place/`):
//   - place-followers : kullanıcı bir mekanı takip ediyor mu / takipçileri
//   - place-verification : mekan doğrulama (sahiplik kanıtı, doc upload)
//   - place-visits : kullanıcı ziyaret kayıtları (check-in)
//   - lifecycle / lifecycle-events : mekan açılış/kapanış event'leri
//
// PARALEL MODÜL: `lib/places/` (plural) — mekan CRUD, kategoriler, reviews,
// public listings, user-submitted applications. Bu iki klasör BIRBIRINE
// IMPORT ETMEZ; isim çakışması ASTA YAPILMAMALI (place* fonksiyonları singular,
// getPlaces/createPlace plural).
export * from './place-followers';
export * from './place-verification';
export * from './place-visits';

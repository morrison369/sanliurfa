# UI Copy Matrix

Bu dosya kullanıcıya görünen ortak durum metinleri için referans karar kaynağıdır.

## Ortak Durumlar

| Durum | Kaynak | Standart |
|---|---|---|
| loading | `src/lib/ui-copy.ts` | `... yükleniyor...` |
| empty | `src/lib/ui-copy.ts` + `render-states.ts` | `Henüz ... bulunmuyor.` |
| error | `src/lib/ui-copy.ts` + `render-states.ts` | kısa, işlem odaklı hata cümlesi |
| processing | `src/lib/ui-copy.ts` | `İşleniyor...` |
| remove | `src/lib/ui-copy.ts` | `Kaldır` |
| cancel | `src/lib/ui-copy.ts` | `İptal et` |

## Öncelikli Yüzeyler

Bu yüzeylerde yeni kullanıcı metni eklenirken önce ortak sözlük kullanılmalıdır:

- bildirim yüzeyleri
- koleksiyon yüzeyleri
- rapor ve webhook yardımcı panelleri
- abonelik ve profil yardımcı yüzeyleri
- analitik ve yönetim panoları

## Kural

Yeni kullanıcı metni eklerken sıralama:

1. `src/lib/ui-copy.ts` içinde mevcut karşılık var mı kontrol et
2. varsa doğrudan onu kullan
3. yoksa ortaklaştırılabilir bir metinse önce sözlüğe ekle
4. sadece bağlama özel metinse yerel tanımla

## Test ve Audit

- görünür metin taraması: `npm run copy:visible:audit`
- helper contract testleri: `src/lib/__tests__/ui-copy.test.ts`, `render-states.test.ts`, `copy-hygiene.test.ts`

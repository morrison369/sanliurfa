# Security Key Rotation Runbook

## Kapsam
- Pexels API key
- Unsplash access/secret key
- Diğer üçüncü parti canlı anahtarlar

## Adımlar
1. Sağlayıcı panelinden mevcut key'leri iptal et (revoke).
2. Yeni key üret ve sadece sunucu ortam değişkeni olarak tanımla.
3. `.env.example` içinde sadece placeholder bırak, gerçek key yazma.
4. CI'da `npm run security:scan-secrets` adımı yeşil olmalı.
5. Son 30 güne ait build/deploy loglarını kontrol et, anahtar izi varsa temizle.
6. Gerekirse git geçmişi temizliği yap:
   - `git filter-repo` veya BFG ile key stringlerini kaldır
   - force-push sonrası tüm token'ları yeniden döndür

## Post-rotation Kontrol
- `npm run security:scan-secrets`
- `npm run api:release:gate`
- kritik endpoint smoke

## Not
Git geçmişi temizliği merkezi repoda yapılmalıdır. Yerel temizlik tek başına yeterli değildir.

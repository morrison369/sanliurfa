# Content Pipeline Operations (Haftalık)

## Haftalık Sıra
1. `images:check-keys`
2. `images:download`
3. `images:map`
4. `images:check-external`
5. `images:validate`
6. `images:quality`
7. `images:moderate`
8. `content:image:relevance:gate`
9. `release:readiness:dashboard`

## Onay Noktaları
- Görsel intent uyumu: içerik sahibi onayı
- Teknik kalite: frontend owner onayı
- Release dashboard: ops owner onayı

## Blocker Eşikleri
- Alakasız görsel tespiti
- Kritik route’da bozuk görsel/fallback eksikliği
- Frontend release gate fail

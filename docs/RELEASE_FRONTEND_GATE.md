# Frontend Release Gate

Prod adayında aşağıdakiler zorunludur:

1. `npm run frontend:quality:gate`
2. `npm run content:image:relevance:gate`
3. `npm run design:drift:gate`
4. Lighthouse (landing + en az 2 kritik sayfa)
5. Screenshot diff (landing + liste + detay)

## Kabul Kriteri
- Tüm gate scriptleri PASS.
- Kritik sayfalarda kırık görsel yok.
- CTA/Breadcrumb/Link hover standardı `sf-*` sistemine uyumlu.


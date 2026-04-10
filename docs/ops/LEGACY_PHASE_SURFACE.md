# Legacy Phase Surface

Bu repo içinde `phase:*` ve `test:phase:*` komutları compatibility surface olarak tutulur.

Aktif release kararı için kullanılmaz:

- `.github/workflows/phase-gate.yml`
- `phase:doctor`
- `phase:check:tsconfig`
- `test:phase:latest`
- `test:phase:prev`
- `test:phase:<range>`

Aktif karar yüzeyi:

- `.github/workflows/ci.yml`
- `quick-gate`
- `full-gate`
- `npm run test:critical:blocking`
- `npm run test:critical:advisory`
- `npm run test:e2e:smoke`
- `npm run release:gate`

Kural:

1. Yeni blocking kararlar phase workflow içine eklenmez.
2. Legacy phase komutları ancak manuel operasyon veya arşiv doğrulaması için çalıştırılır.
3. Dokümanlar aktif gate için önce `ci.yml` ve `release:gate` akışını referans vermelidir.
4. Stale `test:phase:<range>` manifest kayıtları aktif compatibility yüzeyinde tutulmaz; temizlemek için `npm run phase:compat:prune-stale` kullanılır.

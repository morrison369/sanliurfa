# Branch Koruma Temel Çizgisi

Bu kuralları `main` ve `master` üzerinde uygula:

- Merge öncesi pull request zorunlu olsun.
- Merge öncesi status check'lerin geçmesi zorunlu olsun.
- Merge öncesi branch'in güncel olması zorunlu olsun.
- Force-push ve branch silme engellensin.

Zorunlu kontroller:
- `quick-gate`

Korunan branch push kontrolleri:
- `full-gate`

Önerilen advisory kontroller:
- `critical-contracts-advisory`
- `e2e-smoke-advisory`

Operasyon notu:
- `critical-contracts-advisory`, daha geniş kontrat drift'ini görünür kılarken PR hızını korumak için bilinçli olarak blocking değildir.
- Blocking karar sadece job isimleri üzerinden verilir; step isimleri branch protection required check listesine yazılmaz.

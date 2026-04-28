# Deployment Policy

- GitHub Actions kullanılmaz.
- Deploy öncesi resmi yerel komut `npm run release:full` olur.
- Canlı domain probe isteniyorsa `npm run release:prod-preflight` kullanılır.
- `release:full` başarısızsa deploy yapılmaz.
- Secret değerleri repoya commit edilmez; `.env.local` local ve ignore kalır.
- Release kanıtları `docs/RELEASE_EVIDENCE.md`, `docs/RELEASE_STATUS.md`, `docs/local-gate-summary.md` ve `docs/ops-last-run.md` dosyalarından okunur.
- Üretim öncesi en az şu sinyaller `ok/ready` olmalıdır: release status, OpenAPI route coverage, problem+json strict, critical pages quality, site doctor, security gates.
- Kanıt tazeliği `npm run release:evidence` ile doğrulanır; varsayılan maksimum yaş 72 saattir.
- Canlı probe kanıtı `npm run prod:evidence` ile `docs/PROD_EVIDENCE.md` dosyasına yazılır; `PROD_BASE_URL` yoksa probe atlanır ve secret basılmaz.

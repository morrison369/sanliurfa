# Ops Doküman İndeksi

Bu klasör operasyon kararları için açılacak ilk yerdir.

## Hangi belge ne zaman açılır

- Release gate / merge blocker:
  - [RELEASE_GATES.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\RELEASE_GATES.md)
  - [BRANCH_PROTECTION.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\BRANCH_PROTECTION.md)
- Artifact freshness / nightly drift:
  - [ARTIFACT_FRESHNESS_POLICY.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\ARTIFACT_FRESHNESS_POLICY.md)
- Hangi dosya source-of-truth:
  - [SOURCE_OF_TRUTH_MAP.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\SOURCE_OF_TRUTH_MAP.md)
- Admin entegrasyon readiness:
  - [INTEGRATION_READINESS.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\INTEGRATION_READINESS.md)
- Legacy / aktif olmayan yüzey:
  - [LEGACY_PHASE_SURFACE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\LEGACY_PHASE_SURFACE.md)
- Script yüzeyi ve gate policy:
  - [SCRIPT_SURFACE_POLICY.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\SCRIPT_SURFACE_POLICY.md)

## Hızlı kullanım sırası

1. Merge veya deploy bloklandıysa `RELEASE_GATES.md`
2. Nightly issue veya artifact bayatlığı varsa `ARTIFACT_FRESHNESS_POLICY.md`
3. Hangi dosya karar veriyor belirsizse `SOURCE_OF_TRUTH_MAP.md`
4. Admin anahtarları ve readiness için `INTEGRATION_READINESS.md`
5. Legacy yüzey şüphesi varsa `LEGACY_PHASE_SURFACE.md`

## Kural

- Yeni operasyon yüzeyi eklenirse önce bu index, sonra source-of-truth haritası güncellenir.

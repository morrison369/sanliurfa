# Ops Doküman İndeksi

Bu klasör operasyon kararları için açılacak ilk yerdir.

## Hangi belge ne zaman açılır

Önce kısa aktif özet yüzeyleri aç:

- Release/runtime:
  - [RELEASE_RUNTIME_STATE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\RELEASE_RUNTIME_STATE.md)
- Admin/ops runtime:
  - [ADMIN_OPS_RUNTIME_STATE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\ADMIN_OPS_RUNTIME_STATE.md)
- Integration readiness:
  - [INTEGRATION_RUNTIME_STATE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\INTEGRATION_RUNTIME_STATE.md)
- Incident:
  - [INCIDENT_RUNTIME_STATE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\INCIDENT_RUNTIME_STATE.md)
- Framework/runtime:
  - [ASTRO_RUNTIME_STATE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\architecture\ASTRO_RUNTIME_STATE.md)

Detay policy ve source-of-truth yüzeyleri:

- [SOURCE_OF_TRUTH_MAP.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\SOURCE_OF_TRUTH_MAP.md)
- [RELEASE_GATES.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\RELEASE_GATES.md)
- [BRANCH_PROTECTION.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\BRANCH_PROTECTION.md)
- [ARTIFACT_FRESHNESS_POLICY.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\ARTIFACT_FRESHNESS_POLICY.md)
- [ARTIFACT_RETENTION_POLICY.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\ARTIFACT_RETENTION_POLICY.md)
- [INTEGRATION_READINESS.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\INTEGRATION_READINESS.md)
- [INCIDENT_RUNBOOK.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\INCIDENT_RUNBOOK.md)
- [LEGACY_PHASE_SURFACE.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\LEGACY_PHASE_SURFACE.md)
- [SCRIPT_SURFACE_POLICY.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\SCRIPT_SURFACE_POLICY.md)
- [ASTRO_ONLY_MIGRATION_ASSESSMENT.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\architecture\ASTRO_ONLY_MIGRATION_ASSESSMENT.md)
- [ASTRO_ONLY_MIGRATION_BACKLOG.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\architecture\ASTRO_ONLY_MIGRATION_BACKLOG.md)
- [astro-hydration-inventory.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\reports\astro-hydration-inventory.md)
- [astro-high-risk-feasibility.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\reports\astro-high-risk-feasibility.md)
- [react-surface-audit.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\reports\react-surface-audit.md)
- [react-surface-classification.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\reports\react-surface-classification.md)
- [admin-access-coverage.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\reports\admin-access-coverage.md)

## Hızlı kullanım sırası

1. Önce ilgili kısa özet yüzeyi aç.
2. Karar hâlâ net değilse ilgili policy dosyasına git.
3. Hangi dosya owner belirsizse `SOURCE_OF_TRUTH_MAP.md`.
4. Admin UI davranışı veya ops sayfa metni değişecekse önce helper katmanına bak, sonra `.astro` / page script dosyasını değiştir.

## Kural

- Yeni operasyon yüzeyi eklenirse önce bu index, sonra source-of-truth haritası güncellenir.

# Media Readiness Report

- Generated at: 2026-05-15T12:06:31.202Z
- Status: ok
- Policy: local storage only; CDN/object storage yok; otomatik silme yok

| Check | Status | Detail | Artifact |
|---|---|---|---|
| Local storage policy | ok | local-only=yes, external-object-storage=no | `docs/local-media-storage-gate.json` |
| Upload reference parity | ok | 928 uploads, 0 missing refs, 0 unreferenced candidates | `docs/local-upload-parity-report.json` |
| Bucket quota | ok | 5 buckets, blockers=0, review=0 | `docs/local-upload-bucket-quota-report.json` |
| Upload archive queue | ok | 0 total, 0 archive, 0 delete-review | `docs/local-upload-archive-candidates.json` |
| Static image integrity | ok | 200 public images, failed=0, review=0 | `docs/static-image-integrity-report.json` |

# Static Image Integrity Report

Generated: 2026-05-15T12:42:39.527Z
Status: pass
Scanned images: 209
Failed: 0
Review: 0
Passed: 209

## Policy

- CDN veya object storage varsayimi yoktur; gate sadece `public/images` yerel dosyalarini kontrol eder.
- 1 KB altindaki placeholder dosyalari, decode edilebiliyor ve boyutlari varsa review olarak kabul edilir.
- Diger kucuk, bozuk veya boyutsuz gorseller release icin blocker kabul edilir.


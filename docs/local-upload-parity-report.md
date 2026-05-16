# Local Upload Parity Report

- Generated at: 2026-05-15T12:07:48.303Z
- Status: ok
- DB scan: ok
- Upload files: 928
- Upload total: 200.7 MB
- Upload soft limit: 512 MB (ok, 39.2%)
- Quota thresholds: advisory 70%, review 85%, blocker 95%
- Source referenced files: 13
- DB referenced files: 0
- Local storage convention managed files: 928
- Unreferenced candidate files: 0
- Missing referenced files: 0

## Missing Referenced Files

| Path | Sources |
|---|---|

## Unreferenced Candidate Sample

| Path | Size KB |
|---|---:|

## Candidate Summary By Bucket

| Bucket | Total MB | Files | Referenced | Candidates |
|---|---:|---:|---:|---:|
| places | 113.4 | 534 | 534 | 0 |
| blogs | 56.34 | 278 | 278 | 0 |
| historical | 11.83 | 39 | 39 | 0 |
| recipes | 10.36 | 57 | 57 | 0 |
| events | 8.77 | 20 | 20 | 0 |

## Bucket Ownership Model

| Bucket | Owner | Source of truth | Review rule |
|---|---|---|---|
| places | place media | src/data place records and DB place media rows | Slug, route and DB media ownership must be verified before archive/delete. |
| blogs | blog content | blog_posts, generated blog drafts and source page references | Blog body, OG image and schema references must be verified before archive/delete. |
| historical | city history content | historical/city guide source references | City guide, district guide and OG references must be verified before archive/delete. |
| recipes | recipe content | recipe data and source page references | Recipe page, schema image and related content references must be verified before archive/delete. |
| events | event content | events/event submissions and source page references | Event status and historical route references must be verified before archive/delete. |

## Candidate Summary By Extension

| Extension | Total MB | Files | Referenced | Candidates |
|---|---:|---:|---:|---:|
| .jpg | 200.7 | 928 | 928 | 0 |

## Largest Upload Files

| Path | Size MB | Referenced |
|---|---:|---|
| `public/uploads/events/harran-arkeoloji-okulu-seminerleri-2026-kasim.jpg` | 0.98 | yes |
| `public/uploads/recipes/sini-koftesi.jpg` | 0.96 | yes |
| `public/uploads/events/sanliurfa-kitap-fuari-2026-kasim.jpg` | 0.86 | yes |
| `public/uploads/events/harran-gunes-festivali-sonbahar-2026.jpg` | 0.86 | yes |
| `public/uploads/events/gobeklitepe-fotograf-yarismasi-sergi-2026.jpg` | 0.72 | yes |
| `public/uploads/recipes/bittim-corbasi.jpg` | 0.69 | yes |
| `public/uploads/blogs/sanliurfadan-gaziantep-gunubirlik-gezi-rehberi.jpg` | 0.69 | yes |
| `public/uploads/events/sanliurfa-kultur-turizm-festivali-2026-ekim.jpg` | 0.62 | yes |
| `public/uploads/events/halfeti-kis-turu-kara-guller-2026-kasim.jpg` | 0.61 | yes |
| `public/uploads/places/firat-nehri-piknik.jpg` | 0.6 | yes |
| `public/uploads/places/sanliurfa-mesire-piknik.jpg` | 0.6 | yes |
| `public/uploads/places/hz-eyyub-peygamber-makami.jpg` | 0.56 | yes |
| `public/uploads/recipes/tirit.jpg` | 0.54 | yes |
| `public/uploads/recipes/icli-kofte.jpg` | 0.53 | yes |
| `public/uploads/blogs/karakopru-ilce-rehberi-sanliurfanin-modern-yuzu.jpg` | 0.53 | yes |
| `public/uploads/blogs/karakopru-i-lce-rehberi-sanliurfa-nin-modern-yuzu.jpg` | 0.53 | yes |
| `public/uploads/blogs/sanliurfa-el-sanatlari-bakir-kilim-telkari.jpg` | 0.53 | yes |
| `public/uploads/blogs/sanliurfada-el-sanatlari-bakir-kilim-ve-hediyelik-esya-rehberi.jpg` | 0.53 | yes |
| `public/uploads/blogs/sanliurfa-da-cocuklarla-yapilacaklar-aile-aktiviteleri-ve-mekanlari.jpg` | 0.52 | yes |
| `public/uploads/blogs/hilvan-ve-bozova-kaplicalari-karsilastirmasi-sanliurfa-termal-rehberi.jpg` | 0.5 | yes |
| `public/uploads/places/haliliye-market.jpg` | 0.5 | yes |
| `public/uploads/places/sanliurfa-market.jpg` | 0.5 | yes |
| `public/uploads/recipes/sac-kavurma.jpg` | 0.49 | yes |
| `public/uploads/historical/hz-eyup-makami.jpg` | 0.48 | yes |
| `public/uploads/blogs/harrandan-gobeklitepeye-neolitik-medeniyet-turu-rotasi.jpg` | 0.48 | yes |

Not: Bu rapor dosya silmez. Unreferenced candidate dosyalar DB ve kaynak referanslarıyla ek gözlem sonrası arşiv/silme adayına alınır.


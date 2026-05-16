# Local Media Storage Gate

- Generated at: 2026-05-15T12:07:48.669Z
- Status: ok
- Local storage only: yes
- External object storage configured: no

## Local Paths

| Path | Exists |
|---|---|
| `public/images` | yes |
| `public/uploads` | yes |
| `dist/client/_astro` | yes |
| `dist/client/images` | yes |

## Live Checks

| URL | Status | Cache-Control | Content-Type | Server |
|---|---:|---|---|---|
| https://sanliurfa.com/images/home/collage/balikligol.avif | 200 | public, max-age=14400 | image/avif | cloudflare |
| https://sanliurfa.com/images/home/collage/gobeklitepe.avif | 200 | public, max-age=14400 | image/avif | cloudflare |
| https://sanliurfa.com/images/home/collage/harran.avif | 200 | public, max-age=14400 | image/avif | cloudflare |
| https://sanliurfa.com/images/home/collage/halfeti.avif | 200 | public, max-age=14400 | image/avif | cloudflare |
| https://sanliurfa.com/uploads/recipes/kaburga-dolmasi.jpg | 200 | public, max-age=14400 | image/jpeg | cloudflare |

## Notes

- Medya dosyalari local filesystem kaynakli pathlerden servis edilir.
- Browser cache header degeri hosting/proxy katmaninda degisebilir; bu depolama modelini degistirmez.
- Dis nesne depolama veya ucuncu parti medya dagitim servisi kullanilmaz.

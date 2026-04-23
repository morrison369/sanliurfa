# Aktif Deployment Kaynağı: CWP + Astro Node 4321

Tarih: 2026-04-23

Bu dosya sanliurfa.com için aktif production/development runtime kuralıdır. Eski `DEPLOYMENT*`, `CWP-*`, `FINAL_*` ve debug raporları arşiv bilgisi sayılır; çelişki varsa bu dosya ve `AGENTS.md` geçerlidir.

## Kesin Runtime Kararı

- Framework: Astro SSR `output: "server"`.
- Adapter: resmi `@astrojs/node`.
- Hosting: CentOS Web Panel domain kullanıcısı altında Node standalone.
- Process manager: PM2.
- PM2 config: `ecosystem.config.cjs` tek aktif dosyadır. `ecosystem.config.js` kullanılmaz; proje `type: module` olduğu için PM2 config CJS uzantısıyla tutulur.
- Uygulama portu: yalnızca `127.0.0.1:4321` / `PORT=4321`.
- Proxy hedefi: CWP/Apache/Nginx tarafında `http://127.0.0.1:4321`.
- Canonical domain: `https://sanliurfa.com`.

## Yasaklı Eski İzler

- `PORT=3000`, `PORT=6000`, `1111`, `1112`, `1113` veya otomatik fallback port yok.
- Vercel, Netlify, Cloudflare adapter/deploy hedefi yok.
- Sahte Git remote, sahte server IP, sahte deploy user bilgisi config içinde tutulmaz.
- Cron veya backup kurulumu bu aşamada yapılmaz; production sistem yedeği hosting tarafındadır.
- Redis başka proje servisleriyle karıştırılmaz; proje prefix'i `sanliurfa:` olarak kalır.
- Eski SSH/CWP mutation scriptleri aktif deployment yolu değildir; bu scriptler yeniden etkinleştirilemez.

## Kullanım

```bash
npm install --legacy-peer-deps
npm run build
pm2 start ecosystem.config.cjs --env production
pm2 save
```

## Lokal Kontrol

```bash
npm run dev
npm run preview
npm run build
```

Bu komutların tamamı 4321 port politikasına bağlıdır. Port doluysa yeni port açılmaz; sadece bu repoya ait 4321 listener'ı durdurulur.

# Isolated Runtime (Project-Private)

Bu proje artik diger workspace'lerden bagimsiz calistirilabilir.

## Komutlar
- `npm run dev:isolated`
- `npm run dev:isolated:start`
- `npm run dev:isolated:status`
- `npm run dev:isolated:ensure`
- `npm run dev:isolated:health`
- `npm run dev:isolated:logs`
- `npm run dev:isolated:restart`
- `npm run dev:isolated:stop`
- `npm run dev:isolated:watchdog:start`
- `npm run dev:isolated:watchdog:status`
- `npm run dev:isolated:watchdog:stop`
- `npm run dev:isolated:doctor`
- `npm run dev:isolated:doctor:fix`
- `npm run dev:isolated:health:report`
- `npm run dev:isolated:health:report:fix`
- `npm run runtime:cleanup:listeners`
- `npm run build:isolated`
- `npm run preview:isolated`
- `npm run gate:isolated`
- `npm run ops:next:bulk`

## Ne Izole Ediliyor
- NPM cache: `.project-runtime/npm-cache`
- Gecici dosyalar: `.project-runtime/tmp`
- PM2 home: `.project-runtime/pm2`
- Calisma kilidi: `.project-runtime/run/isolated.lock`
- Playwright browser cache: `.project-runtime/playwright-browsers`

## Restart Dayanikliligi
- `dev:isolated:start` komutu dev sunucuyu arka planda calistirir, Codex oturumuna bagli kalmaz.
- Lock mekanizmasi komut bazlidir (`dev.lock`, `task.lock`), bu sayede tek bir kilit tum akisi bloke etmez.
- `dev:isolated:ensure` komutu servis dusmusse otomatik ayağa kaldirir, ayakta ama sagliksizsa restart eder.
- `dev:isolated:watchdog:start` ile surekli self-heal dongusu acilir (varsayilan 10sn periyot).
- `dev:isolated:doctor` lock/pid/health durumunu tek raporda verir.
- `dev:isolated:doctor:fix` stale lock temizligi + ensure/restart ile otomatik toparlama dener.
- `runtime:cleanup:listeners` proje kaynakli 4321 dinleyicilerini zorla kapatir (hard cleanup).
- `dev:isolated:health:report` `docs/runtime-health-report.json` ve `.md` üretir.
- `dev:isolated:health:report:fix` sorun varsa otomatik fix dener ve raporu fix sonrası yazar.

## Cron Ornegi
- Her 5 dakikada bir runtime raporu almak icin:
  - `*/5 * * * * cd /path/to/sanliurfa && npm run -s dev:isolated:health:report:fix`

## Portlar
- `PORT=4321`
- `PREVIEW_PORT=4322`
- `DB_PORT=5432`
- `REDIS_PORT=6379`

Gerekirse ortam degiskeni vererek override edilebilir.

# CWP Domain Kullanıcısı Operasyon Notları (2026-04-19)

Bu not, Şanlıurfa.com production operasyonlarını **CWP shared hosting + domain kullanıcısı**
modelinde standardize eder.

## Doğrulanan temel noktalar

1. CWP üzerinde Node.js uygulaması için önerilen akış, domain bazında webserver custom port
proxy tanımlamak ve uygulamayı localhost portunda çalıştırmaktır.
2. CWP kullanıcılarında shell erişimi varsayılan olarak kapalı olabilir; domain kullanıcısı için
gerekli shell tipi panelden açılmalıdır.
3. Cron sorunlarında script'in ilgili kullanıcı yetkisiyle test edilmesi gerekir.
4. SSH/SFTP tarafında tam shell yerine sınırlı shell tercih edilmelidir (güvenlik).

## Şanlıurfa.com standardı

1. Uygulama yalnızca domain kullanıcısı ile deploy edilir.
2. Çalışma dizini: `$HOME/public_html`
3. PM2 process adı: `sanliurfa-app`
4. Uygulama portu: `4321`
5. Public trafik: CWP domain config ile `127.0.0.1:4321` proxy
6. Reboot sonrası: user crontab `@reboot ... pm2 resurrect`

## Operasyon komut seti

```bash
cd "$HOME/public_html"
bash scripts/deploy-cwp.sh
```

```bash
pm2 status
curl -sS http://127.0.0.1:4321/api/health
```

## Tek komut operasyon (önerilen)

```bash
cd "$HOME/public_html"
npm run ops:cwp:oneshot
```

Detay adımlar (tek tek):

```bash
cd "$HOME/public_html"
npm run ops:cwp:status
npm run ops:cwp:preflight
npm run ops:cwp:env-check
npm run ops:cwp:doctor
npm run ops:cwp:health
npm run ops:cwp:smoke
npm run ops:cwp:safe-deploy
```

Not: `ops:cwp:report` raporu artık `bootstrap_audit`, `daily_ops`, `weekly_audit` ve
`release_readiness` son durumlarını tek JSON/MD çıktısında birleştirir.

Not: `ops:cwp:deploy` sırasında deploy veya post-deploy health başarısız olursa son
`predeploy_*` snapshot'a otomatik rollback dener.
`ops:cwp:safe-deploy` komutu deploy öncesi `doctor + smoke` kontrolü de uygular.
`ops:cwp:preflight` artık Node>=20, npm>=10 ve zorunlu ops scriptlerinin varlığını da doğrular.

Rollback:

```bash
cd "$HOME/public_html"
npm run ops:cwp:rollback
# veya belirli release
bash scripts/prod-cwp-ops.sh rollback release_YYYYMMDD_HHMMSS
```

Release listesi ve temizlik:

```bash
npm run ops:cwp:releases
npm run ops:cwp:cleanup
npm run ops:cwp:rotate-events
npm run ops:cwp:report
npm run ops:cwp:cron:doctor
npm run ops:cwp:cron:freshness
npm run ops:cwp:cron:freshness:strict
npm run ops:cwp:unlock
npm run ops:cwp:pipeline
npm run ops:cwp:pipeline:strict
npm run ops:cwp:audit
npm run ops:cwp:incident-bundle
npm run ops:cwp:triage
npm run ops:cwp:incident-cleanup
```

Not: `ops:cwp:pipeline:strict` ve `ops:cwp:audit` cron freshness kontrolünü strict modda
(`CRON_FRESHNESS_STRICT=1`) çalıştırır.

Cron kurulum (önerilen):

```bash
npm run ops:cwp:cron:install
npm run ops:cwp:cron:install:if-needed
npm run ops:cwp:cron:show
npm run ops:cwp:cron:preview
npm run ops:cwp:cron:diff
npm run ops:cwp:cron:apply-safe
npm run ops:cwp:bootstrap
npm run ops:cwp:bootstrap:audit
npm run ops:cwp:bootstrap:audit:summary
npm run ops:cwp:daily
npm run ops:cwp:weekly
npm run ops:cwp:release-readiness
```

Not: Cron satırları `scripts/cwp-cron-runner.sh` üzerinden heartbeat üretir.
Cron içeriği değiştiğinde `ops:cwp:cron:install` komutunu tekrar çalıştırın.
Freshness kontrolü, yeni cron kurulumundan hemen sonra bir süre grace modunda çalışır; strict
kontrol için `ops:cwp:cron:freshness:strict` kullanın.

Varsayılan managed cron zamanları:
- `doctor-hourly`: `5 * * * *`
- `smoke-6hour`: `35 */6 * * *`
- `report-daily`: `45 3 * * *`
- `rotate-events-daily`: `10 3 * * *`
- `cleanup-weekly`: `20 3 * * 0`
- `incident-cleanup-weekly`: `30 3 * * 0`
- `daily-ops`: `5 4 * * *`
- `weekly-audit`: `15 4 * * 0`
- `release-readiness`: `35 4 * * *`

Cron kaldırma:

```bash
npm run ops:cwp:cron:remove
```

## Kaynaklar

- CWP Wiki - Node.js setup:
  https://wiki.centos-webpanel.com/how-to-install-and-setup-node-js-on-cwp
- CWP Wiki - Shell/SFTP erişimi:
  https://wiki.centos-webpanel.com/enable-limited-sftp-access-via-ssh-for-user
- CWP Wiki - FTP/SFTP güvenlik notları:
  https://wiki.centos-webpanel.com/ftp-ftps-ftpes-sftp-explained
- CWP Wiki - Cron script test:
  https://wiki.centos-webpanel.com/how-to-testcheck-cron-scripts

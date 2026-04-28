# Deployment Rehberi (CWP Shared Hosting)

Bu proje production'da **CWP (CentOS Web Panel) shared hosting** ve
**domain kullanıcısı (root olmayan)** ile çalıştırılır.

## Model

- Panel: CWP
- Çalıştıran kullanıcı: domain hesabı (ör. `sanliurfa`)
- Uygulama dizini: `$HOME/public_html`
- Process manager: PM2 (user-level)
- App port: `4321` (localhost)
- Public erişim: CWP webserver reverse proxy (80/443 -> 127.0.0.1:4321)

## 1) CWP panel hazırlığı

1. Domain ve hesap oluştur.
2. Domain hesabı için shell erişimini aç (`/bin/bash` gerekiyorsa, sadece ilgili kullanıcıya).
3. SSL'i CWP AutoSSL ile kur.
4. Domain webserver ayarında custom port proxy hedefini `127.0.0.1:4321` yap.

Not: CWP'de varsayılan shell birçok kurulumda kapalı olabilir; SSH/SFTP için kullanıcıya uygun shell
atanmalıdır.

## 2) Domain kullanıcısı ile sunucu adımları

```bash
ssh <domain_user>@<server_or_domain>
cd "$HOME/public_html"
```

Kod yükleme:

```bash
# Git ile
git clone <repo_url> .
# veya mevcut repoda
git pull origin main
```

Ortam:

```bash
cp .env.production .env
chmod 600 .env
```

Kurulum/build:

```bash
npm install --legacy-peer-deps --production
npm run build
```

PM2 başlatma:

```bash
bash scripts/pm2-cwp-start.sh
```

## 3) Deploy (güncelleme)

```bash
cd "$HOME/public_html"
bash scripts/deploy-cwp.sh
```

Alternatif (önerilen tek komut akışı):

```bash
cd "$HOME/public_html"
npm run ops:cwp:preflight
npm run ops:cwp:env-check
npm run ops:cwp:safe-deploy
```

`ops:cwp:deploy`, başarısız deploy senaryosunda son predeploy snapshot'a otomatik rollback dener.
`ops:cwp:safe-deploy`, deploy öncesi `doctor + smoke` kontrollerini zorunlu çalıştırır.

Desteklenen env değişkenleri:

- `APP_DIR` (default: `$HOME/public_html`)
- `PM2_NAME` (default: `sanliurfa-app`)
- `PORT` (default: `4321`)
- `BRANCH` (default: `main`)

## 4) Reboot sonrası otomatik kalkış

`pm2 startup` shared hosting'de çoğunlukla root istediği için user-cron kullan:

```bash
crontab -e
```

Ekleyin:

```cron
@reboot cd $HOME/public_html && pm2 resurrect
```

## 5) Doğrulama

```bash
pm2 status
pm2 logs sanliurfa-app --lines 100
curl -I http://127.0.0.1:4321/api/health
```

`/api/health` yanıtında `integrations` alanı her servisin yapılandırılma durumunu (`configured` /
`unconfigured`) raporlar — production'da hangi entegrasyonların kurulu olduğunu monitoring tool'larla
izlemek için bu alan kullanılabilir. Sonuç 30 saniye in-process cache'lenir.

Ops durum raporu:

```bash
npm run ops:cwp:status
npm run ops:cwp:smoke
```

Not: `ops:cwp:report` çıktısı artık `bootstrap_audit`, `daily_ops`, `weekly_audit` ve
`release_readiness` özetlerini de içerir.

Release yönetimi:

```bash
npm run ops:cwp:releases
npm run ops:cwp:cleanup
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

Not: Managed cron planı artık `daily-ops`, `weekly-audit` ve `release-readiness` joblarını da
otomatik kurar.

Cron otomasyonu:

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

## 5b) Admin entegrasyonları (post-deploy)

Sunucu çalıştıktan sonra admin **`/admin/integrations`** sayfasından 6 servisi yönetir.
**Önemli:** Bu key'ler veritabanında saklanır (`site_settings.integrations.*` ve `oauth_providers`)
— `.env` dosyasına yazmanıza **gerek yok**. DB değer varsa env değeri yoksayılır (DB öncelikli).
Admin panelden değiştirme **anında etkili olur** (sunucu restart gerekmez).

| Servis | Yapılandırma adımları |
|--------|------------------------|
| **Resend** (e-posta) | resend.com/api-keys'den API key al, sender domain için DNS doğrulaması (SPF/DKIM) yap, admin panele gir. "Test Et" ile doğrula. |
| **SMTP** (yedek tier) | Resend yoksa veya kotaya takılırsa kullanılır. Host/port/user/pass admin panelden. "Test Et" `nodemailer.verify()` çalıştırır (mail göndermez). |
| **Stripe** (ödeme) | dashboard.stripe.com/apikeys'den secret + publishable key. Webhooks için panelin gösterdiği `<domain>/api/billing/webhook` URL'ini Stripe Dashboard'a kaydet, signing secret'i admin panele yapıştır. |
| **Google Analytics 4** | GA4 → Yönetici → Veri Akışları → Web Akışı'ndan Measurement ID (`G-XXXXXXXXXX`) al, admin panele gir. |
| **Unsplash + Pexels** | Her iki sağlayıcıdan ücretsiz API key. Sadece admin medya arama panelinde kullanılır. |
| **OAuth** (Google/Facebook/Twitter) | Her provider için console linki + redirect URI admin panelde gösterilir, kopyalayıp provider tarafında kaydet, client_id/secret'i admin panele gir. Per-provider toggle ile etkin/devre dışı. |

**Test akışı:** Admin yapılandırma sonrası "Tümünü Test Et" master butonuyla 6 servisi paralel
probe edebilir. Her satırda inline status badge sonuç gösterir.

**Health monitoring:** Production'da `/api/health` yanıtının `integrations` alanı uptime
monitor'lar tarafından izlenebilir — herhangi bir servisin `unconfigured` durumda olması
sağlık alarmı tetiklenebilir.

## 6) Sorun giderme

Port dinleniyor mu:

```bash
ss -ltnp | grep 4321
```

Node/PM2 kullanıcı PATH kontrolü:

```bash
node -v
npm -v
pm2 -v
```

Proxy çalışmıyorsa CWP panelde domain webserver config içinden custom port mapping'i tekrar doğrula.

Hızlı rollback:

```bash
npm run ops:cwp:rollback
```

## Referans dokümanlar

- `SHARED-HOSTING-DEPLOY.md`
- `CWP-DEPLOYMENT-GUIDE.md`
- `scripts/deploy-cwp.sh`
- `scripts/deploy-shared.sh`

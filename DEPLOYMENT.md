# Deployment Rehberi

Bu dokümanda Sanliurfa.com'un production ortamına nasıl deploy edileceği anlatılmaktadır.

## Hızlı Başlangıç

```bash
# 1. Repoyu klonla
git clone https://github.com/username/sanliurfa.git
cd sanliurfa

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle

# 3. Ortam kontrolü
node scripts/check-env.js

# 4. Başlat
./scripts/deploy.sh
```

## Gereksinimler

### Sunucu
- **OS**: Ubuntu 22.04 LTS (önerilen)
- **RAM**: En az 2GB
- **CPU**: 1 vCPU (2 önerilen)
- **Disk**: 20GB SSD
- **Ports**: 80, 443 açık

### Yazılım
- Docker 24.x+
- Docker Compose 2.x+
- Git
- Node.js 20+ (opsiyonel - build için)

## Adım Adım Deployment

### 1. Sunucu Hazırlığı

```bash
# Sunucuya bağlan
ssh root@your-server-ip

# Sistem güncelle
apt update && apt upgrade -y

# Docker kur
apt install -y docker.io docker-compose git

# Docker'ı başlat
systemctl enable --now docker

# Docker user ekle (opsiyonel)
usermod -aG docker $USER
```

### 2. Proje Kurulumu

```bash
# Dizin oluştur
mkdir -p /opt/sanliurfa
cd /opt/sanliurfa

# Repoyu klonla
git clone https://github.com/username/sanliurfa.git .

# Ortam değişkenlerini ayarla
cp .env.example .env
nano .env  # Düzenle ve kaydet

# Kontrol et
node scripts/check-env.js
```

### 3. Veritabanı Migration

```bash
# Container'ları başlat (ilk başta sadece db)
docker-compose up -d db

# 10 saniye bekle
echo "Veritabanı başlatılıyor..."
sleep 10

# Migration'ları çalıştır
docker-compose run --rm app npm run db:migrate

# Seed data (opsiyonel)
docker-compose run --rm app npm run db:seed
```

### 4. SSL Sertifikası

```bash
# Domain'i ayarla
export DOMAIN=sanliurfa.com
export EMAIL=admin@sanliurfa.com

# SSL scriptini çalıştır
chmod +x scripts/init-ssl.sh
./scripts/init-ssl.sh
```

### 5. Uygulamayı Başlat

```bash
# Tüm servisleri başlat
docker-compose up -d

# Logları kontrol et
docker-compose logs -f app
```

### 6. Otomatik Yenileme (SSL)

```bash
# Cron job ekle
crontab -e

# Şu satırı ekle:
0 0 * * * cd /opt/sanliurfa && docker-compose run --rm certbot renew --quiet && docker-compose exec nginx nginx -s reload
```

## Güncelleme

```bash
# Dizine git
cd /opt/sanliurfa

# Son değişiklikleri çek
git pull origin main

# Yeni migration varsa çalıştır
docker-compose run --rm app npm run db:migrate

# Container'ları yeniden başlat
docker-compose down
docker-compose up -d --build

# Eski imageları temizle
docker system prune -f
```

## Monitoring

```bash
# Container durumları
docker-compose ps

# Loglar
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f nginx

# Sistem kaynakları
docker stats

# Database bağlantısı kontrol
docker-compose exec db psql -U postgres -d sanliurfa -c "SELECT 1"
```

## Yedekleme

### Otomatik Yedekleme

```bash
# Yedek scriptini çalıştır
docker-compose exec db pg_dump -U postgres sanliurfa > backup_$(date +%Y%m%d_%H%M%S).sql

# S3'e upload (opsiyonel)
aws s3 cp backup_*.sql s3://sanliurfa-backups/
```

### Cron ile Otomatik Yedek

```bash
# Günde bir yedek al
0 2 * * * cd /opt/sanliurfa && docker-compose exec -T db pg_dump -U postgres sanliurfa > /backups/sanliurfa_$(date +\%Y\%m\%d).sql
```

## Sorun Giderme

### Container başlamıyor

```bash
# Logları kontrol et
docker-compose logs app

# Port çakışması var mı?
netstat -tlnp | grep :3000

# Container'ı manuel başlat
docker-compose up app
```

### Veritabanı bağlantı hatası

```bash
# DB container'ı çalışıyor mu?
docker-compose ps db

# Logları kontrol et
docker-compose logs db

# Manuel bağlantı testi
docker-compose exec db psql -U postgres -c "\l"
```

### SSL hatası

```bash
# Sertifika var mı?
ls -la ssl/

# Certbot logları
docker-compose logs certbot

# Manuel yenileme
docker-compose run --rm certbot renew
```

## Güvenlik Kontrol Listesi

- [ ] `.env` dosyası `.gitignore`'da
- [ ] `JWT_SECRET` güçlü ve rastgele
- [ ] `NODE_ENV=production`
- [ ] SSL sertifikası aktif
- [ ] Firewall yapılandırılmış (sadece 80, 443 açık)
- [ ] Otomatik güncellemeler aktif (Docker, OS)
- [ ] Yedekleme test edilmiş
- [ ] Log rotasyonu yapılandırılmış

## Performans İyileştirmeleri

### CDN Kullanımı (Cloudflare)

1. Cloudflare hesabı oluştur
2. Domain'i ekle
3. DNS kayıtlarını yapılandır
4. SSL/TLS modunu "Full (strict)" yap
5. Caching kurallarını ayarla

### Redis Cache

```yaml
# docker-compose.yml'da zaten var
# Sadece REDIS_URL'i .env'e ekle
REDIS_URL=redis://redis:6379
```

### Database Optimizasyonu

```sql
-- PostgreSQL konfigürasyonu (postgresql.conf)
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 64MB
work_mem = 4MB
```

## Destek

Sorun yaşarsanız:
1. Logları kontrol edin: `docker-compose logs`
2. Health check yapın: `curl http://localhost/api/health`
3. Monitoring panelini kontrol edin: `/admin/monitoring`
4. GitHub Issues'a bakın

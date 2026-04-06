# 🔧 Deployment Sorun Giderme

## Sorun: Uygulama Çalışmıyor (HTTP 000)

### Hızlı Çözüm (Sunucuda Çalıştır)

SSH ile bağlanın:
```bash
ssh sanliur@168.119.79.238 -p 77
```

Ardından bu komutları sırayla çalıştırın:

```bash
# 1. Dizine git
cd /home/sanliur/public_html

# 2. Node.js ortamını yükle
source ~/.nvm/nvm.sh

# 3. Uygulamayı durdur
pm2 stop sanliurfa

# 4. .env.production kontrol et
ls -la .env.production
# Eğer yoksa:
# cp .env.production.template .env.production

# 5. Build dosyalarını kontrol et
ls -la dist/server/entry.mjs
# Eğer yoksa yeniden build et:
npm run build

# 6. Port 6000'i temizle (eğer kullanımdaysa)
fuser -k 6000/tcp 2>/dev/null || true

# 7. Uygulamayı başlat
pm2 delete sanliurfa 2>/dev/null
pm2 start dist/server/entry.mjs --name sanliurfa -- --port 6000

# 8. Kaydet
pm2 save

# 9. Kontrol et
pm2 list
curl http://127.0.0.1:6000/
```

### Otomatik Fix Script

Tek komutla tüm kontroller ve düzeltmeler:

```bash
ssh sanliur@168.119.79.238 -p 77 << 'REMOTESCRIPT'
cd /home/sanliur/public_html
source ~/.nvm/nvm.sh

echo "=== PM2 Status ==="
pm2 list | grep sanliurfa

echo ""
echo "=== Port 6000 ==="
ss -tlnp | grep 6000 || echo "Port 6000 not listening"

echo ""
echo "=== Build Check ==="
if [ -f "dist/server/entry.mjs" ]; then
    echo "✅ Build OK"
else
    echo "❌ Build missing, rebuilding..."
    npm run build
fi

echo ""
echo "=== Environment Check ==="
if [ -f ".env.production" ]; then
    echo "✅ .env.production exists"
else
    echo "❌ .env.production missing!"
    exit 1
fi

echo ""
echo "=== Restarting Application ==="
pm2 delete sanliurfa 2>/dev/null
pm2 start dist/server/entry.mjs --name sanliurfa -- --port 6000
sleep 3
pm2 save

echo ""
echo "=== Testing ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://127.0.0.1:6000/

echo ""
echo "=== Done ==="
pm2 list | grep sanliurfa
REMOTESCRIPT
```

### Yaygın Hatalar ve Çözümleri

#### 1. "dist/server/entry.mjs" not found
```bash
npm run build
```

#### 2. "Port 6000 already in use"
```bash
fuser -k 6000/tcp
# veya
lsof -ti:6000 | xargs kill -9
```

#### 3. "DATABASE_URL not set"
```bash
# .env.production dosyasını düzenle
nano .env.production

# Şu satırı ekle:
DATABASE_URL=postgresql://sanliur_sanliurfa@localhost:5432/sanliur_sanliurfa
```

#### 4. "Cannot find module '@astrojs/...'"
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 5. PostgreSQL Bağlantı Hatası
```bash
# PostgreSQL çalışıyor mu?
sudo systemctl status postgresql

# Trust auth ayarla (eğer şifre sorunluysa)
sudo nano /var/lib/pgsql/data/pg_hba.conf
# "md5" yerine "trust" yap, sonra:
sudo systemctl restart postgresql
```

### Logları İnceleme

```bash
# PM2 logları
source ~/.nvm/nvm.sh
pm2 logs sanliurfa --lines 50

# Uygulama logları
tail -f ~/.pm2/logs/sanliurfa-out.log
tail -f ~/.pm2/logs/sanliurfa-error.log
```

### Manuel Test

```bash
# Uygulamayı ön planda çalıştır (Ctrl+C ile durdurabilirsiniz)
cd /home/sanliur/public_html
source ~/.nvm/nvm.sh
node dist/server/entry.mjs --port 6000
```

Başka bir terminalde:
```bash
curl http://127.0.0.1:6000/
```

### Apache Proxy Kontrolü

```bash
# Apache çalışıyor mu?
sudo systemctl status httpd

# Vhost yapılandırması
cat /etc/apache2/conf.d/vhosts/sanliurfa.com.conf

# Proxy modülü aktif mi?
httpd -M | grep proxy

# Apache yeniden başlat
sudo systemctl restart httpd
```

## ✅ Başarılı Olduğunda

```
$ curl http://127.0.0.1:6000/
<!DOCTYPE html>... (HTML çıktısı)

$ pm2 list
┌─────┬────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name       │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ sanliurfa  │ default     │ 1.0.0   │ fork    │ 12345    │ 5m     │ 0    │ online    │ 0.3%     │ 85.2mb   │ sanliur  │ disabled │
└─────┴────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

Site hazır! 🎉
- URL: https://sanliurfa.com
- Admin: admin@sanliurfa.com / admin123

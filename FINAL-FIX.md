# 🔧 Final Fix - Internal Server Error

## Sorun
Uygulama çalışıyor (port 4321) ama "Internal server error" dönüyor.
Bu bir runtime hatası - muhtemelen database veya modül sorunu.

## 🚨 Çözüm Adımları

### Adım 1: SSH ile Bağlan
```bash
ssh sanliur@168.119.79.238 -p 77
```

### Adım 2: Database Kontrolü
```bash
# PostgreSQL'e bağlan
psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost

# Tabloları kontrol et
\dt

# Çıkış
\q
```

Eğer tablolar yoksa:
```bash
cd /home/sanliur/public_html
psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -f database/schema.sql
```

### Adım 3: Uygulamayı Durdur
```bash
cd /home/sanliur/public_html
source ~/.nvm/nvm.sh
pm2 stop sanliurfa
fuser -k 4321/tcp
```

### Adım 4: Manuel Başlat ve Hatayı Gör
```bash
source ~/.nvm/nvm.sh
cd /home/sanliur/public_html
node dist/server/entry.mjs
```

**Bu komut hatayı ekranda gösterecek.** Ctrl+C ile durdurabilirsiniz.

### Adım 5: Hatayı Düzelt
Yaygın hatalar:

**A. Database bağlantı hatası:**
```bash
# pg_hba.conf düzelt
sudo nano /var/lib/pgsql/data/pg_hba.conf

# Tüm satırları bul ve değiştir:
# md5 → trust
# ident → trust
# peer → trust

# PostgreSQL restart
sudo systemctl restart postgresql
```

**B. Eksik modül:**
```bash
cd /home/sanliur/public_html
source ~/.nvm/nvm.sh
npm install
npm run build
```

**C. .env.production hatası:**
```bash
nano /home/sanliur/public_html/.env.production

# DATABASE_URL kontrol et:
DATABASE_URL=postgresql://sanliur_sanliurfa@localhost:5432/sanliur_sanliurfa
```

### Adım 6: Tekrar Başlat
```bash
source ~/.nvm/nvm.sh
cd /home/sanliur/public_html
pm2 start dist/server/entry.mjs --name sanliurfa
pm2 save

# Test
curl http://127.0.0.1:4321/
```

## 🆘 Hızlı Otomatik Çözüm

Sunucuda tek komut:
```bash
bash /home/sanliur/public_html/scripts/server_fix.sh
```

Eğer bu çalışmazsa, yukarıdaki adımları tek tek uygulayın.

## 📝 Apache Restart

Uygulama düzeldiğinde Apache'yi restart edin:

```bash
# SSH
sudo systemctl restart httpd

# VEYA CWP Panel:
# https://168.119.79.238:2083
# → Webserver Settings → Apache Settings → Restart
```

## ✅ Başarılı Olduğunda

```bash
$ curl http://127.0.0.1:4321/
<!DOCTYPE html>
...
```

Site hazır:
- http://sanliurfa.com
- https://sanliurfa.com

---
**Destek için:** `pm2 logs sanliurfa` çıktısını kontrol edin.

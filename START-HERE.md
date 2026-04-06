# 🚀 BAŞLAT - PostgreSQL Migration Tamamlandı

## ✅ Yapılanlar (Sizin için hazır)

### 1. Kod Migration (Tamamlandı)
- ✅ Supabase → PostgreSQL (37 API route)
- ✅ JWT Authentication sistemi
- ✅ Tüm sayfalar ve component'ler çevrildi
- ✅ Node.js 22.12.0 kurulumu
- ✅ Build başarılı

### 2. Sunucu Hazırlık (Tamamlandı)
- ✅ Proje: `/home/sanliur/public_html`
- ✅ Apache VHost: Port 4321'e yönlendirildi
- ✅ PM2: Kurulu

## 🔧 SON ADIM - Manuel Çözüm

SSH ile bağlanıp **BU KOMUTLARI SIRASIYLA** çalıştırın:

```bash
# 1. SSH Bağlan
ssh sanliur@168.119.79.238 -p 77

# 2. PostgreSQL Auth Düzelt (Çok Önemli!)
sudo sed -i 's/scram-sha-256/trust/g' /var/lib/pgsql/data/pg_hba.conf
sudo sed -i 's/ident/trust/g' /var/lib/pgsql/data/pg_hba.conf
sudo sed -i 's/md5/trust/g' /var/lib/pgsql/data/pg_hba.conf
sudo systemctl restart postgresql

# 3. Database Tablolarını Oluştur
cd /home/sanliur/public_html
psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -f database/schema.sql

# 4. Uygulamayı Başlat
source ~/.nvm/nvm.sh
pm2 stop sanliurfa 2>/dev/null
fuser -k 4321/tcp 2>/dev/null
pm2 start dist/server/entry.mjs --name sanliurfa
pm2 save

# 5. Test
curl http://127.0.0.1:4321/
```

**Başarılı ise:**
```bash
# Apache Restart
sudo systemctl restart httpd
```

**Site hazır:** https://sanliurfa.com

---

## 🆘 Hâlâ Hata Olursa

**Tek komutla tam düzeltme:**
```bash
bash /home/sanliur/public_html/scripts/complete_fix.sh
```

Veya daha basit versiyon:
```bash
cd /home/sanliur/public_html
source ~/.nvm/nvm.sh

# Database elle oluştur
psql -U sanliur_sanliurfa -d sanliur_sanliurfa << 'EOF'
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO users (email, password_hash, full_name, role) 
VALUES ('admin@sanliurfa.com', 'c75c1c5d23c4a30c22b8909b2947733cc538ff62e0da4b27d8589b93c1332866', 'Admin', 'admin')
ON CONFLICT DO NOTHING;
EOF

# Uygulamayı yeniden başlat
pm2 restart sanliurfa
```

---

## 📁 Önemli Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `DEPLOYMENT-STATUS.md` | Tam durum raporu |
| `FINAL-FIX.md` | Detaylı hata giderme |
| `scripts/complete_fix.sh` | Otomatik düzeltme scripti |
| `database/schema.sql` | Database şema dosyası |

---

## 🔐 Admin Girişi

- **URL:** https://sanliurfa.com/giris
- **Email:** admin@sanliurfa.com
- **Şifre:** admin123
- ⚠️ **İlk girişte şifreyi değiştirin!**

---

## 📞 Yardım

Sunucuda bu komutları çalıştırarak kontrol edin:
```bash
source ~/.nvm/nvm.sh
pm2 logs sanliurfa        # Hata logları
curl http://127.0.0.1:4321/   # Test
```

**Migration tamamlandı, sadece son database ve restart işlemi kaldı!** 🎉

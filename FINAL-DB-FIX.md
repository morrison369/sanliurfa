# 🔧 Final Database Fix

## Sorun
Uygulama çalışıyor ama database bağlantısı kurulamıyor.
Hata: `password authentication failed for user "sanliurfa_user"`

## Çözüm

### Adım 1: SSH ile Bağlan
```bash
ssh sanliur@168.119.79.238 -p 77
```

### Adım 2: PostgreSQL Trust Auth Ayarla
```bash
# pg_hba.conf dosyasını düzenle
nano /var/lib/pgsql/data/pg_hba.conf
```

**Dosyada şu değişiklikleri yap:**
- Bul: `host all all 127.0.0.1/32 scram-sha-256`
- Değiştir: `host all all 127.0.0.1/32 trust`

- Bul: `host all all ::1/128 scram-sha-256`  
- Değiştir: `host all all ::1/128 trust`

Kaydet: `Ctrl+X`, `Y`, `Enter`

### Adım 3: PostgreSQL Restart
```bash
sudo systemctl restart postgresql
```

Eğer sudo şifresi isterse: `CHANGE_ME_CWP_SSH_PASSWORD`

### Adım 4: Uygulamayı Yeniden Başlat
```bash
source ~/.nvm/nvm.sh
pm2 restart sanliurfa
```

### Adım 5: Test Et
```bash
curl http://127.0.0.1:4321/api/health
```

Başarılı olursa:
```json
{"status":"healthy","checks":{"database":true}}
```

---

## Alternatif: CWP Panel Üzerinden

1. CWP Panel'e giriş: https://168.119.79.238:2083
2. `PostgreSQL Manager` veya `Database` bölümüne git
3. `sanliur_sanliurfa` veritabanı kullanıcısının şifresini kontrol et
4. Gerekirse şifreyi sıfırla: `CHANGE_ME_DB_PASSWORD`

---

## Hazır Olduktan Sonra

Apache restart:
```bash
sudo systemctl restart httpd
```

Site test:
- http://sanliurfa.com
- https://sanliurfa.com

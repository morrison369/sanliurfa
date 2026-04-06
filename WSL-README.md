# 🐧 WSL Development Guide

Bu rehber, Windows Subsystem for Linux (WSL) üzerinde Şanlıurfa.com projesini çalıştırmak için gerekli adımları içerir.

## 📋 Gereksinimler

- Windows 10/11 (WSL2 enabled)
- Ubuntu 22.04 LTS (WSL üzerinde)
- 8GB+ RAM (önerilen)

## 🚀 Kurulum

### 1. WSL Kurulumu (Windows Terminal - PowerShell)

```powershell
# WSL kurulumu
wsl --install -d Ubuntu-22.04

# WSL2 varsayılan yap
wsl --set-default-version 2

# Ubuntu'yu başlat
wsl -d Ubuntu-22.04
```

### 2. Proje Kurulumu (WSL Terminal)

```bash
# Repoyu klonla (Windows dizinine)
cd /mnt/d/sanliurfa.com

# WSL kurulum scriptini çalıştır
cd sanliurfa
./scripts/wsl-setup.sh
```

### 3. Environment Ayarları

```bash
# WSL environment dosyasını kopyala
cp .env.wsl .env

# (Opsiyonel) Edit et
nano .env
```

## 🐳 Servisleri Başlatma

```bash
# Tüm servisleri başlat (PostgreSQL, Redis, MailHog, MinIO)
./scripts/wsl-start.sh
```

Bu komut şunları başlatır:
- 🗄️ PostgreSQL (port 5432)
- ⚡ Redis (port 6379)
- 📧 MailHog (port 1025 SMTP, 8025 Web)
- 💾 MinIO (port 9000 API, 9001 Console)

## 🌐 Siteyi Görüntüleme

WSL başlatıldığında:
- **Site**: http://localhost:1111
- **MailHog**: http://localhost:8025
- **MinIO**: http://localhost:9001 (minioadmin/minioadmin)

## 🛠️ Faydalı Komutlar

```bash
# Servisleri durdur
./scripts/wsl-stop.sh

# Environment sıfırla (TÜM VERİLERİ SİLER!)
./scripts/wsl-reset.sh

# Logları izle
docker logs -f sanliurfa-postgres
docker logs -f sanliurfa-redis

# Veritabanına bağlan
docker exec -it sanliurfa-postgres psql -U postgres -d sanliurfa
```

## 📁 Dosya Yapısı

```
/mnt/d/sanliurfa.com/     # Windows D: sürücüsü
└── sanliurfa/
    ├── .wslconfig        # WSL ayarları
    ├── .env.wsl          # WSL environment
    ├── docker-compose.dev.yml  # Local servisler
    └── scripts/
        ├── wsl-setup.sh   # Kurulum
        ├── wsl-start.sh   # Başlatma
        ├── wsl-stop.sh    # Durdurma
        └── wsl-reset.sh   # Sıfırlama
```

## 🔧 Sorun Giderme

### Docker izin hatası
```bash
# Kullanıcıyı docker grubuna ekle
sudo usermod -aG docker $USER
# Çıkıp tekrar gir
```

### Port çakışması
```bash
# Kullanılan portları gör
sudo lsof -i :1111
sudo lsof -i :5432

# Portu boşalt
sudo kill -9 <PID>
```

### PostgreSQL bağlantı hatası
```bash
# Container'ı yeniden başlat
docker restart sanliurfa-postgres
```

## 📝 Notlar

- **Windows Explorer**: WSL dosyalarına `\\wsl$\Ubuntu-22.04\` üzerinden erişilebilir
- **VS Code**: WSL uzantısı ile doğrudan WSL'de çalışabilirsiniz
- **Performans**: Dosyaları `/home/<user>/` altında tutmak daha hızlıdır

## 🎯 Hızlı Başlangıç

```bash
# 1. WSL terminal aç
wsl

# 2. Proje dizinine git
cd /mnt/d/sanliurfa.com/sanliurfa

# 3. Servisleri başlat
./scripts/wsl-start.sh

# 4. Browser'da aç
# http://localhost:1111
```

**Artık geliştirmeye hazırsınız!** 🎉

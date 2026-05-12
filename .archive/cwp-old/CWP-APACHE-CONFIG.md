# CWP Apache Yapılandırması - Son Adım

## 🌐 CWP Panel Giriş

**URL:** https://168.119.79.238:2083  
**Kullanıcı:** sanliur  
**Şifre:** SSH şifreniz

---

## 🔧 Apache Reverse Proxy Yapılandırması

### Adım 1: CWP Panel'e Giriş
1. https://168.119.79.238:2083 adresine git
2. Kullanıcı: `sanliur` ve şifre ile giriş yap

### Adım 2: Domain Yapılandırması
1. Sol menüden: **Webserver Settings** → **Webserver Domain Conf**

2. Ayarları şu şekilde doldur:

| Alan | Değer |
|------|-------|
| **Username** | sanliur |
| **Domain** | senin-domainin.com (veya server.elginoz.com) |
| **Configuration** | Apache → **Proxy** → **Custom Port** |
| **Port** | 3000 |
| **IP** | 127.0.0.1 |
| **Rebuild webserver conf** | ✅ İşaretle |

3. **Save Changes** butonuna tıkla

### Adım 3: Apache Restart
1. Sol menüden: **Service Management** → **Apache**
2. **Restart** butonuna tıkla

---

## 📝 Alternatif: .htaccess ile Yönlendirme

Eğer CWP panelde proxy ayarı çalışmazsa, `.htaccess` dosyası kullanabilirsin:

```apache
# /home/sanliur/public_html/.htaccess
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]

# WebSocket desteği (gerekirse)
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteRule ^/?(.*) "ws://127.0.0.1:3000/$1" [P,L]
```

---

## 🧪 Test

Yapılandırma tamamlandıktan sonra:

```bash
# Sunucuda test
curl -I http://localhost/

# Dışarıdan test
curl -I http://168.119.79.238/
```

**Beklenen sonuç:** HTTP/1.1 200 OK

---

## 🔒 SSL (HTTPS) Kurulumu

1. CWP Panel → **Webserver Settings** → **SSL Certificates** → **AutoSSL**
2. Kullanıcı: `sanliur`
3. Domain seç
4. **Install SSL** butonuna tıkla

---

## 📊 Durum Kontrol

Sunucuda şu komutları kullanabilirsin:

```bash
# SSH ile bağlan
ssh -p 77 sanliur@168.119.79.238

# Uygulama durumu
source ~/.nvm/nvm.sh && pm2 list

# Logları izle
source ~/.nvm/nvm.sh && pm2 logs sanliurfa

# Yeniden başlat
source ~/.nvm/nvm.sh && pm2 restart sanliurfa

# Port kontrol
netstat -tlnp | grep 3000
```

---

## 🎯 Sonuç

Yapılandırma tamamlandığında:
- **HTTP:** http://168.119.79.238 veya domaininiz
- **Node.js:** 3000 portunda çalışıyor
- **PM2:** Arkaplanda sürekli çalışıyor

---

## 🐛 Sorun Giderme

### 502 Bad Gateway Hatası
```bash
# Apache proxy modülünü kontrol et
httpd -M | grep proxy
```

Eksikse CWP panelden proxy modülünü aktif et.

### Uygulama Çalışmıyor
```bash
source ~/.nvm/nvm.sh && pm2 logs sanliurfa
```

### Port Kullanımda
```bash
# 3000 portunu kullanan process'i bul
lsof -i :3000

# Varsa öldür
kill -9 <PID>
```

---

## ✅ Özet

| İşlem | Durum |
|-------|-------|
| Node.js 22.12.0 | ✅ Kurulu |
| Uygulama Build | ✅ Tamamlandı |
| PM2 Process | ✅ Çalışıyor |
| Port 3000 | ✅ Dinleniyor |
| CWP Apache Proxy | ⏳ Yapılandırılacak |
| SSL | ⏳ Kurulacak |

**Site şu an http://168.119.79.238:3000 adresinde çalışıyor!** 🚀

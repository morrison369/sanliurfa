# CWP (CentOS Web Panel) Apache Yapılandırması

## Apache Proxy Ayarları (Port 6000)

### 1. CWP Panel'e Giriş
- URL: https://168.119.79.238:2083
- Kullanıcı: sanliur
- Şifre: CHANGE_ME_CWP_SSH_PASSWORD

### 2. Domain Yapılandırması
```
Webserver Settings → Webserver Domain Conf
```

Veya doğrudan vhost dosyasını düzenleyin:

```bash
# SSH ile bağlan
ssh sanliur@168.119.79.238 -p 77

# Vhost dosyasını düzenle (dosya yolu değişebilir)
sudo nano /etc/apache2/conf.d/vhosts/sanliurfa.com.conf
# veya
sudo nano /usr/local/apache/conf/extra/httpd-vhosts.conf
```

### 3. Proxy Ayarları
```apache
<VirtualHost *:80>
    ServerName sanliurfa.com
    ServerAlias www.sanliurfa.com
    DocumentRoot /home/sanliur/public_html
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:6000/
    ProxyPassReverse / http://127.0.0.1:6000/
    
    # WebSocket desteği (gerekirse)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:6000/$1" [P,L]
</VirtualHost>

# HTTPS (SSL)
<VirtualHost *:443>
    ServerName sanliurfa.com
    ServerAlias www.sanliurfa.com
    DocumentRoot /home/sanliur/public_html
    
    SSLEngine on
    SSLCertificateFile /home/sanliur/public_html/ssl/sanliurfa.com.crt
    SSLCertificateKeyFile /home/sanliur/public_html/ssl/sanliurfa.com.key
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:6000/
    ProxyPassReverse / http://127.0.0.1:6000/
</VirtualHost>
```

### 4. Apache Modüllerini Etkinleştir
```bash
# Proxy modülleri
sudo yum install mod_proxy mod_proxy_http mod_proxy_wstunnel

# Apache'yi yeniden başlat
sudo systemctl restart httpd
# veya
sudo service httpd restart
```

### 5. Test
```bash
# Uygulama çalışıyor mu?
curl http://127.0.0.1:6000/

# Apache proxy çalışıyor mu?
curl http://sanliurfa.com/
```

## Alternatif: .htaccess ile Proxy
Eğer CWP vhost erişiminiz yoksa `.htaccess` kullanabilirsiniz:

```htaccess
# /home/sanliur/public_html/.htaccess
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:6000/$1 [P,L]
```

**Not:** `mod_proxy` gereklidir.

## Cloudflare + CWP
Cloudflare kullanıyorsanız:

1. Cloudflare SSL/TLS modu: **Full (strict)**
2. CWP'de SSL sertifikası yüklü olmalı
3. Origin sertifikası kullanabilirsiniz

## Hata Ayıklama

### 502 Bad Gateway
```bash
# Node.js uygulaması çalışıyor mu?
source ~/.nvm/nvm.sh
pm2 status

# Port dinleniyor mu?
netstat -tlnp | grep 6000

# Logları kontrol et
pm2 logs sanliurfa
```

### 503 Service Unavailable
```bash
# Apache proxy modülü yüklü mü?
httpd -M | grep proxy

# SELinux kısıtlaması olabilir
sudo setsebool -P httpd_can_network_connect 1
```

## Komutlar Özeti

```bash
# SSH
cd /home/sanliur/public_html

# Node.js uygulama yönetimi
source ~/.nvm/nvm.sh
pm2 list
pm2 logs sanliurfa
pm2 restart sanliurfa

# Apache
sudo systemctl restart httpd
sudo systemctl status httpd
sudo tail -f /var/log/httpd/error_log

# PostgreSQL
psql -U sanliur_sanliurfa -d sanliur_sanliurfa
```

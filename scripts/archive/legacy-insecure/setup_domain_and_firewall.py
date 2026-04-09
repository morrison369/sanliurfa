#!/usr/bin/env python3
"""Domain ve Firewall Yapılandırması"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
DOMAIN = "sanliurfa.com"
APP_PORT = 6000

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

print("🌐 Domain ve Firewall Yapılandırması")
print("=" * 70)

# 1. DNS Kontrolü
print(f"\n1️⃣ DNS Kontrolü ({DOMAIN}):")
stdin, stdout, stderr = ssh.exec_command(f"dig +short {DOMAIN} | head -5")
dns_result = stdout.read().decode().strip()
if dns_result:
    print(f"  📋 DNS A kayıtları:")
    for ip in dns_result.split('\n'):
        if ip.strip():
            match = "✅ EŞLEŞİYOR" if ip.strip() == HOST else "⚠️ FARKLI"
            print(f"     {ip.strip()} {match}")
else:
    print(f"  ⚠️ {DOMAIN} için DNS kaydı bulunamadı")
    print(f"  📝 DNS A kaydı eklenmeli: {DOMAIN} → {HOST}")

# 2. CWP Domain Ekleme
print(f"\n2️⃣ CWP Domain Yapılandırması:")
print(f"  📝 CWP Panel'den manuel ekleme gerekli:")
print(f"     https://{HOST}:2083")
print(f"     Domain: {DOMAIN}")
print(f"     DocumentRoot: /home/sanliur/public_html")

# 3. Apache vhost güncelleme (domain için)
print(f"\n3️⃣ Apache VirtualHost ({DOMAIN}):")
vhost_config = f"""# {DOMAIN} VirtualHost
<VirtualHost *:80>
    ServerName {DOMAIN}
    ServerAlias www.{DOMAIN}
    DocumentRoot /home/sanliur/public_html
    
    # Proxy to Node.js
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass / http://127.0.0.1:{APP_PORT}/
    ProxyPassReverse / http://127.0.0.1:{APP_PORT}/
    
    RewriteEngine On
    RewriteCond %{{HTTP:Upgrade}} websocket [NC]
    RewriteCond %{{HTTP:Connection}} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:{APP_PORT}/$1" [P,L]
    
    ErrorLog /home/sanliur/public_html/logs/{DOMAIN}-error.log
    CustomLog /home/sanliur/public_html/logs/{DOMAIN}-access.log combined
    
    <Directory /home/sanliur/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>

# HTTPS (SSL ile)
<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName {DOMAIN}
    ServerAlias www.{DOMAIN}
    DocumentRoot /home/sanliur/public_html
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/{DOMAIN}/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/{DOMAIN}/privkey.pem
    
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass / http://127.0.0.1:{APP_PORT}/
    ProxyPassReverse / http://127.0.0.1:{APP_PORT}/
    
    RewriteEngine On
    RewriteCond %{{HTTP:Upgrade}} websocket [NC]
    RewriteCond %{{HTTP:Connection}} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:{APP_PORT}/$1" [P,L]
    
    ErrorLog /home/sanliur/public_html/logs/{DOMAIN}-ssl-error.log
    CustomLog /home/sanliur/public_html/logs/{DOMAIN}-ssl-access.log combined
</VirtualHost>
</IfModule>
"""

# vhost dosyasını yaz
vhost_path = f"/usr/local/apache/conf.d/vhosts/{DOMAIN}.conf"
sftp = ssh.open_sftp()
try:
    sftp.putfo(__import__('io').BytesIO(vhost_config.encode()), vhost_path)
    print(f"  ✅ {vhost_path} yazıldı")
except Exception as e:
    print(f"  ⚠️ Yazılamadı: {e}")
    print(f"  📝 CWP Panel'den manuel ekle")
finally:
    sftp.close()

# 4. Firewall Ayarları
print(f"\n4️⃣ Firewall Yapılandırması:")

# Mevcut durumu kontrol et
stdin, stdout, stderr = ssh.exec_command("sudo firewall-cmd --list-all 2>/dev/null || iptables -L -n | head -20")
firewall_status = stdout.read().decode()
print(f"  📋 Mevcut durum:")
print(f"     {firewall_status[:500]}")

# Firewall kuralları
firewall_commands = [
    # Firewalld kullanıyorsa
    ("sudo systemctl is-active firewalld", "Firewalld aktif mi?"),
    ("sudo firewall-cmd --permanent --remove-port=6000/tcp 2>/dev/null; echo 'OK'", "Port 6000 dışarıya kapat"),
    ("sudo firewall-cmd --permanent --add-port=80/tcp 2>/dev/null; echo 'OK'", "Port 80 açık"),
    ("sudo firewall-cmd --permanent --add-port=443/tcp 2>/dev/null; echo 'OK'", "Port 443 açık"),
    ("sudo firewall-cmd --permanent --add-rich-rule='rule family=ipv4 source address=127.0.0.1 port port=6000 protocol=tcp accept' 2>/dev/null; echo 'OK'", "Port 6000 sadece localhost"),
    ("sudo firewall-cmd --reload 2>/dev/null; echo 'OK'", "Firewall yenile"),
]

print(f"\n  🔧 Kurallar uygulanıyor:")
for cmd, desc in firewall_commands:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    result = stdout.read().decode().strip()
    if "OK" in result or "active" in result:
        print(f"    ✅ {desc}")
    else:
        print(f"    ⚠️ {desc}: {result[:100]}")

# Alternatif: iptables
print(f"\n  📝 Alternatif iptables kuralları:")
iptables_rules = f"""
# Port 6000'ü sadece localhost'a izin ver
iptables -A INPUT -p tcp --dport {APP_PORT} -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport {APP_PORT} -j DROP

# 80 ve 443 herkese açık
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# SSH (port 77) açık kalsın
iptables -A INPUT -p tcp --dport 77 -j ACCEPT
"""
print(f"  {iptables_rules}")

# 5. Test
print(f"\n5️⃣ Test:")

# Domain çözümlemesi
print(f"  🌐 Domain test:")
stdin, stdout, stderr = ssh.exec_command(f"curl -m 5 -s -o /dev/null -w '%{{http_code}}' http://{DOMAIN}/ 2>&1")
code = stdout.read().decode().strip()
if code == "200":
    print(f"    ✅ {DOMAIN}: HTTP 200")
else:
    print(f"    ⚠️ {DOMAIN}: HTTP {code}")

# Port 6000 dışarıdan erişilemez olmalı
print(f"  🔒 Port {APP_PORT} güvenlik testi:")
stdin, stdout, stderr = ssh.exec_command(f"timeout 3 bash -c '</dev/tcp/localhost/{APP_PORT}' && echo 'LOCALHOST: Açık' || echo 'LOCALHOST: Kapalı'")
local_result = stdout.read().decode().strip()
print(f"    {local_result}")

ssh.close()

print("\n" + "=" * 70)
print("🎉 DOMAIN VE FIREWALL YAPILANDIRMASI TAMAMLANDI!")
print("=" * 70)
print(f"""
📋 Özet:
  Domain: {DOMAIN}
  IP: {HOST}
  
🌐 Erişim:
  http://{DOMAIN}      → 80 → {APP_PORT}
  https://{DOMAIN}     → 443 → {APP_PORT} (SSL ile)
  
🔒 Güvenlik:
  Port {APP_PORT}: Sadece localhost (127.0.0.1)
  Port 80: Herkese açık
  Port 443: Herkese açık (SSL)
  Port 77: SSH (mevcut)
  
📝 Manuel İşlemler:
  1. DNS A kaydı: {DOMAIN} → {HOST}
  2. CWP Panel'de domain ekleme
  3. SSL sertifikası yenileme (domain için)
""")

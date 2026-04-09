#!/usr/bin/env python3
"""CWP Apache Proxy Yapılandırması"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
APP_PORT = 6000
DOMAIN = "168.119.79.238"  # IP adresi

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

print("🌐 CWP Apache Proxy Yapılandırması")
print("=" * 60)

# 1. Apache modüllerini kontrol et
print("\n📋 Apache Modülleri:")
modules = ['proxy', 'proxy_http', 'proxy_balancer', 'lbmethod_byrequests', 'ssl']
for mod in modules:
    stdin, stdout, stderr = ssh.exec_command(f"httpd -M 2>/dev/null | grep {mod} || echo '{mod} not found'")
    result = stdout.read().decode().strip()
    if "not found" not in result:
        print(f"  ✅ {mod}")
    else:
        print(f"  ⚠️ {mod} eksik")

# 2. vhost dosyasını oluştur/güncelle
print("\n🔧 VirtualHost Yapılandırması:")

vhost_config = f"""# CWP Proxy Configuration for Sanliurfa.com
# Auto-generated: {__import__('datetime').datetime.now().isoformat()}

<VirtualHost *:80>
    ServerName {DOMAIN}
    ServerAlias www.{DOMAIN}
    DocumentRoot /home/sanliur/public_html
    
    # Proxy to Node.js app on port {APP_PORT}
    ProxyPreserveHost On
    ProxyRequests Off
    
    ProxyPass / http://127.0.0.1:{APP_PORT}/
    ProxyPassReverse / http://127.0.0.1:{APP_PORT}/
    
    # WebSocket support (if needed)
    RewriteEngine On
    RewriteCond %{{HTTP:Upgrade}} websocket [NC]
    RewriteCond %{{HTTP:Connection}} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:{APP_PORT}/$1" [P,L]
    
    # Loglar
    ErrorLog /home/sanliur/public_html/logs/error.log
    CustomLog /home/sanliur/public_html/logs/access.log combined
    
    <Directory /home/sanliur/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
"""

# logs dizini oluştur
ssh.exec_command("mkdir -p /home/sanliur/public_html/logs")

# vhost dosyası yolu (CWP için genellikle)
vhost_paths = [
    "/etc/apache2/conf.d/vhosts/sanliur.conf",
    "/etc/httpd/conf.d/vhosts/sanliur.conf",
    "/usr/local/apache/conf.d/vhosts/sanliur.conf"
]

vhost_written = False
for vhost_path in vhost_paths:
    # Dizin var mı kontrol et
    dir_path = vhost_path.rsplit('/', 1)[0]
    stdin, stdout, stderr = ssh.exec_command(f"ls -la {dir_path} 2>/dev/null")
    if stdout.channel.recv_exit_status() == 0:
        print(f"  📁 {dir_path} bulundu")
        # vhost dosyasını yaz
        sftp = ssh.open_sftp()
        try:
            sftp.putfo(__import__('io').BytesIO(vhost_config.encode()), vhost_path)
            print(f"  ✅ {vhost_path} yazıldı")
            vhost_written = True
            break
        except Exception as e:
            print(f"  ⚠️ {vhost_path} yazılamadı: {e}")
        finally:
            sftp.close()

if not vhost_written:
    print("  ⚠️ Hiçbir vhost dizinine yazılamadı!")
    print("  📝 Manuel CWP panel yapılandırması gerekli")

# 3. .htaccess ile alternatif yönlendirme
print("\n📝 .htaccess Alternatif:")
htaccess = f"""# Apache Proxy to Node.js
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:{APP_PORT}/$1 [P,L]

# WebSocket support
RewriteCond %{{HTTP:Upgrade}} websocket [NC]
RewriteRule ^/?(.*) "ws://127.0.0.1:{APP_PORT}/$1" [P,L]
"""

sftp = ssh.open_sftp()
try:
    sftp.putfo(__import__('io').BytesIO(htaccess.encode()), "/home/sanliur/public_html/.htaccess")
    print("  ✅ .htaccess yazıldı")
except Exception as e:
    print(f"  ⚠️ .htaccess yazılamadı: {e}")
finally:
    sftp.close()

# 4. Apache restart
print("\n🔄 Apache Restart:")
stdin, stdout, stderr = ssh.exec_command("sudo systemctl restart httpd 2>&1 || sudo systemctl restart apache2 2>&1 || echo 'Restart failed'")
result = stdout.read().decode()
if "failed" not in result.lower():
    print("  ✅ Apache restart edildi")
else:
    print(f"  ⚠️ Restart durumu: {result[:200]}")

# 5. Test
print("\n🧪 Test:")
time.sleep(2)
stdin, stdout, stderr = ssh.exec_command(f"curl -m 5 -s -o /dev/null -w '%{{http_code}}' http://{DOMAIN}/")
code = stdout.read().decode().strip()
if code == "200":
    print(f"  ✅ HTTP {code} - Proxy çalışıyor!")
elif code == "500":
    print(f"  ⚠️ HTTP {code} - Apache hatası")
else:
    print(f"  ⚠️ HTTP {code}")

ssh.close()

print("\n" + "=" * 60)
print("🎉 CWP PROXY YAPILANDIRMASI TAMAMLANDI!")
print("=" * 60)
print(f"""
📋 Özet:
  Port {APP_PORT} → 80 (HTTP)
  
🌐 Erişim:
  http://{DOMAIN}  ← 80 portundan
  http://{DOMAIN}:{APP_PORT}  ← Doğrudan Node.js

🔧 CWP Panel (manuel kontrol):
  https://{HOST}:2083
  Webserver Settings → Webserver Domain Conf
  
📁 Dosyalar:
  vhost: {vhost_path if vhost_written else 'Yazılamadı'}
  .htaccess: /home/sanliur/public_html/.htaccess
""")

#!/usr/bin/env python3
"""
CWP Apache VHost yapılandırması
sanliurfa.com için proxy ayarları
"""
import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

VHOST_CONFIG = """<VirtualHost *:80>
    ServerName sanliurfa.com
    ServerAlias www.sanliurfa.com
    DocumentRoot /home/sanliur/public_html
    ServerAdmin webmaster@sanliurfa.com
    
    # Proxy to Node.js app
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:4321/
    ProxyPassReverse / http://127.0.0.1:4321/
    
    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:4321/$1" [P,L]
    
    <Directory /home/sanliur/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog /home/sanliur/public_html/logs/apache-error.log
    CustomLog /home/sanliur/public_html/logs/apache-access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName sanliurfa.com
    ServerAlias www.sanliurfa.com
    DocumentRoot /home/sanliur/public_html
    ServerAdmin webmaster@sanliurfa.com
    
    SSLEngine on
    SSLCertificateFile /home/sanliur/public_html/ssl/sanliurfa.com.crt
    SSLCertificateKeyFile /home/sanliur/public_html/ssl/sanliurfa.com.key
    
    # Proxy to Node.js app
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:4321/
    ProxyPassReverse / http://127.0.0.1:4321/
    
    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:4321/$1" [P,L]
    
    <Directory /home/sanliur/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog /home/sanliur/public_html/logs/apache-error.log
    CustomLog /home/sanliur/public_html/logs/apache-access.log combined
</VirtualHost>
"""

def main():
    print("🔧 CWP Apache VHost Yapılandırması")
    print("=" * 60)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    
    # 1. VHost dosya yollarını bul
    print("\n1️⃣ VHost dizini kontrol ediliyor...")
    possible_paths = [
        "/etc/apache2/conf.d/vhosts/sanliurfa.com.conf",
        "/etc/apache2/conf.d/vhosts/sanliurfa.com.ssl.conf",
        "/usr/local/apache/conf/extra/httpd-vhosts.conf",
        "/etc/httpd/conf.d/vhosts.conf",
        "/home/sanliur/.conf/apache/sanliurfa.com.conf"
    ]
    
    vhost_path = None
    for path in possible_paths:
        stdin, stdout, stderr = ssh.exec_command(f"ls -la {path} 2>/dev/null")
        if stdout.read().decode().strip():
            vhost_path = path
            print(f"   ✅ Found: {path}")
            break
    
    if not vhost_path:
        # CWP vhost dizini
        vhost_path = "/home/sanliur/.conf/apache/sanliurfa.com.conf"
        print(f"   📝 Creating: {vhost_path}")
    
    # 2. VHost dosyasını yaz
    print("\n2️⃣ VHost yapılandırması yazılıyor...")
    
    # Önce logs dizini oluştur
    ssh.exec_command("mkdir -p /home/sanliur/public_html/logs")
    
    # VHost dosyasını yaz
    stdin, stdout, stderr = ssh.exec_command(f"cat > {vhost_path}", get_pty=True)
    stdin.write(VHOST_CONFIG)
    stdin.close()
    time.sleep(1)
    
    # 3. Apache modüllerini kontrol et
    print("\n3️⃣ Apache modülleri kontrol ediliyor...")
    stdin, stdout, stderr = ssh.exec_command("httpd -M 2>/dev/null | grep -E 'proxy|rewrite' || apachectl -M 2>/dev/null | grep -E 'proxy|rewrite'")
    modules = stdout.read().decode()
    print(f"   Modüller: {modules[:300] if modules else 'Kontrol edilemedi'}")
    
    # 4. Apache config test
    print("\n4️⃣ Apache yapılandırması test ediliyor...")
    stdin, stdout, stderr = ssh.exec_command("httpd -t 2>&1 || apachectl configtest 2>&1")
    test_result = stdout.read().decode()
    if "Syntax OK" in test_result or "syntax ok" in test_result.lower():
        print("   ✅ Syntax OK")
    else:
        print(f"   ⚠️ {test_result[:200]}")
    
    # 5. Node.js uygulamasını başlat (eğer çalışmıyorsa)
    print("\n5️⃣ Node.js uygulaması kontrol ediliyor...")
    NVM_PREFIX = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
    
    stdin, stdout, stderr = ssh.exec_command(NVM_PREFIX + "pm2 list | grep sanliurfa")
    pm2_status = stdout.read().decode()
    
    if "online" not in pm2_status.lower():
        print("   🚀 Uygulama başlatılıyor...")
        ssh.exec_command(NVM_PREFIX + "cd /home/sanliur/public_html && pm2 start dist/server/entry.mjs --name sanliurfa -- --port 4321")
        time.sleep(3)
        ssh.exec_command(NVM_PREFIX + "pm2 save")
    else:
        print("   ✅ Uygulama çalışıyor")
    
    # 6. Apache'yi yeniden başlat (eğer sudo yetkisi varsa)
    print("\n6️⃣ Apache yeniden başlatılıyor...")
    print("   📝 Not: Apache restart için CWP Panel kullanın:")
    print("   https://168.119.79.238:2083")
    print("   Webserver Settings → Apache Settings → Restart")
    
    ssh.close()
    
    print("\n" + "=" * 60)
    print("✅ VHost yapılandırması tamamlandı!")
    print("")
    print("📋 Sonraki adımlar:")
    print("   1. CWP Panel'den Apache'yi restart edin")
    print("   2. https://sanliurfa.com adresini test edin")
    print("   3. Cloudflare SSL/TLS modu: Full (strict)")
    print("")
    print("🔧 VHost dosyası:")
    print(f"   {vhost_path}")

if __name__ == "__main__":
    main()

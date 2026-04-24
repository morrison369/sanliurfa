#!/usr/bin/env python3
"""
Complete CWP Setup - Apache VHost + App Start
"""
import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    print("🔧 Complete CWP Setup")
    print("=" * 60)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    
    NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
    
    # 1. Stop existing
    print("\n1️⃣ Stopping existing app...")
    ssh.exec_command(NVM + "pm2 stop sanliurfa 2>/dev/null; pm2 delete sanliurfa 2>/dev/null; fuser -k 4321/tcp 2>/dev/null; echo 'OK'")
    time.sleep(2)
    
    # 2. Fix Apache vhost
    print("\n2️⃣ Apache VHost yapılandırması...")
    vhost_80 = '''<VirtualHost *:80>
    ServerName sanliurfa.com
    ServerAlias www.sanliurfa.com
    DocumentRoot /home/sanliur/public_html
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:4321/
    ProxyPassReverse / http://127.0.0.1:4321/
    
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:4321/$1" [P,L]
    
    <Directory /home/sanliur/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog /home/sanliur/public_html/logs/error.log
    CustomLog /home/sanliur/public_html/logs/access.log combined
</VirtualHost>
'''
    
    # Vhost dosyasını yaz (sadece :80)
    cmd = f"cat > /home/sanliur/.conf/apache/sanliurfa.com.conf << 'EOF'\n{vhost_80}\nEOF"
    ssh.exec_command(cmd)
    print("   ✅ VHost (HTTP) yazıldı")
    
    # 3. Start app
    print("\n3️⃣ Starting Node.js app...")
    ssh.exec_command("mkdir -p /home/sanliur/public_html/logs")
    
    # Önce test et
    stdin, stdout, stderr = ssh.exec_command(
        f"cd /home/sanliur/public_html && {NVM} timeout 5 node dist/server/entry.mjs --port 4321 2>&1 &"
    )
    time.sleep(3)
    
    # Test HTTP
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/ 2>/dev/null || echo 'FAIL'")
    test_result = stdout.read().decode().strip()
    
    if test_result == "200":
        print("   ✅ App working!")
        # PM2'ye kaydet
        ssh.exec_command(f"cd /home/sanliur/public_html && {NVM} pm2 start dist/server/entry.mjs --name sanliurfa -- --port 4321")
        time.sleep(2)
        ssh.exec_command(NVM + "pm2 save")
    else:
        print(f"   ⚠️ App test failed: {test_result}")
        print("   Checking logs...")
        stdin, stdout, stderr = ssh.exec_command(f"cd /home/sanliur/public_html && {NVM} node dist/server/entry.mjs --port 4321 2>&1 &")
        time.sleep(3)
    
    # 4. Final status
    print("\n4️⃣ Final status...")
    stdin, stdout, _ = ssh.exec_command(NVM + "pm2 list 2>/dev/null | grep sanliurfa || echo 'Not in PM2'")
    print("   PM2:", stdout.read().decode().strip()[:100])
    
    stdin, stdout, _ = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/ 2>/dev/null || echo '000'")
    http = stdout.read().decode().strip()
    print("   HTTP:", http)
    
    ssh.close()
    
    print("\n" + "=" * 60)
    print("✅ Setup complete!")
    print("")
    print("🌐 Test URLs:")
    print("   http://sanliurfa.com")
    print("   https://sanliurfa.com")
    print("")
    print("🔧 CWP Panel: https://168.119.79.238:2083")
    print("   → Apache Settings → Restart Apache")

if __name__ == "__main__":
    main()

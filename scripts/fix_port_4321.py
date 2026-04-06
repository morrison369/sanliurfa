#!/usr/bin/env python3
"""
Fix Apache proxy to use port 4321 (Astro default)
"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    
    NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
    
    print("🔧 Fixing Apache Proxy (Port 4321)")
    print("=" * 60)
    
    # 1. Kill existing processes on 4321
    print("\n1️⃣ Clearing port 4321...")
    ssh.exec_command("fuser -k 4321/tcp 2>/dev/null || true")
    ssh.exec_command(NVM + "pm2 stop sanliurfa 2>/dev/null; pm2 delete sanliurfa 2>/dev/null")
    
    # 2. Update Apache vhost to use 4321
    print("\n2️⃣ Updating Apache vhost...")
    vhost = '''<VirtualHost *:80>
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
    cmd = f"cat > /home/sanliur/.conf/apache/sanliurfa.com.conf << 'EOF'\n{vhost}\nEOF"
    ssh.exec_command(cmd)
    print("   ✅ VHost updated (port 4321)")
    
    # 3. Start app
    print("\n3️⃣ Starting app on port 4321...")
    ssh.exec_command(f"cd /home/sanliur/public_html && {NVM} pm2 start dist/server/entry.mjs --name sanliurfa")
    import time
    time.sleep(3)
    
    # 4. Test
    print("\n4️⃣ Testing...")
    stdin, stdout, _ = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/ 2>/dev/null || echo 'FAIL'")
    result = stdout.read().decode().strip()
    
    if result == "200":
        print("   ✅ HTTP 200 - Working!")
        ssh.exec_command(NVM + "pm2 save")
    else:
        print(f"   ⚠️ HTTP {result}")
    
    stdin, stdout, _ = ssh.exec_command(NVM + "pm2 list | grep sanliurfa")
    print("   PM2:", stdout.read().decode().strip()[:100])
    
    ssh.close()
    
    print("\n" + "=" * 60)
    print("✅ Port fix applied!")
    print("🌐 http://sanliurfa.com")
    print("")
    print("⚠️  CWP Panel'den Apache'yi restart edin:")
    print("   https://168.119.79.238:2083")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Final sistem kontrolü"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

print("✅ FİNAL SİSTEM KONTROLÜ")
print("=" * 70)

# 1. Node.js
print("\n1️⃣ Node.js:")
stdin, stdout, stderr = ssh.exec_command('export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && node -v && npm -v')
print("  ", stdout.read().decode().strip().replace('\n', ' | '))

# 2. PostgreSQL
print("\n2️⃣ PostgreSQL:")
stdin, stdout, stderr = ssh.exec_command("psql --version 2>/dev/null | head -1")
print("  ", stdout.read().decode().strip())
stdin, stdout, stderr = ssh.exec_command("sudo -u postgres psql -d sanliurfa -c 'SELECT COUNT(*) as tables FROM pg_tables WHERE schemaname = public;' 2>&1 | grep -E '[0-9]' | head -1")
result = stdout.read().decode().strip()
if result:
    print(f"  ✅ {result} tablo")

# 3. Uygulama Durumu
print("\n3️⃣ Uygulama (PM2):")
stdin, stdout, stderr = ssh.exec_command('export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && pm2 list')
lines = stdout.read().decode().split('\n')
for line in lines:
    if 'sanliurfa' in line:
        print("  ", line.strip())

# 4. Portlar
print("\n4️⃣ Portlar:")
ports = [80, 443, 6000]
for port in ports:
    stdin, stdout, stderr = ssh.exec_command(f"netstat -tlnp 2>/dev/null | grep ':{port} ' || ss -tlnp | grep ':{port} '")
    result = stdout.read().decode().strip()
    if result:
        status = "✅ AÇIK"
    else:
        status = "❌ KAPALI"
    print(f"  Port {port}: {status}")

# 5. HTTP Test
print("\n5️⃣ HTTP Test:")
for url in ['http://168.119.79.238/', 'http://168.119.79.238:6000/']:
    stdin, stdout, stderr = ssh.exec_command(f"curl -m 3 -s -o /dev/null -w '%{{http_code}}' {url}")
    code = stdout.read().decode().strip()
    icon = "✅" if code == "200" else "⚠️"
    print(f"  {icon} {url}: HTTP {code}")

# 6. Disk/RAM
print("\n6️⃣ Sistem Kaynakları:")
stdin, stdout, stderr = ssh.exec_command("free -h | grep Mem | awk '{print \"RAM: \" $3 \" / \" $2}'")
print("  ", stdout.read().decode().strip())
stdin, stdout, stderr = ssh.exec_command("df -h /home | tail -1 | awk '{print \"Disk: \" $3 \" / \" $2 \" (\" $5 \" kullanılan)\"}'")
print("  ", stdout.read().decode().strip())

# 7. Log Kontrol
print("\n7️⃣ Son Hatalar:")
stdin, stdout, stderr = ssh.exec_command('export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && pm2 logs sanliurfa --lines 5 --nostream 2>&1 | grep -i error || echo "  Hata yok ✓"')
print(stdout.read().decode()[:500])

ssh.close()

print("\n" + "=" * 70)
print("🎉 KONTROL TAMAMLANDI!")
print("=" * 70)

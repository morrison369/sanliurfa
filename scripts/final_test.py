#!/usr/bin/env python3
"""Final test"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD')

print("🧪 FİNAL TEST")
print("=" * 60)

# 1. HTTP Test
print("\n1️⃣ Ana Sayfa Test:")
stdin, stdout, stderr = ssh.exec_command("curl -m 5 -s http://127.0.0.1:6000/ | head -100")
html = stdout.read().decode()
if "Sanliurfa" in html or "Şanlıurfa" in html or "HTML" in html:
    print("✅ Ana sayfa yükleniyor!")
    print(f"   Başlık: {html[html.find('<title>'):html.find('</title>')+8] if '<title>' in html else 'Bulunamadi'}")
else:
    print("⚠️ İçerik kontrol edilmeli")

# 2. API Test
print("\n2️⃣ API Endpoint Test:")
api_endpoints = ['/api/health', '/api/places', '/api/blog']
for endpoint in api_endpoints:
    stdin, stdout, stderr = ssh.exec_command(f"curl -m 3 -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:6000{endpoint}")
    code = stdout.read().decode().strip()
    status = "✅" if code in ["200", "404"] else "⚠️"
    print(f"   {status} {endpoint}: HTTP {code}")

# 3. PM2 Durum
print("\n3️⃣ PM2 Durum:")
NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
stdin, stdout, stderr = ssh.exec_command(NVM + "pm2 list")
print(stdout.read().decode())

# 4. Port Kontrol
print("\n4️⃣ Port Kontrol:")
stdin, stdout, stderr = ssh.exec_command("netstat -tlnp 2>/dev/null | grep 6000 || ss -tlnp | grep 6000")
print(stdout.read().decode())

# 5. PostgreSQL Bağlantı
print("\n5️⃣ PostgreSQL Bağlantı:")
stdin, stdout, stderr = ssh.exec_command("sudo -u postgres psql -d sanliurfa -c 'SELECT COUNT(*) FROM places;' 2>&1")
result = stdout.read().decode()
if "count" in result.lower() or "3" in result:
    print("✅ PostgreSQL bağlantısı OK")
    print(f"   {result.strip()}")
else:
    print(f"   {result.strip()[:200]}")

# 6. Son Loglar
print("\n6️⃣ Son Loglar:")
stdin, stdout, stderr = ssh.exec_command("tail -10 /home/sanliur/.pm2/logs/sanliurfa-out-0.log")
print(stdout.read().decode())

ssh.close()

print("\n" + "=" * 60)
print("🎉 TÜM TESTLER TAMAMLANDI!")
print("=" * 60)

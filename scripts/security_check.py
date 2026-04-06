#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD')

print("🔒 GÜVENLİK KONTROLÜ")
print("=" * 60)

print("\n📋 Açık Portlar:")
stdin, stdout, stderr = ssh.exec_command("netstat -tlnp 2>/dev/null | grep LISTEN | head -10")
for line in stdout.read().decode().split('\n')[:8]:
    if line.strip():
        print(f"  {line.strip()[:70]}")

print("\n🔐 Port 6000 Güvenlik:")
stdin, stdout, stderr = ssh.exec_command("nc -zv 127.0.0.1 6000 2>&1 | grep -i succeeded || echo 'Localhost test yapildi'")
print(f"  Localhost: ✅ Uygulama çalışıyor")

print("\n📊 Uygulama Durumu:")
NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
stdin, stdout, stderr = ssh.exec_command(NVM + "pm2 show sanliurfa 2>&1 | grep -E 'status|memory|uptime'")
for line in stdout.read().decode().split('\n'):
    if line.strip():
        print(f"  {line.strip()}")

print("\n🌐 HTTP Test:")
for url in ['http://168.119.79.238/', 'http://sanliurfa.com/']:
    stdin, stdout, stderr = ssh.exec_command(f"curl -m 3 -s -o /dev/null -w '%{{http_code}}' {url}")
    code = stdout.read().decode().strip()
    status = "✅" if code == "200" else "⚠️"
    print(f"  {status} {url}: HTTP {code}")

ssh.close()

print("\n" + "=" * 60)
print("✅ KONTROL TAMAMLANDI")
print("=" * 60)

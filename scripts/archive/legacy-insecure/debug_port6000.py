#!/usr/bin/env python3
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', allow_agent=False, look_for_keys=False)

print("🔍 Port 6000 Sorun Giderme")
print("=" * 50)

NVM_PREFIX = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '

# Loglar
print("\n📋 PM2 Logları:")
stdin, stdout, stderr = ssh.exec_command(NVM_PREFIX + "pm2 logs sanliurfa --lines 30")
print(stdout.read().decode()[-1500:])

# Port dinleme
print("\n📋 Port durumu:")
stdin, stdout, stderr = ssh.exec_command("netstat -tlnp 2>/dev/null | grep -E '6000|3000' || ss -tlnp | grep -E '6000|3000'")
print(stdout.read().decode() or "Port bilgisi alınamadı")

# 5 saniye bekle ve test et
print("\n⏳ 5 saniye bekleniyor...")
time.sleep(5)

print("\n🌐 Test:")
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:6000/")
code = stdout.read().decode()
print(f"HTTP: {code}")

ssh.close()

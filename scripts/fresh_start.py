#!/usr/bin/env python3
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD')

print("🔄 Tamamen Yeniden Başlatma")
print("=" * 60)

NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
REMOTE_PATH = "/home/sanliur/public_html"

# 1. Her şeyi durdur
print("\n🛑 Tüm PM2 process'leri durduruluyor...")
ssh.exec_command(NVM + "pm2 kill")
time.sleep(2)

# 2. Logları temizle
print("🧹 Loglar temizleniyor...")
ssh.exec_command("rm -f /home/sanliur/.pm2/logs/*")

# 3. Ecosystem ile başlat
print("\n🚀 Ecosystem ile başlatılıyor...")
cmd = f"cd {REMOTE_PATH} && " + NVM + "pm2 start ecosystem.config.cjs --update-env"
stdin, stdout, stderr = ssh.exec_command(cmd)
time.sleep(4)

# 4. Durum
print("\n📊 Durum:")
stdin, stdout, stderr = ssh.exec_command(NVM + "pm2 list")
print(stdout.read().decode())

# 5. Yeni logları kontrol et
print("\n📋 İlk Loglar:")
time.sleep(3)
stdin, stdout, stderr = ssh.exec_command("head -20 /home/sanliur/.pm2/logs/sanliurfa-out.log")
print(stdout.read().decode())

# 6. Port kontrol
print("\n📋 Port 4321:")
stdin, stdout, stderr = ssh.exec_command("netstat -tlnp 2>/dev/null | grep 4321 || ss -tlnp | grep 4321")
print(stdout.read().decode())

# 7. Test
print("\n🌐 Test:")
time.sleep(2)
stdin, stdout, stderr = ssh.exec_command("curl -m 5 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/")
code = stdout.read().decode()
print(f"HTTP: {code}")

ssh.close()

print("\n" + "=" * 60)
print("✅ İŞLEM TAMAMLANDI")
print("=" * 60)

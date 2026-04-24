#!/usr/bin/env python3
"""Port 3000 -> 4321 Güncellemesi"""

import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
OLD_PORT = 3000
NEW_PORT = 4321
APP_NAME = "sanliurfa"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, allow_agent=False, look_for_keys=False)

print(f"🔄 Port {OLD_PORT} -> {NEW_PORT} Güncelleniyor")
print("=" * 50)

NVM_PREFIX = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '

# 1. PM2 process'ini durdur
print("\n🛑 Eski process durduruluyor...")
ssh.exec_command(NVM_PREFIX + f"pm2 delete {APP_NAME} 2>/dev/null")

# 2. .env.production güncelle
print("📄 .env.production güncelleniyor...")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/.env.production")
env_content = stdout.read().decode()
env_updated = env_content.replace(f"PORT={OLD_PORT}", f"PORT={NEW_PORT}")

# Dosyayı yaz
sftp = ssh.open_sftp()
sftp.putfo(__import__('io').BytesIO(env_updated.encode()), '/home/sanliur/public_html/.env.production')
sftp.close()
print(f"  ✅ PORT={NEW_PORT} olarak güncellendi")

# 3. Yeni portta başlat
print(f"\n🚀 Port {NEW_PORT}'de başlatılıyor...")
entry_file = f"/home/sanliur/public_html/dist/server/entry.mjs"
start_cmd = NVM_PREFIX + f"pm2 start {entry_file} --name '{APP_NAME}' -- --port {NEW_PORT}"

stdin, stdout, stderr = ssh.exec_command(start_cmd)
import time
time.sleep(3)

# 4. PM2 kaydet
ssh.exec_command(NVM_PREFIX + "pm2 save")

# 5. Kontrol
print("\n📊 Durum kontrol:")
stdin, stdout, stderr = ssh.exec_command(NVM_PREFIX + "pm2 list")
print(stdout.read().decode())

# 6. Yeni portta test
print(f"\n🌐 Port {NEW_PORT} test:")
stdin, stdout, stderr = ssh.exec_command(f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{NEW_PORT}/")
code = stdout.read().decode()
if code == "200":
    print(f"✅ HTTP {code} - Port {NEW_PORT} çalışıyor!")
else:
    print(f"⚠️ HTTP {code}")

# 7. Eski portta çalışan var mı kontrol et
print(f"\n🔍 Port {OLD_PORT} kontrol:")
stdin, stdout, stderr = ssh.exec_command(f"netstat -tlnp 2>/dev/null | grep {OLD_PORT} || echo 'Port {OLD_PORT} boş'")
print(stdout.read().decode())

ssh.close()

print("\n" + "=" * 50)
print("🎉 PORT GÜNCELLEMESİ TAMAMLANDI!")
print("=" * 50)
print(f"""
📋 Yeni Ayarlar:
  Port: {NEW_PORT}
  
🔧 CWP Apache Yapılandırması:
  Port: {NEW_PORT} (Eski: {OLD_PORT})
  
🌐 Erişim:
  http://168.119.79.238:{NEW_PORT}
""")

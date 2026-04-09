#!/usr/bin/env python3
"""PM2 ile uygulama başlatma"""

import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
REMOTE_PATH = "/home/sanliur/public_html"
APP_NAME = "sanliurfa"
NODE_PORT = 3000

NVM_PREFIX = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, allow_agent=False, look_for_keys=False)

print("🚀 Uygulama Başlatılıyor")
print("=" * 50)

# Önceki process'i durdur
print("\n🛑 Eski process durduruluyor...")
stdin, stdout, stderr = ssh.exec_command(NVM_PREFIX + f"pm2 delete {APP_NAME} 2>/dev/null; echo 'OK'")
stdout.read()
time.sleep(2)

# Yeni process başlat
print("\n▶️ Yeni process başlatılıyor...")
entry_file = f"{REMOTE_PATH}/dist/server/entry.mjs"
start_cmd = NVM_PREFIX + f"pm2 start {entry_file} --name '{APP_NAME}' -- --port {NODE_PORT}"

stdin, stdout, stderr = ssh.exec_command(start_cmd)
output = stdout.read().decode()
time.sleep(3)

print(output)

# PM2 kaydet
print("\n💾 PM2 kaydediliyor...")
ssh.exec_command(NVM_PREFIX + "pm2 save")

# Kontrol
print("\n📊 Durum kontrol...")
stdin, stdout, stderr = ssh.exec_command(NVM_PREFIX + "pm2 list")
status = stdout.read().decode()
print(status[:1000])

if APP_NAME in status and "online" in status.lower():
    print("\n✅ Uygulama çalışıyor!")
    
    # HTTP test
    print("\n🌐 HTTP test...")
    stdin, stdout, stderr = ssh.exec_command(f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{NODE_PORT}/")
    code = stdout.read().decode().strip()
    if code == "200":
        print(f"✅ HTTP {code} - Site erişilebilir!")
    else:
        print(f"⚠️ HTTP {code}")
else:
    print("\n⚠️ Process durumu kontrol edilmeli")
    stdin, stdout, stderr = ssh.exec_command(NVM_PREFIX + f"pm2 logs {APP_NAME} --lines 20")
    print(stdout.read().decode())

# İzinleri ayarla
print("\n🔒 İzinler ayarlanıyor...")
ssh.exec_command(f"chmod -R 755 {REMOTE_PATH}")

ssh.close()

print("\n" + "=" * 50)
print("🎉 BAŞLATMA TAMAMLANDI!")
print("=" * 50)
print(f"""
🌐 Site: http://168.119.79.238 (CWP Apache yönlendirmesi gerekli)
🔧 Port: {NODE_PORT}

Yönetim:
  source ~/.nvm/nvm.sh && pm2 list
  source ~/.nvm/nvm.sh && pm2 logs {APP_NAME}
  source ~/.nvm/nvm.sh && pm2 restart {APP_NAME}

📋 CWP Apache Yapılandırması:
  https://168.119.79.238:2083
  Webserver Settings → Webserver Domain Conf
  Apache → Proxy → Custom Port (3000)
""")

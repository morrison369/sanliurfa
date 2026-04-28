#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD')

print("🔄 PM2 Environment Variables ile Yeniden Başlatma")
print("=" * 50)

NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
REMOTE_PATH = "/home/sanliur/public_html"

# 1. Ecosystem dosyası oluştur (environment variable'ları tanımlamak için)
print("📄 ecosystem.config.cjs oluşturuluyor...")

ecosystem = """module.exports = {
  apps: [{
    name: 'sanliurfa',
    script: './dist/server/entry.mjs',
    cwd: '/home/sanliur/public_html',
    env: {
      NODE_ENV: 'production',
      PORT:$24321,
      DATABASE_URL: 'postgresql://sanliurfa_user:CHANGE_ME_DB_PASSWORD@localhost:5432/sanliurfa'
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    log_file: '/home/sanliur/.pm2/logs/sanliurfa.log',
    out_file: '/home/sanliur/.pm2/logs/sanliurfa-out.log',
    error_file: '/home/sanliur/.pm2/logs/sanliurfa-error.log'
  }]
};
"""

sftp = ssh.open_sftp()
sftp.putfo(__import__('io').BytesIO(ecosystem.encode()), f'{REMOTE_PATH}/ecosystem.config.cjs')
sftp.close()
print("✅ ecosystem.config.cjs oluşturuldu")

# 2. PM2 durdur ve sil
print("\n🛑 Eski process durduruluyor...")
ssh.exec_command(NVM + "pm2 delete sanliurfa 2>/dev/null; echo 'OK'")

# 3. Yeni ecosystem ile başlat
print("\n🚀 Ecosystem ile başlatılıyor...")
stdin, stdout, stderr = ssh.exec_command(f"cd {REMOTE_PATH} && " + NVM + "pm2 start ecosystem.config.cjs")
import time
time.sleep(3)

# 4. PM2 kaydet
ssh.exec_command(NVM + "pm2 save")

# 5. Kontrol
print("\n📊 Durum:")
stdin, stdout, stderr = ssh.exec_command(NVM + "pm2 list")
print(stdout.read().decode())

# 6. Port 4321 test
print("\n🌐 Port 4321 test (5 saniye bekleyin)...")
time.sleep(5)
stdin, stdout, stderr = ssh.exec_command("curl -m 5 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/")
code = stdout.read().decode()
if code == "200":
    print(f"✅ HTTP {code} - Port 4321 çalışıyor!")
else:
    print(f"⚠️ HTTP {code}")
    print("\n📋 Loglar:")
    stdin, stdout, stderr = ssh.exec_command("tail -20 /home/sanliur/.pm2/logs/sanliurfa-out.log")
    print(stdout.read().decode())

ssh.close()

print("\n" + "=" * 50)
print("🎉 TAMAMLANDI!")
print("=" * 50)

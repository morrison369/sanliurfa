#!/usr/bin/env python3
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', allow_agent=False, look_for_keys=False)

print("📤 Eksik Dosyaları Yükleme")
print("=" * 50)

sftp = ssh.open_sftp()

# Eksik dosyalar
files = ['tailwind.config.js', 'postcss.config.js', 'tsconfig.json']

for f in files:
    try:
        sftp.put(f"./{f}", f"/home/sanliur/public_html/{f}")
        print(f"✅ {f} yüklendi")
    except Exception as e:
        print(f"⚠️ {f}: {e}")

# node_modules temizle
print("\n📦 node_modules temizleniyor...")
ssh.exec_command("rm -rf /home/sanliur/public_html/node_modules")

# npm install
print("📦 npm install yeniden (5-7 dakika)...")
cmd = 'cd /home/sanliur/public_html && export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && npm install --legacy-peer-deps'
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=300)

start = time.time()
while not stdout.channel.exit_status_ready():
    elapsed = time.time() - start
    if elapsed > 30 and elapsed % 30 < 1:
        print(f"  ⏳ {int(elapsed)} saniye...")
    time.sleep(1)

result = stdout.read().decode()
if "added" in result:
    lines = result.split('\n')
    for line in lines[-5:]:
        if line.strip():
            print(f"  {line}")
    print("✅ npm install tamamlandı!")
else:
    print("⚠️ Durum:", result[-500:])

sftp.close()
ssh.close()
print("\nTamamlandı!")

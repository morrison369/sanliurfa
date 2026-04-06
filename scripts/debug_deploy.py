#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', allow_agent=False, look_for_keys=False)

print("🔍 Hata Ayıklama")
print("=" * 50)

# node_modules kontrol
print("\n📂 Dosya kontrol...")
stdin, stdout, stderr = ssh.exec_command("ls -la /home/sanliur/public_html/")
print("Dosyalar:", stdout.read().decode()[:1000])

# npm install tekrar
print("\n📦 npm install tekrar...")
cmd = 'cd /home/sanliur/public_html && export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && npm ci --legacy-peer-deps 2>&1'
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=180)

import time
start = time.time()
while not stdout.channel.exit_status_ready():
    if time.time() - start > 15:
        print("  ⏳ Kurulum devam ediyor...")
        start = time.time()
    time.sleep(1)

output = stdout.read().decode()
error = stderr.read().decode()

print("\n📤 Çıktı (son 2000 karakter):")
print(output[-2000:])

if error:
    print("\n⚠️ Hata (son 500 karakter):")
    print(error[-500:])

# Astro kontrol
print("\n🔍 Astro kontrol...")
stdin, stdout, stderr = ssh.exec_command("ls -la /home/sanliur/public_html/node_modules/.bin/astro")
result = stdout.read().decode()
if result:
    print("✅ Astro bulundu:", result.strip())
else:
    print("❌ Astro bulunamadı!")

ssh.close()
print("\nTamamlandı!")

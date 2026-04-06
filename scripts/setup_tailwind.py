#!/usr/bin/env python3
"""Astro 6 + Tailwind kurulumu"""

import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', allow_agent=False, look_for_keys=False)

print("🎨 Tailwind için Astro 6 Kurulumu")
print("=" * 50)

# package.json güncelle
print("\n📦 @astrojs/tailwind ekleniyor...")
cmd = '''cd /home/sanliur/public_html && export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && npm install @astrojs/tailwind tailwindcss autoprefixer postcss --legacy-peer-deps'''

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

if "added" in output:
    lines = [l for l in output.split('\n') if 'added' in l or 'packages' in l]
    for line in lines[-3:]:
        print(f"  {line}")
    print("✅ Tailwind paketleri kuruldu!")
else:
    print("⚠️ Durum:", output[-500:])
    if error:
        print("Hata:", error[:300])

# astro.config.mjs kontrol
print("\n📄 astro.config.mjs kontrol...")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/astro.config.mjs")
config = stdout.read().decode()

if "@astrojs/tailwind" in config:
    print("✅ Tailwind import edilmiş")
else:
    print("⚠️ Tailwind import edilmemiş - manuel kontrol gerekli")

ssh.close()
print("\nTamamlandı!")

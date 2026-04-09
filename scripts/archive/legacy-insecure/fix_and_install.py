#!/usr/bin/env python3
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', allow_agent=False, look_for_keys=False)

print("🔧 Sorun Çözümü")
print("=" * 50)

# package-lock.json sil
print("\n📦 package-lock.json siliniyor...")
ssh.exec_command("rm -f /home/sanliur/public_html/package-lock.json")

# npm install
print("📦 npm install yapılıyor (3-5 dakika)...")
cmd = 'cd /home/sanliur/public_html && export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && npm install --legacy-peer-deps 2>&1'
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=300)

start = time.time()
while not stdout.channel.exit_status_ready():
    elapsed = time.time() - start
    if elapsed > 30 and elapsed % 30 < 1:
        print(f"  ⏳ {int(elapsed)} saniye geçti, devam ediyor...")
    time.sleep(1)

output = stdout.read().decode()
error = stderr.read().decode()

# Sonuçları göster
lines = output.split('\n')
added_lines = [l for l in lines if 'added' in l or 'packages' in l or 'audited' in l]
if added_lines:
    print("\n📊 Sonuç:")
    for line in added_lines[-5:]:
        print(f"  {line}")
else:
    print("\n📤 Son 500 karakter:")
    print(output[-500:])

if error and "warn" not in error.lower():
    print("\n⚠️ Hatalar:")
    print(error[-500:])

# Astro kontrol
print("\n🔍 Astro kontrol...")
stdin, stdout, stderr = ssh.exec_command("ls -la /home/sanliur/public_html/node_modules/.bin/astro")
result = stdout.read().decode()
if result:
    print("✅ Astro bulundu!")
    print(result[:200])
else:
    print("❌ Astro bulunamadı")

ssh.close()
print("\nTamamlandı!")

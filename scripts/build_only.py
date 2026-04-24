#!/usr/bin/env python3
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', allow_agent=False, look_for_keys=False)

print("🔨 Build İşlemi")
print("=" * 50)

# Build
print("\n🔨 npm run build başlatılıyor (2-3 dakika)...")
cmd = 'cd /home/sanliur/public_html && export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && npm run build 2>&1'
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=300)

start = time.time()
while not stdout.channel.exit_status_ready():
    elapsed = time.time() - start
    if elapsed > 30 and elapsed % 30 < 1:
        print(f"  ⏳ {int(elapsed)} saniye geçti...")
    time.sleep(1)

output = stdout.read().decode()
error = stderr.read().decode()

# Önemli satırları göster
print("\n📊 Build çıktısı:")
lines = output.split('\n')
for line in lines[-30:]:
    if line.strip():
        print(f"  {line}")

if error:
    print("\n⚠️ Hata/UYarı:")
    err_lines = error.split('\n')
    for line in err_lines[-10:]:
        if line.strip():
            print(f"  {line}")

# dist kontrol
print("\n📂 dist dizini kontrol...")
stdin, stdout, stderr = ssh.exec_command("ls -la /home/sanliur/public_html/dist/")
result = stdout.read().decode()
if result:
    print("✅ dist dizini oluştu!")
    print(result[:600])
    
    # Boyut
    stdin, stdout, stderr = ssh.exec_command("du -sh /home/sanliur/public_html/dist/ && find /home/sanliur/public_html/dist/ -type f | wc -l")
    print("\n📦 Boyut ve dosya sayısı:")
    print(stdout.read().decode())
else:
    print("❌ dist dizini bulunamadı!")

ssh.close()
print("\nTamamlandı!")

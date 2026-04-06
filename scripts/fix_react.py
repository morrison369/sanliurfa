#!/usr/bin/env python3
"""React Component Hatası Düzeltme"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

print("⚛️ React Component Hatası Düzeltme")
print("=" * 60)

# 1. node_modules kontrolü
print("\n1️⃣ node_modules kontrolü...")
stdin, stdout, stderr = ssh.exec_command("ls /home/sanliur/public_html/node_modules/@astrojs/ 2>/dev/null")
print("   AstroJS modülleri:", stdout.read().decode().strip() or "Yok")

# 2. React integration kurulu mu?
print("\n2️⃣ React integration kontrolü...")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/package.json | grep -A5 '@astrojs/react'")
react_pkg = stdout.read().decode().strip()
if react_pkg:
    print("   ✅ @astrojs/react paketi mevcut")
else:
    print("   ⚠️ @astrojs/react bulunamadı")

# 3. astro.config kontrol
print("\n3️⃣ astro.config.mjs kontrolü...")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/astro.config.mjs | head -20")
config = stdout.read().decode()
if "react" in config.lower():
    print("   ✅ React integration config'de mevcut")
else:
    print("   ⚠️ React integration config'de yok!")
    print("   📝 Config içeriği:")
    print(config[:500])

# 4. Lucide icons kontrol
print("\n4️⃣ Lucide React kontrolü...")
stdin, stdout, stderr = ssh.exec_command("ls /home/sanliur/public_html/node_modules/lucide-react 2>/dev/null | head -5")
lucide = stdout.read().decode().strip()
if lucide:
    print("   ✅ lucide-react kurulu")
else:
    print("   ⚠️ lucide-react bulunamadı!")

# 5. Hatalı component dosyasını bul
print("\n5️⃣ ChevronDown kullanımı araştırılıyor...")
stdin, stdout, stderr = ssh.exec_command("grep -r 'ChevronDown' /home/sanliur/public_html/src/ --include='*.tsx' --include='*.astro' -l 2>/dev/null | head -5")
chevron_files = stdout.read().decode().strip()
if chevron_files:
    print("   📁 Dosyalar:")
    for f in chevron_files.split('\n'):
        print(f"      - {f}")
else:
    print("   ℹ️ ChevronDown kullanımı bulunamadı (build dosyalarında)")

# 6. Yeniden build önerisi
print("\n6️⃣ Çözüm önerisi:")
print("   Node_modules eksik veya bozuk olabilir.")
print("   Temiz yeniden kurulum önerilir.")

# 7. Hızlı çözüm: node_modules temizle ve yeniden kur
print("\n7️⃣ Hızlı çözüm deneniyor...")
REMOTE_PATH = "/home/sanliur/public_html"
NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '

clean_install = f"""
cd {REMOTE_PATH} && 
rm -rf node_modules package-lock.json && 
"""

print("   📦 node_modules temizleniyor...")
ssh.exec_command(f"rm -rf {REMOTE_PATH}/node_modules {REMOTE_PATH}/package-lock.json")

print("   📦 npm install başlıyor (5-10 dakika)...")
stdin, stdout, stderr = ssh.exec_command(
    f"cd {REMOTE_PATH} && " + NVM + "npm install --legacy-peer-deps 2>&1",
    timeout=600
)

import time
start = time.time()
while not stdout.channel.exit_status_ready():
    if time.time() - start > 30:
        print("      ⏳ Kurulum devam ediyor...")
        start = time.time()
    time.sleep(1)

result = stdout.read().decode()
if "added" in result:
    lines = [l for l in result.split('\n') if 'added' in l or 'packages' in l]
    for line in lines[-3:]:
        print(f"      {line}")
    print("   ✅ npm install tamamlandı")
else:
    print(f"   ⚠️ Durum: {result[-500:]}")

# 8. Rebuild
print("\n8️⃣ Rebuild yapılıyor...")
stdin, stdout, stderr = ssh.exec_command(
    f"cd {REMOTE_PATH} && " + NVM + "npm run build 2>&1",
    timeout=180
)

start = time.time()
while not stdout.channel.exit_status_ready():
    if time.time() - start > 20:
        print("      ⏳ Build devam ediyor...")
        start = time.time()
    time.sleep(1)

build_result = stdout.read().decode()
if "dist/server" in build_result:
    print("   ✅ Build başarılı")
else:
    print(f"   ⚠️ Build durumu: {build_result[-800:]}")

# 9. Restart
print("\n9️⃣ Uygulama yeniden başlatılıyor...")
ssh.exec_command(NVM + "pm2 restart sanliurfa")
time.sleep(3)

# 10. Test
print("\n🔟 HTTP Test...")
time.sleep(2)
stdin, stdout, stderr = ssh.exec_command("curl -m 3 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:6000/")
code = stdout.read().decode().strip()
if code == "200":
    print(f"   ✅ HTTP 200 - Site çalışıyor!")
else:
    print(f"   ⚠️ HTTP {code}")

ssh.close()

print("\n" + "=" * 60)
print("🔧 TAMAMLANDI")
print("=" * 60)

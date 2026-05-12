#!/usr/bin/env python3
"""
CWP + Apache + Node.js 22.12.0 Deployment Script
Sunucu: 168.119.79.238 (AlmaLinux 8.10)
"""

import paramiko
import sys
import os
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
REMOTE_PATH = "/home/sanliur/public_html"
APP_NAME = "sanliurfa"
NODE_PORT = 4321

# NVM ile Node 22 kullanımı
NVM_PREFIX = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '

def connect():
    print(f"🔌 {HOST}:{PORT} bağlanılıyor...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD,
                allow_agent=False, look_for_keys=False)
    print("✅ Bağlantı başarılı!")
    return ssh

def run_cmd(ssh, cmd, timeout=60):
    """Komut çalıştır"""
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    return exit_code == 0, stdout.read().decode(), stderr.read().decode()

def main():
    print("🚀 Node.js 22.12.0 Production Deployment")
    print("=" * 60)
    
    ssh = connect()
    sftp = ssh.open_sftp()
    
    # Node 22 kontrolü
    print("\n📋 Node.js Kontrolü")
    print("-" * 40)
    success, output, _ = run_cmd(ssh, NVM_PREFIX + "node -v && npm -v")
    if success and "v22" in output:
        print(f"✅ Node.js 22 aktif:\n{output}")
    else:
        print("❌ Node.js 22 bulunamadı! Önce install_node22.py çalıştırın.")
        ssh.close()
        sys.exit(1)
    
    # PM2 kontrolü
    print("\n⚡ PM2 Kontrolü")
    print("-" * 40)
    success, _, _ = run_cmd(ssh, "which pm2")
    if not success:
        print("⬇️ PM2 kuruluyor...")
        run_cmd(ssh, NVM_PREFIX + "npm install -g pm2", timeout=120)
        print("✅ PM2 kuruldu")
    else:
        print("✅ PM2 zaten kurulu")
    
    # Kaynak kodları yükle
    print("\n📤 Kaynak Kodları Yükleniyor")
    print("-" * 40)
    
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Yedek al
    print("📂 Yedek alınıyor...")
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    run_cmd(ssh, f"cd {REMOTE_PATH} && tar -czf backup_{timestamp}.tar.gz . --exclude='backup_*.tar.gz' 2>/dev/null; echo 'OK'")
    
    # Eski dosyaları temizle
    print("🧹 Eski dosyalar temizleniyor...")
    run_cmd(ssh, f"cd {REMOTE_PATH} && find . -mindepth 1 -not -name 'backup_*.tar.gz' -delete 2>/dev/null; rm -rf * 2>/dev/null; echo 'OK'")
    
    # Önemli dosyaları yükle
    files_to_upload = [
        "package.json", "package-lock.json", "astro.config.mjs",
        "tailwind.config.mjs", "tsconfig.json", ".env.production"
    ]
    
    # src ve public dizinlerini de yükle
    dirs_to_upload = ["src", "public"]
    
    total_items = len(files_to_upload) + len(dirs_to_upload)
    current = 0
    
    for item in files_to_upload + dirs_to_upload:
        current += 1
        local_path = os.path.join(project_dir, item)
        remote_path = f"{REMOTE_PATH}/{item}".replace("\\", "/")
        
        if not os.path.exists(local_path):
            print(f"  ⚠️ {item} bulunamadı, atlanıyor")
            continue
        
        if os.path.isdir(local_path):
            # Dizin yükleme (recursive)
            print(f"  📁 {item} dizini yükleniyor...")
            run_cmd(ssh, f"mkdir -p {remote_path}")
            for root, dirs, files in os.walk(local_path):
                for dir in dirs:
                    dir_path = os.path.join(root, dir)
                    rel_path = os.path.relpath(dir_path, local_path)
                    remote_dir = f"{remote_path}/{rel_path}".replace("\\", "/")
                    run_cmd(ssh, f"mkdir -p {remote_dir}")
                for file in files:
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, local_path)
                    remote_file = f"{remote_path}/{rel_path}".replace("\\", "/")
                    sftp.put(file_path, remote_file)
        else:
            # Dosya yükleme
            print(f"  📄 {item} yükleniyor...")
            sftp.put(local_path, remote_path)
    
    print("✅ Dosyalar yüklendi!")
    
    # npm install
    print("\n📦 npm install (sunucuda)...")
    print("-" * 40)
    success, output, error = run_cmd(ssh, f"cd {REMOTE_PATH} && " + NVM_PREFIX + "npm ci --legacy-peer-deps", timeout=300)
    if "added" in output or "packages" in output:
        print("✅ Bağımlılıklar kuruldu")
    else:
        print(f"⚠️ Uyarı: {output[-500:]}")
    
    # Build (sunucuda)
    print("\n🔨 Build (sunucuda Node 22 ile)...")
    print("-" * 40)
    success, output, error = run_cmd(ssh, f"cd {REMOTE_PATH} && " + NVM_PREFIX + "npm run build", timeout=300)
    
    if success and ("dist" in output or os.path.exists(f"{REMOTE_PATH}/dist")):
        print("✅ Build başarılı!")
        # Build boyutu
        success, size_output, _ = run_cmd(ssh, f"cd {REMOTE_PATH}/dist && find . -type f | wc -l && du -sh .")
        print(f"📦 Build: {size_output}")
    else:
        print(f"❌ Build hatası:\n{error[-1000:]}")
        print(f"Çıktı:\n{output[-1000:]}")
        ssh.close()
        sys.exit(1)
    
    # Uygulamayı başlat
    print("\n🚀 Uygulama Başlatılıyor")
    print("-" * 40)
    
    # Önceki process'i durdur
    run_cmd(ssh, NVM_PREFIX + f"pm2 delete {APP_NAME} 2>/dev/null; echo 'OK'")
    time.sleep(2)
    
    # Yeni process başlat
    entry_file = f"{REMOTE_PATH}/dist/server/entry.mjs"
    start_cmd = f"cd {REMOTE_PATH} && " + NVM_PREFIX + f"pm2 start {entry_file} --name '{APP_NAME}' -- --port {NODE_PORT}"
    
    success, output, error = run_cmd(ssh, start_cmd)
    time.sleep(3)
    
    # PM2 kaydet
    run_cmd(ssh, NVM_PREFIX + "pm2 save")
    
    # Kontrol
    success, status, _ = run_cmd(ssh, NVM_PREFIX + "pm2 list")
    if APP_NAME in status and "online" in status.lower():
        print(f"✅ Uygulama çalışıyor!")
        print(f"📊 {status[:500]}")
    else:
        print(f"⚠️ Durum kontrol edilmeli:\n{status}")
    
    # Test
    print("\n🌐 Test")
    print("-" * 40)
    success, response, _ = run_cmd(ssh, f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{NODE_PORT}/")
    if response == "200":
        print(f"✅ HTTP 200 - Uygulama yanıt veriyor!")
    else:
        print(f"⚠️ HTTP {response}")
    
    # CWP Talimatları
    print("\n" + "=" * 60)
    print("🌐 CWP Apache Yapılandırması")
    print("=" * 60)
    print("""
📋 CWP Panel'de şu adımları takip et:

1. https://168.119.79.238:2083 (Kullanıcı: sanliur)

2. Webserver Settings → Webserver Domain Conf

3. Ayarlar:
   • Username: sanliur
   • Domain: senin-domainin.com
   • Configuration: Apache → Proxy → Custom Port
   • Port: 3000
   • IP: 127.0.0.1
   • ✅ Rebuild webserver conf for domain on save

4. Save + Apache Restart

📝 Veya .htaccess ile:

RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:4321/$1 [P,L]
    """)
    
    # İzinleri ayarla
    print("🔒 Dosya izinleri ayarlanıyor...")
    run_cmd(ssh, f"chmod -R 755 {REMOTE_PATH}")
    
    ssh.close()
    sftp.close()
    
    print("\n" + "=" * 60)
    print("🎉 DEPLOYMENT TAMAMLANDI!")
    print("=" * 60)
    print(f"""
🌐 Site: http://168.119.79.238
🔧 CWP: https://168.119.79.238:2083

Yönetim:
  source ~/.nvm/nvm.sh && pm2 list
  source ~/.nvm/nvm.sh && pm2 logs {APP_NAME}
  source ~/.nvm/nvm.sh && pm2 restart {APP_NAME}
""")

if __name__ == "__main__":
    main()

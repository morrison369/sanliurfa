#!/usr/bin/env python3
"""
Şanlıurfa.com Hızlı Deployment (Sadece Build)
Sunucu: 168.119.79.238
Dizin: /home/sanliur/public_html
"""

import paramiko
import sys
import time
import os
import tarfile

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
REMOTE_PATH = "/home/sanliur/public_html"
APP_NAME = "sanliurfa"
NODE_PORT = 4321

NVM_PREFIX = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '

def connect():
    print(f"🔌 {HOST}:{PORT} bağlanılıyor...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD,
                allow_agent=False, look_for_keys=False, timeout=30)
    print("✅ Bağlantı başarılı!")
    return ssh

def run_cmd(ssh, cmd, timeout=180):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    return exit_code == 0, stdout.read().decode(), stderr.read().decode()

def main():
    print("🚀 Şanlıurfa.com Fast Deployment")
    print("=" * 60)
    
    ssh = connect()
    
    # Node 22 kontrolü
    print("\n📋 Node.js Kontrolü")
    success, output, _ = run_cmd(ssh, NVM_PREFIX + "node -v")
    if success and "v22" in output:
        print(f"✅ Node.js: {output.strip()}")
    else:
        print("❌ Node.js 22 bulunamadı!")
        ssh.close()
        sys.exit(1)
    
    # Uygulamayı durdur
    print("\n🛑 Uygulama durduruluyor...")
    run_cmd(ssh, NVM_PREFIX + f"pm2 stop {APP_NAME} 2>/dev/null; echo 'OK'")
    
    # src ve package.json dosyalarını tek tek yükle (hızlı)
    print("\n📤 Kaynak dosyalar yükleniyor...")
    sftp = ssh.open_sftp()
    
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Önce config dosyalarını yükle
    config_files = ["package.json", "package-lock.json", "astro.config.mjs", 
                    "tailwind.config.js", "postcss.config.js"]
    for cfg in config_files:
        local = os.path.join(project_dir, cfg)
        if os.path.exists(local):
            print(f"  📄 {cfg}")
            sftp.put(local, f"{REMOTE_PATH}/{cfg}")
    
    # src dizinini tar.gz olarak sıkıştır ve yükle
    print("\n📦 src dizini sıkıştırılıyor...")
    src_tar = os.path.join(project_dir, "src.tar.gz")
    with tarfile.open(src_tar, "w:gz") as tar:
        tar.add(os.path.join(project_dir, "src"), arcname="src")
    
    print("  📤 src.tar.gz yükleniyor...")
    sftp.put(src_tar, f"{REMOTE_PATH}/src.tar.gz")
    os.remove(src_tar)
    
    # Sunucuda aç
    print("  📂 Sunucuda açılıyor...")
    run_cmd(ssh, f"cd {REMOTE_PATH} && rm -rf src && tar -xzf src.tar.gz && rm src.tar.gz")
    
    sftp.close()
    
    # npm install (clean)
    print("\n📦 npm install (4 dk)...")
    run_cmd(ssh, f"cd {REMOTE_PATH} && rm -rf node_modules package-lock.json", timeout=60)
    success, _, error = run_cmd(ssh, f"cd {REMOTE_PATH} && " + NVM_PREFIX + "npm install --legacy-peer-deps", timeout=250)
    if success:
        print("✅ Bağımlılıklar tamam")
    else:
        print(f"⚠️ npm: {error[:300]}")
    
    # Build (4 dk)
    print("\n🔨 Build (4 dk)...")
    success, output, error = run_cmd(ssh, f"cd {REMOTE_PATH} && " + NVM_PREFIX + "npm run build", timeout=250)
    
    if success:
        print("✅ Build başarılı!")
    else:
        print(f"❌ Build hatası:\n{error[-1000:]}")
        ssh.close()
        sys.exit(1)
    
    # Uygulamayı başlat
    print("\n🚀 Uygulama başlatılıyor...")
    run_cmd(ssh, NVM_PREFIX + f"pm2 delete {APP_NAME} 2>/dev/null")
    time.sleep(1)
    
    entry_file = f"{REMOTE_PATH}/dist/server/entry.mjs"
    run_cmd(ssh, f"cd {REMOTE_PATH} && " + NVM_PREFIX + f"pm2 start {entry_file} --name '{APP_NAME}' -- --port {NODE_PORT}")
    time.sleep(2)
    run_cmd(ssh, NVM_PREFIX + "pm2 save")
    
    # Kontrol
    success, status, _ = run_cmd(ssh, NVM_PREFIX + "pm2 list")
    if APP_NAME in status:
        print("✅ Uygulama çalışıyor!")
    
    # HTTP test
    success, response, _ = run_cmd(ssh, f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{NODE_PORT}/api/health")
    if response == "200":
        print("✅ Health check: HTTP 200")
    else:
        print(f"⚠️ Health check: HTTP {response}")
    
    ssh.close()
    
    print("\n" + "=" * 60)
    print("🎉 DEPLOYMENT TAMAMLANDI!")
    print("=" * 60)
    print(f"🔗 https://sanliurfa.com")

if __name__ == "__main__":
    main()

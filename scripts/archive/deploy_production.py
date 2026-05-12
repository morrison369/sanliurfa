#!/usr/bin/env python3
"""
Şanlıurfa.com PostgreSQL Production Deployment
Sunucu: 168.119.79.238 (AlmaLinux 8.10)
Node.js: 22.12.0 via NVM
"""

import paramiko
import sys
import time
import os

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
REMOTE_PATH = "/home/sanliur/sanliurfa.com"
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

def run_cmd(ssh, cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    return exit_code == 0, stdout.read().decode(), stderr.read().decode()

def main():
    print("🚀 Şanlıurfa.com PostgreSQL Deployment")
    print("=" * 60)
    
    ssh = connect()
    
    # Node 22 kontrolü
    print("\n📋 Node.js Kontrolü")
    print("-" * 40)
    success, output, _ = run_cmd(ssh, NVM_PREFIX + "node -v && npm -v")
    if success and "v22" in output:
        print(f"✅ Node.js 22 aktif:\n{output}")
    else:
        print("❌ Node.js 22 bulunamadı!")
        ssh.close()
        sys.exit(1)
    
    # PM2 kontrolü
    print("\n⚡ PM2 Kontrolü")
    print("-" * 40)
    success, _, _ = run_cmd(ssh, NVM_PREFIX + "which pm2")
    if not success:
        print("⬇️ PM2 kuruluyor...")
        run_cmd(ssh, NVM_PREFIX + "npm install -g pm2", timeout=120)
        print("✅ PM2 kuruldu")
    else:
        print("✅ PM2 zaten kurulu")
    
    # Önce mevcut uygulamayı durdur
    print("\n🛑 Mevcut uygulama durduruluyor...")
    run_cmd(ssh, NVM_PREFIX + f"pm2 stop {APP_NAME} 2>/dev/null; echo 'OK'")
    
    # Yedek al
    print("\n💾 Yedek alınıyor...")
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    run_cmd(ssh, f"cd {REMOTE_PATH} && tar -czf backup_{timestamp}.tar.gz . --exclude='backup_*.tar.gz' --exclude='node_modules' --exclude='dist' 2>/dev/null; echo 'OK'")
    
    # Git pull
    print("\n📥 Git pull yapılıyor...")
    success, output, error = run_cmd(ssh, f"cd {REMOTE_PATH} && git pull origin main 2>&1")
    if success:
        print(f"✅ Git pull tamamlandı")
        if "Already up to date" not in output:
            print(f"Değişiklikler:\n{output[:500]}")
    else:
        print(f"⚠️ Git hatası: {error}")
    
    # npm install
    print("\n📦 npm install...")
    print("-" * 40)
    success, output, error = run_cmd(ssh, f"cd {REMOTE_PATH} && " + NVM_PREFIX + "npm ci", timeout=300)
    if success:
        print("✅ Bağımlılıklar kuruldu")
    else:
        print(f"❌ npm hatası: {error[-500:]}")
        ssh.close()
        sys.exit(1)
    
    # Build
    print("\n🔨 Build...")
    print("-" * 40)
    success, output, error = run_cmd(ssh, f"cd {REMOTE_PATH} && " + NVM_PREFIX + "npm run build", timeout=300)
    
    if success:
        print("✅ Build başarılı!")
        success, size_output, _ = run_cmd(ssh, f"cd {REMOTE_PATH}/dist && du -sh . && find . -type f | wc -l")
        print(f"📦 Build boyutu: {size_output}")
    else:
        print(f"❌ Build hatası:\n{error[-1000:]}")
        print(f"Çıktı:\n{output[-1000:]}")
        ssh.close()
        sys.exit(1)
    
    # Uygulamayı başlat
    print("\n🚀 Uygulama başlatılıyor...")
    print("-" * 40)
    
    # Önceki process'i sil
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
    else:
        print(f"⚠️ Durum:\n{status}")
    
    # HTTP test
    print("\n🌐 HTTP Test")
    print("-" * 40)
    success, response, _ = run_cmd(ssh, f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{NODE_PORT}/api/health")
    if response == "200":
        print(f"✅ HTTP 200 - API yanıt veriyor!")
    else:
        print(f"⚠️ HTTP {response} - Loglar kontrol edilmeli")
        # Logları göster
        _, logs, _ = run_cmd(ssh, NVM_PREFIX + f"pm2 logs {APP_NAME} --lines 20")
        print(f"Son loglar:\n{logs}")
    
    # İzinleri ayarla
    run_cmd(ssh, f"chmod -R 755 {REMOTE_PATH}")
    
    ssh.close()
    
    print("\n" + "=" * 60)
    print("🎉 DEPLOYMENT TAMAMLANDI!")
    print("=" * 60)
    print(f"""
🔗 Site: https://sanliurfa.com
🔧 PM2: source ~/.nvm/nvm.sh && pm2 list
📊 Logs: source ~/.nvm/nvm.sh && pm2 logs {APP_NAME}
🔄 Restart: source ~/.nvm/nvm.sh && pm2 restart {APP_NAME}
""")

if __name__ == "__main__":
    main()

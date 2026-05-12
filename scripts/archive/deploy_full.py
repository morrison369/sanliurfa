#!/usr/bin/env python3
"""
Şanlıurfa.com Full Deployment (SFTP + Build)
Sunucu: 168.119.79.238 (AlmaLinux 8.10)
Dizin: /home/sanliur/public_html
"""

import paramiko
import sys
import time
import os

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

def upload_directory(sftp, local_dir, remote_dir):
    """Recursive directory upload"""
    try:
        sftp.mkdir(remote_dir)
    except:
        pass
    
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}".replace("\\", "/")
        
        if os.path.isdir(local_path):
            if item in ['node_modules', 'dist', '.git', '.astro']:
                continue
            upload_directory(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)

def main():
    print("🚀 Şanlıurfa.com Full Deployment")
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
    else:
        print("✅ PM2 kurulu")
    
    # Uygulamayı durdur
    print("\n🛑 Uygulama durduruluyor...")
    run_cmd(ssh, NVM_PREFIX + f"pm2 stop {APP_NAME} 2>/dev/null; echo 'OK'")
    
    # Yedek al
    print("\n💾 Yedek alınıyor...")
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    backup_dir = f"/home/sanliur/backup_{timestamp}"
    run_cmd(ssh, f"mkdir -p {backup_dir} && cp -r {REMOTE_PATH}/* {backup_dir}/ 2>/dev/null; echo 'OK'")
    print(f"✅ Yedek: {backup_dir}")
    
    # Dosyaları yükle
    print("\n📤 Dosyalar yükleniyor...")
    print("-" * 40)
    
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Önce src ve config dosyalarını yükle
    items_to_upload = [
        "src", "public", "package.json", "package-lock.json",
        "astro.config.mjs", "tailwind.config.js", "tsconfig.json",
        "postcss.config.js", ".nvmrc"
    ]
    
    for item in items_to_upload:
        local_path = os.path.join(project_dir, item)
        remote_path = f"{REMOTE_PATH}/{item}".replace("\\", "/")
        
        if not os.path.exists(local_path):
            print(f"  ⚠️ {item} bulunamadı, atlanıyor")
            continue
        
        if os.path.isdir(local_path):
            print(f"  📁 {item} yükleniyor...")
            upload_directory(sftp, local_path, remote_path)
        else:
            print(f"  📄 {item} yükleniyor...")
            sftp.put(local_path, remote_path)
    
    print("✅ Dosyalar yüklendi!")
    
    # .env.production kontrolü
    print("\n⚙️ Environment kontrolü...")
    try:
        sftp.stat(f"{REMOTE_PATH}/.env.production")
        print("✅ .env.production mevcut")
    except:
        print("⚠️ .env.production bulunamadı, template yükleniyor...")
        sftp.put(os.path.join(project_dir, ".env.production.template"), 
                 f"{REMOTE_PATH}/.env.production")
        print("📝 .env.production template yüklendi - ŞİFRELERİ GÜNCELLE!")
    
    sftp.close()
    
    # npm install
    print("\n📦 npm install...")
    print("-" * 40)
    success, output, error = run_cmd(ssh, f"cd {REMOTE_PATH} && " + NVM_PREFIX + "npm ci", timeout=300)
    if success:
        print("✅ Bağımlılıklar kuruldu")
    else:
        print(f"⚠️ npm uyarı: {error[-300:]}")
    
    # Build
    print("\n🔨 Build...")
    print("-" * 40)
    success, output, error = run_cmd(ssh, f"cd {REMOTE_PATH} && " + NVM_PREFIX + "npm run build", timeout=300)
    
    if success:
        print("✅ Build başarılı!")
        success, size_output, _ = run_cmd(ssh, f"cd {REMOTE_PATH}/dist && du -sh .")
        print(f"📦 Build boyutu: {size_output.strip()}")
    else:
        print(f"❌ Build hatası:\n{error[-1000:]}")
        ssh.close()
        sys.exit(1)
    
    # Uygulamayı başlat
    print("\n🚀 Uygulama başlatılıyor...")
    print("-" * 40)
    
    run_cmd(ssh, NVM_PREFIX + f"pm2 delete {APP_NAME} 2>/dev/null; echo 'OK'")
    time.sleep(2)
    
    entry_file = f"{REMOTE_PATH}/dist/server/entry.mjs"
    start_cmd = f"cd {REMOTE_PATH} && " + NVM_PREFIX + f"pm2 start {entry_file} --name '{APP_NAME}' -- --port {NODE_PORT}"
    
    success, output, error = run_cmd(ssh, start_cmd)
    time.sleep(3)
    
    run_cmd(ssh, NVM_PREFIX + "pm2 save")
    
    # PM2 durumu
    success, status, _ = run_cmd(ssh, NVM_PREFIX + "pm2 list")
    print(f"📊 PM2 Durumu:\n{status[:600]}")
    
    # HTTP test
    print("\n🌐 Health Check")
    print("-" * 40)
    success, response, _ = run_cmd(ssh, f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{NODE_PORT}/api/health")
    if response == "200":
        print(f"✅ HTTP 200 - API yanıt veriyor!")
    else:
        print(f"⚠️ HTTP {response} - Loglar:")
        _, logs, _ = run_cmd(ssh, NVM_PREFIX + f"pm2 logs {APP_NAME} --lines 10")
        print(logs)
    
    # İzinleri ayarla
    run_cmd(ssh, f"chmod -R 755 {REMOTE_PATH}")
    
    ssh.close()
    
    print("\n" + "=" * 60)
    print("🎉 DEPLOYMENT TAMAMLANDI!")
    print("=" * 60)
    print(f"""
🔗 Site: https://sanliurfa.com
📂 Dizin: {REMOTE_PATH}
🔧 PM2: source ~/.nvm/nvm.sh && pm2 list
📊 Logs: source ~/.nvm/nvm.sh && pm2 logs {APP_NAME}
🔄 Restart: source ~/.nvm/nvm.sh && pm2 restart {APP_NAME}
""")

if __name__ == "__main__":
    main()

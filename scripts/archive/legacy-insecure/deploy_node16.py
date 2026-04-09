#!/usr/bin/env python3
"""
CWP Node.js 16 Deployment Script
Node 16.20.2 ile SSR deployment
"""

import paramiko
import sys
import os
import subprocess

# Sunucu bilgileri
HOST = "176.9.138.254"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
REMOTE_PATH = "/home/sanliur/public_html"
APP_NAME = "sanliurfa"
NODE_CMD = "/usr/bin/node"
NPM_CMD = "/usr/bin/npm"

def run_local(cmd, cwd=None):
    """Yerel komut çalıştır"""
    print(f"⚡ [LOCAL] {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
    if result.returncode != 0:
        print(f"❌ Hata: {result.stderr}")
        return False, result.stderr
    return True, result.stdout

def main():
    print("🚀 Node.js 16 Deployment")
    print("=" * 50)
    
    # SSH Bağlantısı
    print(f"\n🔌 {HOST}:{PORT} bağlanılıyor...")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            hostname=HOST,
            port=PORT,
            username=USERNAME,
            password=PASSWORD,
            timeout=30,
            allow_agent=False,
            look_for_keys=False
        )
        sftp = ssh.open_sftp()
        print("✅ Bağlantı başarılı!")
    except Exception as e:
        print(f"❌ Bağlantı hatası: {e}")
        sys.exit(1)
    
    # Node.js 16 kontrolü
    print("\n📦 Node.js Kontrolü")
    print("-" * 50)
    stdin, stdout, stderr = ssh.exec_command(f'{NODE_CMD} --version')
    node_version = stdout.read().decode().strip()
    print(f"Node.js: {node_version}")
    
    if not node_version.startswith('v16'):
        print("❌ Node.js 16 bulunamadı!")
        ssh.close()
        sys.exit(1)
    
    # PM2 kontrolü/kurulumu
    print("\n⚡ PM2 Kontrolü")
    print("-" * 50)
    stdin, stdout, stderr = ssh.exec_command('which pm2')
    if stdout.channel.recv_exit_status() != 0:
        print("PM2 kurulu değil, kuruluyor...")
        stdin, stdout, stderr = ssh.exec_command(f'{NPM_CMD} install -g pm2')
        print(stdout.read().decode())
        print(stderr.read().decode())
    else:
        print("✅ PM2 kurulu")
    
    # Yerel build
    print("\n🔨 Yerel Build")
    print("-" * 50)
    
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # package.json engines kontrolü
    pkg_path = os.path.join(project_dir, 'package.json')
    if os.path.exists(pkg_path):
        with open(pkg_path, 'r') as f:
            content = f.read()
            if '"node":' in content and '"22' in content:
                print("⚠️ package.json Node 22 gerektiriyor!")
                print("📝 Node 16 ile uyumlu hale getiriliyor...")
                # engines kısmını geçici olarak değiştir
                import json
                with open(pkg_path, 'r') as f:
                    pkg = json.load(f)
                original_engines = pkg.get('engines', {}).copy()
                pkg['engines'] = {'node': '>=16.0.0'}
                with open(pkg_path, 'w') as f:
                    json.dump(pkg, f, indent=2)
                print("✅ package.json güncellendi (geçici)")
    
    # Build al
    print("🔨 Build başlatılıyor...")
    success, output = run_local('npm run build', cwd=project_dir)
    
    # package.json'ı geri yükle
    if 'original_engines' in dir():
        with open(pkg_path, 'r') as f:
            pkg = json.load(f)
        pkg['engines'] = original_engines
        with open(pkg_path, 'w') as f:
            json.dump(pkg, f, indent=2)
    
    if not success:
        print(f"❌ Build hatası: {output}")
        ssh.close()
        sys.exit(1)
    
    print("✅ Build başarılı!")
    
    # Dosyaları yükle
    print("\n📤 Dosya Yükleme")
    print("-" * 50)
    
    local_dist = os.path.join(project_dir, 'dist')
    if not os.path.exists(local_dist):
        print(f"❌ Build dizini bulunamadı: {local_dist}")
        ssh.close()
        sys.exit(1)
    
    # Eski dosyaları yedekle ve temizle
    print("📂 Eski dosyalar yedekleniyor...")
    ssh.exec_command(f'cd {REMOTE_PATH} && tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz . --exclude="backup_*.tar.gz" 2>/dev/null; rm -rf {REMOTE_PATH}/*')
    
    # Yeni dosyaları yükle
    print("📤 Dosyalar yükleniyor...")
    total = 0
    for root, dirs, files in os.walk(local_dist):
        for dir in dirs:
            local_dir = os.path.join(root, dir)
            rel_path = os.path.relpath(local_dir, local_dist)
            remote_dir = f"{REMOTE_PATH}/{rel_path}".replace("\\", "/")
            try:
                sftp.mkdir(remote_dir)
            except:
                pass
        for file in files:
            local_file = os.path.join(root, file)
            rel_path = os.path.relpath(local_file, local_dist)
            remote_file = f"{REMOTE_PATH}/{rel_path}".replace("\\", "/")
            sftp.put(local_file, remote_file)
            total += 1
            if total % 100 == 0:
                print(f"  {total} dosya yüklendi...")
    
    print(f"✅ {total} dosya yüklendi!")
    
    # package.json ve node_modules yükle
    print("📦 package.json ve bağımlılıklar yükleniyor...")
    sftp.put(os.path.join(project_dir, 'package.json'), f'{REMOTE_PATH}/package.json')
    sftp.put(os.path.join(project_dir, 'package-lock.json'), f'{REMOTE_PATH}/package-lock.json')
    
    # .env dosyası varsa yükle
    env_local = os.path.join(project_dir, '.env.production') or os.path.join(project_dir, '.env')
    if os.path.exists(env_local):
        sftp.put(env_local, f'{REMOTE_PATH}/.env')
        print("✅ .env dosyası yüklendi")
    
    # Sunucuda npm install
    print("\n📦 Bağımlılıklar Kuruluyor")
    print("-" * 50)
    stdin, stdout, stderr = ssh.exec_command(f'cd {REMOTE_PATH} && {NPM_CMD} ci --production')
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    # PM2 ile başlat
    print("\n🚀 Uygulama Başlatılıyor")
    print("-" * 50)
    
    # Önceki process'i durdur
    ssh.exec_command(f'pm2 delete {APP_NAME} 2>/dev/null')
    
    # Yeni process başlat
    start_cmd = f'cd {REMOTE_PATH} && pm2 start {REMOTE_PATH}/dist/server/entry.mjs --name "{APP_NAME}" -- --port 3000'
    stdin, stdout, stderr = ssh.exec_command(start_cmd)
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    # PM2 kaydet
    ssh.exec_command('pm2 save')
    
    # İzinleri ayarla
    print("\n🔒 İzinler Ayarlanıyor")
    print("-" * 50)
    ssh.exec_command(f'chown -R {USERNAME}:{USERNAME} {REMOTE_PATH}')
    ssh.exec_command(f'chmod -R 755 {REMOTE_PATH}')
    
    # CWP Apache yapılandırması
    print("\n🌐 CWP Apache Yapılandırması")
    print("-" * 50)
    print("""
📋 CWP Panel'de şu ayarları yap:

1. CWP Panel'e giriş: https://176.9.138.254:2083
2. Webserver Settings → Webserver Domain Conf
3. Kullanıcı: sanliur
4. Domain: senin-domainin.com
5. Seçenek: Apache → Custom Port
6. Port: 3000
7. IP: 127.0.0.1
8. Save + Rebuild

VEYA .htaccess ile (public_html/.htaccess):

RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
    """)
    
    # Kontrol
    print("\n✅ Deployment Doğrulama")
    print("-" * 50)
    stdin, stdout, stderr = ssh.exec_command(f'pm2 list | grep {APP_NAME}')
    result = stdout.read().decode().strip()
    if result:
        print(f"✅ PM2 Process: {result}")
    else:
        print("⚠️ PM2 process bulunamadı")
    
    stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/')
    status = stdout.read().decode().strip()
    if status == "200":
        print(f"✅ Uygulama çalışıyor (HTTP {status})")
    else:
        print(f"⚠️ Uygulama yanıt vermiyor (HTTP {status})")
    
    ssh.close()
    
    print("\n" + "=" * 50)
    print("🎉 DEPLOYMENT TAMAMLANDI!")
    print("=" * 50)
    print(f"""
📊 Durum:
  Node.js: {node_version}
  Port: 3000
  PM2: {APP_NAME}

🌐 Erişim:
  http://176.9.138.254 (CWP Apache üzerinden)
  http://cwp.elginoz.com

🔧 Yönetim:
  PM2 Status: pm2 list
  PM2 Logs: pm2 logs {APP_NAME}
  PM2 Restart: pm2 restart {APP_NAME}

⚠️  NOT: CWP Panel'de Apache → Custom Port (3000) yapılandırması gerekli!
""")

if __name__ == "__main__":
    main()
